/**
 * Runs make targets in a worktree and captures the outcome.
 *
 * @module
 */

/** What a spawned process produced: exit code and interleaved stdout/stderr. */
export interface SpawnResult {
  exitCode: number;
  output: string;
}

/** Spawns argv in cwd. Replaceable so tests never start real processes. */
export type Spawn = (
  argv: string[],
  opts: { cwd: string; signal?: AbortSignal },
) => Promise<SpawnResult>;

async function denoSpawn(
  argv: string[],
  opts: { cwd: string; signal?: AbortSignal },
): Promise<SpawnResult> {
  const child = new Deno.Command(argv[0], {
    args: argv.slice(1),
    cwd: opts.cwd,
    signal: opts.signal,
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const parts: string[] = [];
  const readers: ReadableStreamDefaultReader<Uint8Array>[] = [];
  const collect = async (stream: ReadableStream<Uint8Array>) => {
    const decoder = new TextDecoder();
    const reader = stream.getReader();
    readers.push(reader);
    try {
      for (let r = await reader.read(); !r.done; r = await reader.read()) {
        parts.push(decoder.decode(r.value, { stream: true }));
      }
    } catch {
      // cancelled after the grace period below
    }
    parts.push(decoder.decode());
  };
  const drained = Promise.all([collect(child.stdout), collect(child.stderr)]);
  const status = await child.status;
  // make can exit (or be killed) while a grandchild such as `docker compose`
  // still holds the pipes open; stop waiting for it after a grace period.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const grace = new Promise((resolve) => {
    timer = setTimeout(resolve, STREAM_GRACE_MS);
  });
  await Promise.race([drained, grace]);
  clearTimeout(timer);
  await Promise.all(readers.map((r) => r.cancel().catch(() => {})));
  await drained;
  return { exitCode: status.code, output: parts.join("") };
}

/** How long to keep reading output after make has exited. */
const STREAM_GRACE_MS = 5000;

let spawn: Spawn = denoSpawn;

/** Replace the process spawner (tests only). */
export function setSpawn(fn: Spawn): void {
  spawn = fn;
}

/** Restore the real process spawner. */
export function resetSpawn(): void {
  spawn = denoSpawn;
}

/** Outcome of one make target. */
export interface TargetResult {
  target: string;
  profile: string | null;
  worktree: string;
  headSha: string;
  exitCode: number;
  succeeded: boolean;
  timedOut: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  logTail: string[];
  logTruncated: boolean;
  output: string;
}

/** Lines kept in the structured result; the full output goes to the log file. */
export const LOG_TAIL_LINES = 40;

/**
 * Run `make <target> [PROFILE=<profile>]` in the worktree, pinned to the
 * commit it ran against. Never throws on a failing target; the caller decides.
 */
export async function runTarget(opts: {
  worktree: string;
  target: string;
  profile?: string;
  timeoutSeconds: number;
  signal?: AbortSignal;
}): Promise<TargetResult> {
  const head = await spawn(["git", "rev-parse", "HEAD"], {
    cwd: opts.worktree,
    signal: opts.signal,
  });
  if (head.exitCode !== 0) {
    throw new Error(
      `${opts.worktree} is not a git worktree: ${head.output.trim()}`,
    );
  }

  const argv = ["make", opts.target];
  const profile = opts.profile && opts.profile !== "default"
    ? opts.profile
    : null;
  if (profile) argv.push(`PROFILE=${profile}`);

  const timeout = AbortSignal.timeout(opts.timeoutSeconds * 1000);
  const signal = opts.signal
    ? AbortSignal.any([opts.signal, timeout])
    : timeout;

  const started = new Date();
  let result: SpawnResult;
  try {
    result = await spawn(argv, { cwd: opts.worktree, signal });
  } catch (err) {
    if (!timeout.aborted) throw err;
    result = { exitCode: -1, output: `killed after ${opts.timeoutSeconds}s` };
  }
  const finished = new Date();
  const timedOut = timeout.aborted;
  const lines = result.output.trimEnd().split("\n");

  return {
    target: opts.target,
    profile,
    worktree: opts.worktree,
    headSha: head.output.trim(),
    exitCode: result.exitCode,
    succeeded: result.exitCode === 0 && !timedOut,
    timedOut,
    startedAt: started.toISOString(),
    finishedAt: finished.toISOString(),
    durationMs: finished.getTime() - started.getTime(),
    logTail: lines.slice(-LOG_TAIL_LINES),
    logTruncated: lines.length > LOG_TAIL_LINES,
    output: result.output,
  };
}
