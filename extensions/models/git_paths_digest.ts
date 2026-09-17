/**
 * Adds `paths_digest` to `@swamp/git`: a sha256 content digest of paths at a
 * commit, recomputable in CI with plain git and coreutils (see
 * PATHS_DIGEST_RECIPE).
 *
 * @module
 */
import { z } from "npm:zod@4";

/**
 * Shell recipe (bash, git >= 2.36, coreutils) that yields the same `sha256`
 * for $SHA and the pathspecs in $PATHS. Paths containing quotes, backslashes,
 * or newlines are quoted by ls-tree and not supported by the recipe.
 */
export const PATHS_DIGEST_RECIPE =
  `git -c core.quotepath=off ls-tree -r --full-tree \\
  --format='%(objecttype) %(objectname) %(path)' "$SHA" -- $PATHS |
while read -r type oid path; do
  [ "$type" = blob ] || continue
  printf '%s  %s\\n' "$(git cat-file blob "$oid" | sha256sum | cut -d' ' -f1)" "$path"
done | LC_ALL=C sort | sha256sum | cut -d' ' -f1`;

const PathsDigestArgsSchema = z.object({
  ref: z.string().min(1).default("HEAD").describe(
    "Commit-ish to read paths at",
  ),
  paths: z.array(z.string().min(1)).min(1).describe(
    "Pathspecs relative to the repository root (directories end with /)",
  ),
});

const PathsDigestSchema = z.object({
  ref: z.string(),
  commitSha: z.string(),
  paths: z.array(z.string()),
  unmatched: z.array(z.string()),
  algorithm: z.literal("sha256"),
  fileCount: z.number().int().nonnegative(),
  files: z.array(z.object({ path: z.string(), sha256: z.string() })),
  sha256: z.string(),
});

/** One blob under the requested paths. */
export interface TreeBlob {
  oid: string;
  path: string;
}

/** Runs git in the repository and returns raw stdout bytes. */
export type Git = (args: string[]) => Promise<Uint8Array>;

function denoGit(repoPath: string, signal?: AbortSignal): Git {
  return async (args) => {
    const out = await new Deno.Command("git", {
      args,
      cwd: repoPath,
      signal,
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    }).output();
    if (out.code !== 0) {
      throw new Error(
        `git ${args[0]} failed (exit ${out.code}) in ${repoPath}: ${
          new TextDecoder().decode(out.stderr).trim()
        }`,
      );
    }
    return out.stdout;
  };
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(
    new Uint8Array(digest),
    (b) => b.toString(16).padStart(2, "0"),
  )
    .join("");
}

/** Parse `git ls-tree -r -z` output, keeping blobs (files and symlinks). */
export function parseLsTree(raw: Uint8Array): TreeBlob[] {
  return new TextDecoder().decode(raw).split("\0").filter((e) => e.length > 0)
    .map((entry) => {
      const tab = entry.indexOf("\t");
      const [, type, oid] = entry.slice(0, tab).split(" ");
      return { type, oid, path: entry.slice(tab + 1) };
    })
    .filter((e) => e.type === "blob")
    .map(({ oid, path }) => ({ oid, path }));
}

/** Byte-order comparison of UTF-8 strings, matching `LC_ALL=C sort`. */
function compareBytes(a: string, b: string): number {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  for (let i = 0; i < Math.min(ea.length, eb.length); i++) {
    if (ea[i] !== eb[i]) return ea[i] - eb[i];
  }
  return ea.length - eb.length;
}

/** Pathspecs that match no blob, so an absent protected path is visible. */
export function unmatchedPaths(paths: string[], blobs: TreeBlob[]): string[] {
  return paths.filter((p) => {
    const dir = p.endsWith("/") ? p : `${p}/`;
    return !blobs.some((b) => b.path === p || b.path.startsWith(dir));
  });
}

/**
 * Digest = sha256 over the manifest of `<sha256>  <path>\n` lines (the
 * sha256sum format), sorted bytewise.
 */
export async function pathsDigest(
  git: Git,
  ref: string,
  paths: string[],
): Promise<z.infer<typeof PathsDigestSchema>> {
  const commitSha = new TextDecoder().decode(
    await git(["rev-parse", "--verify", `${ref}^{commit}`]),
  ).trim();
  const blobs = parseLsTree(
    await git([
      "ls-tree",
      "-r",
      "-z",
      "--full-tree",
      commitSha,
      "--",
      ...paths,
    ]),
  );
  const files: Array<{ path: string; sha256: string }> = [];
  for (const blob of blobs) {
    const content = await git(["cat-file", "blob", blob.oid]);
    files.push({ path: blob.path, sha256: await sha256Hex(content) });
  }
  const manifest = files.map((f) => `${f.sha256}  ${f.path}\n`).sort(
    compareBytes,
  )
    .join("");
  return {
    ref,
    commitSha,
    paths,
    unmatched: unmatchedPaths(paths, blobs),
    algorithm: "sha256",
    fileCount: files.length,
    files: files.sort((a, b) => compareBytes(a.path, b.path)),
    sha256: await sha256Hex(new TextEncoder().encode(manifest)),
  };
}

/** Extension adding a content digest method to the @swamp/git model type. */
export const extension = {
  type: "@swamp/git",
  resources: {
    pathsDigest: {
      description: "sha256 content digest of paths at a commit",
      schema: PathsDigestSchema,
      lifetime: "infinite" as const,
      garbageCollection: 20,
    },
  },
  methods: [{
    paths_digest: {
      description:
        "sha256 content digest of the given paths at a commit (read-only), recomputable with git and sha256sum",
      arguments: PathsDigestArgsSchema,
      execute: async (
        args: z.infer<typeof PathsDigestArgsSchema>,
        context: {
          globalArgs: { repoPath: string };
          signal: AbortSignal;
          logger: { info(msg: string, props?: Record<string, unknown>): void };
          writeResource: (
            specName: string,
            name: string,
            data: Record<string, unknown>,
          ) => Promise<{ name: string }>;
        },
      ) => {
        context.logger.info("Digesting {paths} at {ref}", {
          paths: args.paths.join(" "),
          ref: args.ref,
        });
        const result = await pathsDigest(
          denoGit(context.globalArgs.repoPath, context.signal),
          args.ref,
          args.paths,
        );
        const handle = await context.writeResource(
          "pathsDigest",
          "paths-digest",
          result,
        );
        context.logger.info(
          "{fileCount} files at {commitSha}: sha256 {sha256}",
          { ...result },
        );
        return { dataHandles: [handle] };
      },
    },
  }],
};
