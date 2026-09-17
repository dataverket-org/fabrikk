/**
 * External repositories cloned, with full history, as read-only reference code
 * and documentation for agents and humans. The list is the model definition (tracked in git);
 * the clones live under an ignored directory and are never built, imported,
 * or copied from.
 *
 * @module
 */
import { z } from "npm:zod@4";

const RepoSchema = z.object({
  name: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/).describe(
    "Directory name under dir",
  ),
  url: z.string().min(1).describe(
    "Clone URL; prefer a Dataverket mirror when one exists",
  ),
  ref: z.string().min(1).describe("Branch, tag, or commit to check out"),
  purpose: z.string().min(1).describe(
    "Why agents need this reference; a reference that cannot say is removed",
  ),
});
type Repo = z.infer<typeof RepoSchema>;

const GlobalArgsSchema = z.object({
  dir: z.string().regex(/^[_.][A-Za-z0-9._-]*$/).default("_reference").describe(
    "Directory under the repository root. Must start with _ or . so go ./... skips it; must be gitignored",
  ),
  // Refinements stay on fields: swamp calls .partial() on globalArguments.
  repos: z.array(RepoSchema).min(1).refine(
    (repos) => new Set(repos.map((r) => r.name)).size === repos.length,
    { message: "repo names must be unique" },
  ),
});
type GlobalArgs = z.infer<typeof GlobalArgsSchema>;

const SyncArgsSchema = z.object({
  names: z.array(z.string()).optional().describe(
    "Sync only these repos (default: all)",
  ),
});

const RepoStateSchema = z.object({
  name: z.string(),
  url: z.string(),
  ref: z.string(),
  purpose: z.string(),
  commit: z.string(),
  path: z.string(),
  syncedAt: z.iso.datetime(),
});
type RepoState = z.infer<typeof RepoStateSchema>;

/** Runs git in cwd and returns trimmed stdout; throws with stderr on failure. */
export type Git = (cwd: string, args: string[]) => Promise<string>;

function denoGit(signal?: AbortSignal): Git {
  return async (cwd, args) => {
    const out = await new Deno.Command("git", {
      args,
      cwd,
      signal,
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
      // A reference sync must never stop to ask for credentials.
      env: { GIT_TERMINAL_PROMPT: "0" },
    }).output();
    if (out.code !== 0) {
      throw new Error(
        `git ${args.join(" ")} failed (exit ${out.code}): ${
          new TextDecoder().decode(out.stderr).trim()
        }`,
      );
    }
    return new TextDecoder().decode(out.stdout).trim();
  };
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return false;
    throw err;
  }
}

/**
 * Resolve a branch, tag, or commit to a commit sha in a full clone. Tags win
 * over a branch of the same name because they do not move.
 */
export async function resolveRef(
  git: Git,
  path: string,
  ref: string,
): Promise<string> {
  for (
    const candidate of [`refs/tags/${ref}`, `refs/remotes/origin/${ref}`, ref]
  ) {
    try {
      return await git(path, [
        "rev-parse",
        "--verify",
        "--quiet",
        `${candidate}^{commit}`,
      ]);
    } catch {
      // try the next form
    }
  }
  throw new Error(`${ref} is not a branch, tag, or commit in origin`);
}

/**
 * Bring one clone to `ref` with full history, so any version can be looked up
 * (`git show <tag>:<path>`, `git log`, `git grep <pattern> <tag>`): create it if
 * missing, follow a changed URL, fetch every branch and tag, and check `ref`
 * out detached, discarding local edits.
 */
export async function syncRepo(
  git: Git,
  root: string,
  repo: Repo,
  now: () => Date = () => new Date(),
): Promise<RepoState> {
  const path = `${root}/${repo.name}`;
  if (!await exists(`${path}/.git`)) {
    await Deno.mkdir(path, { recursive: true });
    await git(path, ["init", "--quiet"]);
    await git(path, ["remote", "add", "origin", repo.url]);
  } else if (await git(path, ["remote", "get-url", "origin"]) !== repo.url) {
    await git(path, ["remote", "set-url", "origin", repo.url]);
  }
  await git(path, [
    "fetch",
    "--quiet",
    "--tags",
    "--force",
    "--prune",
    "--prune-tags",
    "origin",
  ]);
  const commit = await resolveRef(git, path, repo.ref);
  await git(path, ["checkout", "--quiet", "--force", "--detach", commit]);
  return { ...repo, commit, path, syncedAt: now().toISOString() };
}

/** Directories under root that no longer appear in the list. */
export async function unlisted(root: string, repos: Repo[]): Promise<string[]> {
  if (!await exists(root)) return [];
  const names = new Set(repos.map((r) => r.name));
  const found: string[] = [];
  for await (const entry of Deno.readDir(root)) {
    if (entry.isDirectory && !names.has(entry.name)) found.push(entry.name);
  }
  return found.sort();
}

let git: Git | undefined;

/** Replace the git runner (tests only); pass undefined to restore. */
export function setGit(fn: Git | undefined): void {
  git = fn;
}

/** Model definition for reference repositories. */
export const model = {
  type: "@dataverket/reference-repos",
  version: "2026.09.17.1",
  globalArguments: GlobalArgsSchema,
  resources: {
    repo: {
      description: "A reference clone: where it is and the commit it is at",
      schema: RepoStateSchema,
      lifetime: "infinite" as const,
      garbageCollection: 20,
    },
  },
  methods: {
    sync: {
      description:
        "Clone or refresh every listed repo (or those in names) at its ref; one record per repo",
      arguments: SyncArgsSchema,
      execute: async (
        args: z.infer<typeof SyncArgsSchema>,
        context: {
          globalArgs: GlobalArgs;
          repoDir: string;
          signal: AbortSignal;
          logger: {
            info(msg: string, props?: Record<string, unknown>): void;
            warning(msg: string, props?: Record<string, unknown>): void;
          };
          writeResource: (
            specName: string,
            name: string,
            data: Record<string, unknown>,
          ) => Promise<{ name: string }>;
        },
      ) => {
        const { dir, repos } = context.globalArgs;
        const unknown = (args.names ?? []).filter((n) =>
          !repos.some((r) => r.name === n)
        );
        if (unknown.length > 0) {
          throw new Error(`not in the reference list: ${unknown.join(", ")}`);
        }
        const selected = args.names
          ? repos.filter((r) => args.names!.includes(r.name))
          : repos;
        const root = `${context.repoDir}/${dir}`;
        const run = git ?? denoGit(context.signal);

        const handles: Array<{ name: string }> = [];
        const failures: string[] = [];
        for (const repo of selected) {
          context.logger.info("Syncing {name} at {ref} from {url}", {
            ...repo,
          });
          try {
            const state = await syncRepo(run, root, repo);
            handles.push(await context.writeResource("repo", repo.name, state));
            context.logger.info("{name} at {commit}", { ...state });
          } catch (err) {
            failures.push(
              `${repo.name}: ${err instanceof Error ? err.message : err}`,
            );
          }
        }
        const stale = await unlisted(root, repos);
        if (stale.length > 0) {
          context.logger.warning(
            "Not in the reference list, left in place: {stale}",
            { stale: stale.join(", ") },
          );
        }
        if (failures.length > 0) {
          throw new Error(
            `${failures.length} of ${selected.length} reference repos failed to sync:\n- ${
              failures.join("\n- ")
            }`,
          );
        }
        return { dataHandles: handles };
      },
    },
  },
};
