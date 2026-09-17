/**
 * Verifies a release candidate that CI built on shared infrastructure: the
 * signed Flux config artifact for a product, environment, and merge commit.
 * Read-only; the workbench never builds or pushes what ships.
 *
 * @module
 */
import { z } from "npm:zod@4";

const FLUX_CONFIG = "application/vnd.cncf.flux.config.v1+json";
const FLUX_CONTENT = "application/vnd.cncf.flux.content.v1.tar+gzip";
const Sha = /^[0-9a-f]{40}$/;
const Digest = /^sha256:[0-9a-f]{64}$/;

const GlobalArgsSchema = z.object({
  tools: z.string().default("_tools/bin").describe(
    "Directory with pinned crane and cosign (make tools), relative to the repository root",
  ),
});
type GlobalArgs = z.infer<typeof GlobalArgsSchema>;

const VerifyArgsSchema = z.object({
  registry: z.string().min(1),
  product: z.string().regex(/^[a-z][a-z0-9-]*$/),
  environment: z.string().regex(/^[a-z][a-z0-9-]*$/),
  commit: z.string().regex(Sha).describe(
    "Merge commit the release must be built from",
  ),
  publicKey: z.string().min(1).describe(
    "cosign public key, relative to the repository root or absolute",
  ),
  timeoutSeconds: z.number().int().positive().default(3600).describe(
    "How long to wait for CI to publish the artifact",
  ),
  intervalSeconds: z.number().int().positive().default(30),
});
type VerifyArgs = z.infer<typeof VerifyArgsSchema>;

const ReleaseSchema = z.object({
  artifact: z.string(),
  digest: z.string().regex(Digest),
  appCommit: z.string().regex(Sha),
  envConfigVersion: z.string().regex(Sha),
  product: z.string(),
  environment: z.string(),
  images: z.record(z.string(), z.string().regex(Digest)),
  verifiedAt: z.iso.datetime(),
});
type Release = z.infer<typeof ReleaseSchema>;

const ReleaseJsonSchema = z.object({
  product: z.string(),
  environment: z.string(),
  app_commit: z.string(),
  env_config_version: z.string(),
  images: z.record(z.string(), z.string()),
});

/** Result of one tool invocation. */
export interface ExecResult {
  code: number;
  stdout: Uint8Array;
  stderr: string;
}

/** Runs a tool; replaceable so tests never touch a registry. */
export type Exec = (
  argv: string[],
  signal?: AbortSignal,
) => Promise<ExecResult>;

const denoExec: Exec = async (argv, signal) => {
  const out = await new Deno.Command(argv[0], {
    args: argv.slice(1),
    signal,
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  }).output();
  return {
    code: out.code,
    stdout: out.stdout,
    stderr: new TextDecoder().decode(out.stderr).trim(),
  };
};

let exec: Exec = denoExec;
let sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Replace the tool runner and sleep (tests only); omit to restore. */
export function setRuntime(
  e?: Exec,
  s?: (ms: number) => Promise<unknown>,
): void {
  exec = e ?? denoExec;
  sleep = s ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
}

const text = (b: Uint8Array) => new TextDecoder().decode(b).trim();

async function ok(
  argv: string[],
  what: string,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const r = await exec(argv, signal);
  if (r.code !== 0) {
    throw new Error(`${what} failed (exit ${r.code}): ${r.stderr}`);
  }
  return r.stdout;
}

/** Wait for CI to publish `<repository>:<commit>` and return its digest. */
export async function waitForArtifact(
  crane: string,
  repository: string,
  commit: string,
  timeoutSeconds: number,
  intervalSeconds: number,
  signal?: AbortSignal,
): Promise<string> {
  const attempts = Math.floor(timeoutSeconds / intervalSeconds) + 1;
  let last = "";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const r = await exec([crane, "digest", `${repository}:${commit}`], signal);
    if (r.code === 0) return text(r.stdout);
    last = r.stderr;
    if (attempt < attempts) await sleep(intervalSeconds * 1000);
  }
  throw new Error(
    `no release artifact ${repository}:${commit} after ${timeoutSeconds}s; check the CI release run for ${commit}. Last error: ${last}`,
  );
}

