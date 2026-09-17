/**
 * Mirrors an upstream OCI image into the Dataverket registry, by digest, so
 * that dev fragments and manifests never reference an upstream location
 * (source-standards and dev-environment skills). Wraps the pinned `crane`
 * from `make tools`; the registry credential comes from the vault and is
 * passed on stdin, never on the command line. Idempotent: an image already
 * present at the same digest is reported unchanged.
 *
 * @module
 */
import { z } from "npm:zod@4";

const Digest = /^sha256:[0-9a-f]{64}$/;

const GlobalArgsSchema = z.object({
  registry: z.string().min(1).describe("Registry host, e.g. registry.dataverket.org"),
  namespace: z.string().min(1).default("mirror").describe(
    "Repository prefix mirrored images land under",
  ),
  username: z.string().min(1).describe("Push credential; supply via vault"),
  password: z.string().min(1).describe("Push credential; supply via vault"),
  tools: z.string().default("_bin").describe(
    "Directory with the pinned crane (make tools), relative to the repository root",
  ),
});
type GlobalArgs = z.infer<typeof GlobalArgsSchema>;

const CopyArgsSchema = z.object({
  source: z.string().regex(/^[^@\s]+@sha256:[0-9a-f]{64}$/).describe(
    "Upstream reference pinned by digest, e.g. docker.io/library/nats@sha256:...",
  ),
  name: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/).describe(
    "Repository name under the namespace, e.g. nats",
  ),
  tag: z.string().regex(/^[A-Za-z0-9_][A-Za-z0-9._-]*$/).describe(
    "Tag to give the mirrored image, for humans; consumers pin the digest",
  ),
});
type CopyArgs = z.infer<typeof CopyArgsSchema>;

const MirrorSchema = z.object({
  source: z.string(),
  target: z.string(),
  digest: z.string().regex(Digest),
  action: z.enum(["copied", "unchanged"]),
  timestamp: z.iso.datetime(),
});

/** Result of one tool invocation. */
export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Options a tool invocation may carry: stdin for secrets, env for isolation. */
export interface ExecOptions {
  stdin?: string;
  env?: Record<string, string>;
  signal?: AbortSignal;
}

/** Runs a tool; replaceable so tests never touch a registry. */
export type Exec = (argv: string[], opts?: ExecOptions) => Promise<ExecResult>;

const denoExec: Exec = async (argv, opts) => {
  const cmd = new Deno.Command(argv[0], {
    args: argv.slice(1),
    env: opts?.env,
    signal: opts?.signal,
    stdin: opts?.stdin === undefined ? "null" : "piped",
    stdout: "piped",
    stderr: "piped",
  });
  const child = cmd.spawn();
  if (opts?.stdin !== undefined) {
    const w = child.stdin.getWriter();
    await w.write(new TextEncoder().encode(opts.stdin));
    await w.close();
  }
  const out = await child.output();
  return {
    code: out.code,
    stdout: new TextDecoder().decode(out.stdout).trim(),
    stderr: new TextDecoder().decode(out.stderr).trim(),
  };
};

let exec: Exec = denoExec;

/** Replace the tool runner (tests only); omit to restore. */
export function setRuntime(e?: Exec): void {
  exec = e ?? denoExec;
}

async function ok(argv: string[], what: string, opts?: ExecOptions): Promise<string> {
  const r = await exec(argv, opts);
  if (r.code !== 0) throw new Error(`${what} failed (exit ${r.code}): ${r.stderr}`);
  return r.stdout;
}

/** The digest an image reference pins. */
export function sourceDigest(source: string): string {
  return source.slice(source.indexOf("@") + 1);
}

/**
 * Copy `source` to `<registry>/<namespace>/<name>:<tag>` unless the target
 * already carries the source digest. The credential travels on crane's stdin
 * into a throwaway DOCKER_CONFIG that is removed afterwards.
 */
export async function mirror(
  crane: string,
  g: GlobalArgs,
  a: CopyArgs,
  dockerConfigDir: string,
  signal?: AbortSignal,
): Promise<z.infer<typeof MirrorSchema>> {
  const want = sourceDigest(a.source);
  const repo = `${g.registry}/${g.namespace}/${a.name}`;
  const target = `${repo}:${a.tag}`;
  const env = { DOCKER_CONFIG: dockerConfigDir, HOME: dockerConfigDir };
  const existing = await exec([crane, "digest", target], { env, signal });
  if (existing.code === 0 && existing.stdout === want) {
    return { source: a.source, target: `${repo}@${want}`, digest: want, action: "unchanged", timestamp: new Date().toISOString() };
  }
  await ok(
    [crane, "auth", "login", g.registry, "--username", g.username, "--password-stdin"],
    `crane auth login ${g.registry}`,
    { stdin: g.password, env, signal },
  );
  await ok([crane, "copy", a.source, target], `crane copy ${a.source}`, { env, signal });
  const got = await ok([crane, "digest", target], `crane digest ${target}`, { env, signal });
  if (got !== want) {
    throw new Error(`${target} has digest ${got} after copy, expected ${want}`);
  }
  return { source: a.source, target: `${repo}@${want}`, digest: want, action: "copied", timestamp: new Date().toISOString() };
}

/** Model definition for mirroring upstream images into the Dataverket registry. */
export const model = {
  type: "@dataverket/registry-mirror",
  version: "2026.09.17.1",
  globalArguments: GlobalArgsSchema,
  resources: {
    mirror: {
      description: "An upstream image mirrored into the registry, by digest",
      schema: MirrorSchema,
      lifetime: "infinite" as const,
      garbageCollection: 50,
    },
  },
  methods: {
    copy: {
      description:
        "Copy an upstream image pinned by digest into <registry>/<namespace>/<name>:<tag>; unchanged if the digest is already there",
      arguments: CopyArgsSchema,
      execute: async (
        args: CopyArgs,
        context: {
          globalArgs: GlobalArgs;
          repoDir: string;
          signal: AbortSignal;
          logger: { info(msg: string, props?: Record<string, unknown>): void };
          writeResource: (specName: string, name: string, data: Record<string, unknown>) => Promise<{ name: string }>;
        },
      ) => {
        const tools = context.globalArgs.tools;
        const crane = `${tools.startsWith("/") ? tools : `${context.repoDir}/${tools}`}/crane`;
        const dir = await Deno.makeTempDir({ prefix: "registry-mirror-" });
        let info;
        try {
          context.logger.info("Mirroring {source} into {registry}/{namespace}/{name}", {
            source: args.source,
            registry: context.globalArgs.registry,
            namespace: context.globalArgs.namespace,
            name: args.name,
          });
          info = await mirror(crane, context.globalArgs, args, dir, context.signal);
        } finally {
          await Deno.remove(dir, { recursive: true });
        }
        context.logger.info("{target}: {action}", { target: info.target, action: info.action });
        const handle = await context.writeResource("mirror", `${args.name}:${args.tag}`, info);
        return { dataHandles: [handle] };
      },
    },
  },
};
