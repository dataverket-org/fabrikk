/**
 * Adds `commit_messages` to `@swamp/git`: the commits reachable from `head`
 * but not from `base`, each with its full message. Upstream `log` returns
 * subjects only, and takes no range. A fact about the repository, no rule:
 * what a message may contain is the source-standards model's business.
 *
 * @module
 */
import { z } from "npm:zod@4";

const ArgsSchema = z.object({
  base: z.string().min(1).default("main").describe("Ref the branch merges into"),
  head: z.string().min(1).default("HEAD").describe("Commit-ish at the tip of the branch"),
});

/** One commit of the range: sha, subject, full message. */
export const CommitSchema = z.object({
  sha: z.string(),
  subject: z.string(),
  message: z.string(),
});
export type Commit = z.infer<typeof CommitSchema>;

const CommitMessagesSchema = z.object({
  base: z.string(),
  head: z.string(),
  headSha: z.string(),
  commitCount: z.number().int().nonnegative(),
  commits: z.array(CommitSchema),
});

/** Runs git in the repository and returns stdout as text. */
export type Git = (args: string[]) => Promise<string>;

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
        `git ${args[0]} failed (exit ${out.code}) in ${repoPath}: ${new TextDecoder().decode(out.stderr).trim()}`,
      );
    }
    return new TextDecoder().decode(out.stdout);
  };
}

/** Parse `git log --format=%H%x1f%s%x1f%B%x1e` output. */
export function parseLog(raw: string): Commit[] {
  return raw.split("\x1e").map((r) => r.replace(/^\n/, "")).filter((r) => r.length > 0).map((record) => {
    const [sha, subject, message] = record.split("\x1f");
    return { sha, subject, message: message ?? "" };
  });
}

/** The commits in base..head, oldest last as git lists them. */
export async function commitMessages(
  git: Git,
  base: string,
  head: string,
): Promise<z.infer<typeof CommitMessagesSchema>> {
  const headSha = (await git(["rev-parse", "--verify", `${head}^{commit}`])).trim();
  const commits = parseLog(await git(["log", "--format=%H%x1f%s%x1f%B%x1e", `${base}..${headSha}`]));
  return { base, head, headSha, commitCount: commits.length, commits };
}

/** Extension adding the range log to the @swamp/git model type. */
export const extension = {
  type: "@swamp/git",
  resources: {
    commitMessages: {
      description: "The commits of a range with their full messages",
      schema: CommitMessagesSchema,
      lifetime: "infinite" as const,
      garbageCollection: 20,
    },
  },
  methods: [{
    commit_messages: {
      description: "List the commits in base..head with sha, subject, and full message (read-only)",
      arguments: ArgsSchema,
      execute: async (
        args: z.infer<typeof ArgsSchema>,
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
        const result = await commitMessages(denoGit(context.globalArgs.repoPath, context.signal), args.base, args.head);
        const handle = await context.writeResource("commitMessages", "commit-messages", result);
        context.logger.info("{commitCount} commits in {base}..{head}", {
          commitCount: result.commitCount,
          base: args.base,
          head: args.head,
        });
        return { dataHandles: [handle] };
      },
    },
  }],
};