/** Every `image:` reference in rendered manifests. */
export function imageRefs(manifests: string): string[] {
  return [...manifests.matchAll(/^\s*-?\s*image:\s*["']?([^\s"']+)/gm)].map((
    m,
  ) => m[1]);
}

/** Map `registry/path/name[:tag]@sha256:...` to `{name: digest}`; unpinned refs are returned separately. */
export function pinnedImages(
  refs: string[],
): { images: Record<string, string>; unpinned: string[] } {
  const images: Record<string, string> = {};
  const unpinned: string[] = [];
  for (const ref of refs) {
    const m = ref.match(
      /^(?:.*\/)?([^/@:]+)(?::[^@]*)?@(sha256:[0-9a-f]{64})$/,
    );
    if (m) images[m[1]] = m[2];
    else unpinned.push(ref);
  }
  return { images, unpinned };
}

/** Everything that makes the unpacked artifact not the release of `args`. */
export function violations(
  args: VerifyArgs,
  manifest: {
    config?: { mediaType?: string };
    layers?: Array<{ mediaType?: string }>;
    annotations?: Record<string, string>;
  },
  release: unknown,
  manifests: string,
): string[] {
  const problems: string[] = [];
  if (manifest.config?.mediaType !== FLUX_CONFIG) {
    problems.push(
      `not a Flux config artifact: config media type ${manifest.config?.mediaType}`,
    );
  }
  if (
    manifest.layers?.length !== 1 ||
    manifest.layers[0].mediaType !== FLUX_CONTENT
  ) {
    problems.push("expected exactly one Flux content layer");
  }
  const revision =
    manifest.annotations?.["org.opencontainers.image.revision"] ?? "";
  if (!revision.endsWith(`@sha1:${args.commit}`)) {
    problems.push(
      `revision annotation is "${revision}", not built from ${args.commit}`,
    );
  }

  if (release === undefined) {
    problems.push("release.json is missing or not valid JSON");
    return problems;
  }
  const parsed = ReleaseJsonSchema.safeParse(release);
  if (!parsed.success) {
    problems.push(
      `release.json is malformed: ${
        parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join(
          "; ",
        )
      }`,
    );
    return problems;
  }
  const r = parsed.data;
  if (r.product !== args.product) {
    problems.push(`release.json product is ${r.product}`);
  }
  if (r.environment !== args.environment) {
    problems.push(`release.json environment is ${r.environment}`);
  }
  if (r.app_commit !== args.commit) {
    problems.push(
      `release.json app_commit is ${r.app_commit}, not ${args.commit}`,
    );
  }
  if (!Sha.test(r.env_config_version)) {
    problems.push(
      `release.json env_config_version "${r.env_config_version}" is not a miljo commit`,
    );
  }

  const { images, unpinned } = pinnedImages(imageRefs(manifests));
  for (const ref of unpinned) {
    problems.push(`manifests.yaml image not pinned by digest: ${ref}`);
  }
  if (Object.keys(images).length === 0 && unpinned.length === 0) {
    problems.push("manifests.yaml references no images");
  }
  const names = new Set([...Object.keys(images), ...Object.keys(r.images)]);
  for (const name of [...names].sort()) {
    if (images[name] !== r.images[name]) {
      problems.push(
        `image ${name}: manifests.yaml has ${images[name]}, release.json has ${
          r.images[name]
        }`,
      );
    }
  }
  return problems;
}

async function readTar(
  tarGz: Uint8Array,
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  const dir = await Deno.makeTempDir({ prefix: "release-artifact-" });
  try {
    await Deno.writeFile(`${dir}/content.tar.gz`, tarGz);
    await ok(
      ["tar", "-xzf", `${dir}/content.tar.gz`, "-C", dir],
      "unpacking the artifact",
      signal,
    );
    const read = async (name: string) => {
      try {
        return await Deno.readTextFile(`${dir}/${name}`);
      } catch {
        return "";
      }
    };
    return {
      "release.json": await read("release.json"),
      "manifests.yaml": await read("manifests.yaml"),
    };
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

/** Model definition for verifying release candidates. */
export const model = {
  type: "@dataverket/release-artifact",
  version: "2026.09.17.1",
  globalArguments: GlobalArgsSchema,
  resources: {
    release: {
      description:
        "A verified release candidate: the signed config artifact and what it pins",
      schema: ReleaseSchema,
      lifetime: "infinite" as const,
      garbageCollection: 20,
    },
  },
  methods: {
    verify: {
      description:
        "Wait for CI's config artifact for commit, then verify signature, provenance, release.json, digest-pinned images, and the candidate tag",
      arguments: VerifyArgsSchema,
      execute: async (
        args: VerifyArgs,
        context: {
          globalArgs: GlobalArgs;
          repoDir: string;
          signal: AbortSignal;
          logger: { info(msg: string, props?: Record<string, unknown>): void };
          writeResource: (
            specName: string,
            name: string,
            data: Record<string, unknown>,
          ) => Promise<{ name: string }>;
        },
      ) => {
        const abs = (
          p: string,
        ) => (p.startsWith("/") ? p : `${context.repoDir}/${p}`);
        const crane = `${abs(context.globalArgs.tools)}/crane`;
        const cosign = `${abs(context.globalArgs.tools)}/cosign`;
        const repository =
          `${args.registry}/${args.product}/config-${args.environment}`;
        const signal = context.signal;

        context.logger.info("Waiting for {repository}:{commit}", {
          repository,
          commit: args.commit,
        });
        const digest = await waitForArtifact(
          crane,
          repository,
          args.commit,
          args.timeoutSeconds,
          args.intervalSeconds,
          signal,
        );
        const artifact = `${repository}@${digest}`;
        context.logger.info("Verifying {artifact}", { artifact });

        const problems: string[] = [];
        const signature = await exec(
          [
            cosign,
            "verify",
            "--key",
            abs(args.publicKey),
            "--insecure-ignore-tlog=true",
            artifact,
          ],
          signal,
        );
        if (signature.code !== 0) {
          problems.push(
            `signature does not verify with ${args.publicKey}: ${signature.stderr}`,
          );
        }

        const manifest = JSON.parse(
          text(
            await ok(
              [crane, "manifest", artifact],
              "fetching the manifest",
              signal,
            ),
          ),
        );
        const layer = manifest.layers?.[0]?.digest;
        const files = layer
          ? await readTar(
            await ok(
              [crane, "blob", `${repository}@${layer}`],
              "fetching the content layer",
              signal,
            ),
            signal,
          )
          : { "release.json": "", "manifests.yaml": "" };
        let release: unknown = undefined;
        try {
          release = JSON.parse(files["release.json"]);
        } catch {
          // reported as malformed below
        }
        problems.push(
          ...violations(args, manifest, release, files["manifests.yaml"]),
        );

        const candidate = await exec([
          crane,
          "digest",
          `${repository}:candidate`,
        ], signal);
        if (candidate.code !== 0 || text(candidate.stdout) !== digest) {
          problems.push(
            `${repository}:candidate is ${
              candidate.code === 0 ? text(candidate.stdout) : "missing"
            }, not ${digest}`,
          );
        }

        if (problems.length > 0) {
          throw new Error(
            `${artifact} is not a verified release of ${args.commit}:\n- ${
              problems.join("\n- ")
            }`,
          );
        }
        const r = release as z.infer<typeof ReleaseJsonSchema>;
        const verified: Release = {
          artifact: repository,
          digest,
          appCommit: r.app_commit,
          envConfigVersion: r.env_config_version,
          product: r.product,
          environment: r.environment,
          images: r.images,
          verifiedAt: new Date().toISOString(),
        };
        const handle = await context.writeResource(
          "release",
          `${args.product}-${args.environment}`,
          verified,
        );
        context.logger.info("Verified {artifact}", { artifact });
        return { dataHandles: [handle] };
      },
    },
  },
};
