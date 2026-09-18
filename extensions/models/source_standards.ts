/**
 * The program's counterpart of the source-standards skill: the rules a commit
 * or a pull request text must meet before it is published as the author's.
 * Today one rule, AI attribution. Pure policy over data other models produced
 * (commit messages from `@swamp/git`, the PR text the agent is about to send);
 * every check is recorded before it fails, and CI reruns the same pattern
 * (`.forgejo/workflows/validate-attestation.yaml`, copied literally).
 *
 * @module
 */
import { z } from "npm:zod@4";
import { CommitSchema } from "./git_commit_messages.ts";

/**
 * AI attribution that is never published as the author's: a `Co-Authored-By`
 * naming an agent or model, a "generated with" footer, or the robot emoji
 * such footers carry. Case-insensitive extended regular expression; keep it
 * `grep -iE` compatible (no lookaround, no \d) so CI reads it as `RegExp`
 * does here.
 */
export const ATTRIBUTION_PATTERN =
  "co-authored-by:.*(claude|anthropic|copilot|codex|openai|chatgpt|gemini|cursor|opencode|kiro|antigravity|noreply@anthropic)" +
  "|generated (with|by) .*(claude|copilot|codex|chatgpt|gemini|cursor|opencode|kiro|antigravity|\\bai\\b)" +
  "|🤖";

/**
 * Shell recipe (bash, git, GNU grep) that prints every offending line of the
 * commits in $BASE..$HEAD, each prefixed by its commit; prints nothing and
 * exits 1 when the range is clean.
 */
export const ATTRIBUTION_RECIPE =
  `git log --format='%H%n%B' "$BASE..$HEAD" |
awk '/^[0-9a-f]{40}$/ { sha = substr($0, 1, 12); next } { print sha " " $0 }' |
grep -iE '${ATTRIBUTION_PATTERN}'`;

const re = new RegExp(ATTRIBUTION_PATTERN, "i");

/** The lines of `text` that carry attribution, trimmed, in order. */
export function findAttribution(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter((l) => re.test(l));
}

const CommitsArgs = z.object({
  commits: z.array(CommitSchema).describe(
    'The commits to check, e.g. data.latest("git-<sha>", "commit-messages").attributes.commits',
  ),
});

const TextArgs = z.object({
  title: z.string().min(1).describe("The pull request title as it will be sent"),
  body: z.string().default("").describe("The pull request body as it will be sent"),
});

const CheckSchema = z.object({
  rule: z.literal("no-ai-attribution"),
  subject: z.enum(["commits", "text"]),
  checked: z.number().int().nonnegative().describe("Commits, or text fields, examined"),
  offending: z.array(z.object({ where: z.string(), line: z.string() })),
  clean: z.boolean(),
  checkedAt: z.iso.datetime(),
});
type Check = z.infer<typeof CheckSchema>;

/** Pure: which commits carry attribution, and on which lines. */
export function checkCommits(commits: z.infer<typeof CommitSchema>[]): Check {
  const offending = commits.flatMap((c) =>
    findAttribution(c.message).map((line) => ({ where: `${c.sha.slice(0, 12)} ${c.subject}`, line }))
  );
  return {
    rule: "no-ai-attribution",
    subject: "commits",
    checked: commits.length,
    offending,
    clean: offending.length === 0,
    checkedAt: new Date().toISOString(),
  };
}

/** Pure: which of the title and body carry attribution. */
export function checkText(a: z.infer<typeof TextArgs>): Check {
  const offending = [
    ...findAttribution(a.title).map((line) => ({ where: "title", line })),
    ...findAttribution(a.body).map((line) => ({ where: "body", line })),
  ];
  return {
    rule: "no-ai-attribution",
    subject: "text",
    checked: 2,
    offending,
    clean: offending.length === 0,
    checkedAt: new Date().toISOString(),
  };
}

interface Ctx {
  logger: { info(msg: string, props?: Record<string, unknown>): void };
  writeResource: (
    specName: string,
    name: string,
    data: Record<string, unknown>,
  ) => Promise<{ name: string }>;
}

/** Record the check, then fail if it did not pass, naming every offending line. */
async function record(name: string, check: Check, context: Ctx): Promise<{ dataHandles: Array<{ name: string }> }> {
  const handle = await context.writeResource("check", name, check);
  context.logger.info("{subject}: {offending} attribution lines in {checked}", {
    subject: check.subject,
    offending: check.offending.length,
    checked: check.checked,
  });
  if (!check.clean) {
    throw new Error(
      `AI attribution in the ${check.subject}; nothing published as the author carries it (source-standards skill):\n${
        check.offending.map((o) => `  ${o.where}\n    ${o.line}`).join("\n")
      }`,
    );
  }
  return { dataHandles: [handle] };
}

/** Model definition: fabrikk's source standards as checks over data. */
export const model = {
  type: "@dataverket/source-standards",
  version: "2026.09.18.1",
  globalArguments: z.object({}),
  resources: {
    check: {
      description: "One rule applied to one subject: what was examined, what offended, whether it passed",
      schema: CheckSchema,
      lifetime: "infinite" as const,
      garbageCollection: 50,
    },
  },
  methods: {
    commits: {
      description:
        "Refuse commits whose messages carry AI attribution (a Co-Authored-By naming an agent, a 'generated with' " +
        "footer). Takes the commits as data from git commit_messages; records the check before failing.",
      arguments: CommitsArgs,
      execute: (args: z.infer<typeof CommitsArgs>, context: Ctx) =>
        record("commits", checkCommits(CommitsArgs.parse(args).commits), context),
    },
    text: {
      description:
        "Refuse a pull request title or body that carries AI attribution, before pr_ensure sends it. " +
        "Records the check before failing.",
      arguments: TextArgs,
      execute: (args: z.infer<typeof TextArgs>, context: Ctx) => record("text", checkText(TextArgs.parse(args)), context),
    },
  },
};
