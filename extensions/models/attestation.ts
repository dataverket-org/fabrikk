/**
 * fabrikk's verification attestation: checks that the recorded verification,
 * review, and approval all concern the commit under review, then records the
 * attestation document as a signed annotated tag on that commit. Nothing is
 * committed, so the verified commit, the attested commit, and the PR head are
 * the same commit.
 *
 * @module
 */
import { z } from "npm:zod@4";

/** The tag that carries the attestation for a verified commit. */
export const tagName = (headSha: string): string => `attestation/${headSha}`;

const GlobalArgsSchema = z.object({
  worktree: z.string().startsWith("/").describe(
    "Absolute path to the worktree whose repository gets the attestation tag",
  ),
});
type GlobalArgs = z.infer<typeof GlobalArgsSchema>;

const Sha = z.string().regex(/^[0-9a-f]{40}$/);
const Sha256 = z.string().regex(/^[0-9a-f]{64}$/);

// Inputs are the attributes of records other models wrote; only the fields
// the attestation relies on are declared.
const MakeRunSchema = z.object({
  target: z.string(),
  headSha: z.string(),
  succeeded: z.boolean(),
  exitCode: z.number().int(),
  durationMs: z.number().int(),
  finishedAt: z.string(),
});

const CodeReviewSchema = z.object({
  workItem: z.string(),
  cycle: z.number().int(),
  subjectVersion: z.number().int().optional(),
  recordedAt: z.string(),
  payload: z.object({
    findings: z.array(z.object({
      id: z.string(),
      severity: z.enum(["critical", "high", "medium", "low"]),
      resolved: z.boolean().optional(),
    })),
  }),
});

const ApprovalSchema = z.object({
  workItem: z.string(),
  gateId: z.string(),
  decision: z.enum(["approved", "rejected"]),
  actor: z.string(),
  cycle: z.number().int(),
  decidedAt: z.string(),
});

const PathsDigestSchema = z.object({
  commitSha: z.string(),
  paths: z.array(z.string()),
  unmatched: z.array(z.string()),
  algorithm: z.literal("sha256"),
  fileCount: z.number().int(),
  sha256: Sha256,
});

const WriteArgsSchema = z.object({
  workItem: z.string().min(1),
  branch: z.string().min(1),
  headSha: Sha,
  base: z.string().min(1).describe("Ref the branch merges into"),
  check: MakeRunSchema,
  verify: MakeRunSchema,
  codeReview: CodeReviewSchema,
  planApproval: ApprovalSchema,
  protectedPaths: PathsDigestSchema,
  protectedPathsChanged: z.array(z.string()),
});
export type WriteArgs = z.infer<typeof WriteArgsSchema>;

const Severities = ["critical", "high", "medium", "low"] as const;

const RunSummarySchema = z.object({
  exitCode: z.number().int(),
  durationMs: z.number().int(),
  finishedAt: z.string(),
});

/** The committed document. Its shape is the contract CI validates. */
export const AttestationSchema = z.object({
  attestation: z.literal("fabrikk/v1"),
  workItem: z.string(),
  branch: z.string(),
  headSha: Sha,
  attestedAt: z.iso.datetime(),
  verification: z.object({ check: RunSummarySchema, verify: RunSummarySchema }),
  planApproval: z.object({
    actor: z.string(),
    cycle: z.number().int(),
    decidedAt: z.string(),
  }),
  codeReview: z.object({
    cycle: z.number().int(),
    recordedAt: z.string(),
    unresolved: z.object({
      critical: z.number().int(),
      high: z.number().int(),
      medium: z.number().int(),
      low: z.number().int(),
    }),
  }),
  protectedPaths: z.object({
    paths: z.array(z.string()),
    unmatched: z.array(z.string()),
    algorithm: z.literal("sha256"),
    fileCount: z.number().int(),
    sha256: Sha256,
    base: z.string(),
    changed: z.array(z.string()),
  }),
});
type Attestation = z.infer<typeof AttestationSchema>;

/** Every reason the inputs do not attest headSha; empty when they do. */
export function violations(args: WriteArgs): string[] {
  const problems: string[] = [];
  for (
    const [name, run] of [["check", args.check], [
      "verify",
      args.verify,
    ]] as const
  ) {
    if (run.target !== name) {
      problems.push(`${name}: record is for make ${run.target}`);
    }
    if (run.headSha !== args.headSha) {
      problems.push(`${name}: ran at ${run.headSha}, not ${args.headSha}`);
    }
    if (!run.succeeded) {
      problems.push(`${name}: did not succeed (exit ${run.exitCode})`);
    }
  }
  if (args.protectedPaths.commitSha !== args.headSha) {
    problems.push(
      `protected paths: digest is of ${args.protectedPaths.commitSha}, not ${args.headSha}`,
    );
  }
  if (args.planApproval.workItem !== args.workItem) {
    problems.push(`plan approval: belongs to ${args.planApproval.workItem}`);
  }
  if (args.planApproval.decision !== "approved") {
    problems.push(
      `plan approval: ${args.planApproval.decision} by ${args.planApproval.actor}`,
    );
  }
  if (args.codeReview.workItem !== args.workItem) {
    problems.push(`code review: belongs to ${args.codeReview.workItem}`);
  }
  const blocking = args.codeReview.payload.findings.filter((f) =>
    !f.resolved && (f.severity === "critical" || f.severity === "high")
  );
  if (blocking.length > 0) {
    problems.push(
      `code review: unresolved ${
        blocking.map((f) => `${f.id} (${f.severity})`).join(", ")
      }`,
    );
  }
  return problems;
}

/** Build the attestation document from validated inputs. */
export function buildAttestation(
  args: WriteArgs,
  attestedAt: Date,
): Attestation {
  const unresolved = Object.fromEntries(Severities.map((s) => [
    s,
    args.codeReview.payload.findings.filter((f) =>
      f.severity === s && !f.resolved
    ).length,
  ])) as Record<(typeof Severities)[number], number>;
  const summary = (r: z.infer<typeof MakeRunSchema>) => ({
    exitCode: r.exitCode,
    durationMs: r.durationMs,
    finishedAt: r.finishedAt,
  });
  return {
    attestation: "fabrikk/v1",
    workItem: args.workItem,
    branch: args.branch,
    headSha: args.headSha,
    attestedAt: attestedAt.toISOString(),
    verification: { check: summary(args.check), verify: summary(args.verify) },
    planApproval: {
      actor: args.planApproval.actor,
      cycle: args.planApproval.cycle,
      decidedAt: args.planApproval.decidedAt,
    },
    codeReview: {
      cycle: args.codeReview.cycle,
      recordedAt: args.codeReview.recordedAt,
      unresolved,
    },
    protectedPaths: {
      paths: args.protectedPaths.paths,
      unmatched: args.protectedPaths.unmatched,
      algorithm: "sha256",
      fileCount: args.protectedPaths.fileCount,
      sha256: args.protectedPaths.sha256,
      base: args.base,
      changed: args.protectedPathsChanged,
    },
  };
}

/** Runs git in cwd and returns stdout; throws with stderr on failure. */
async function git(cwd: string, args: string[]): Promise<string> {
  const out = await new Deno.Command("git", {
    args,
    cwd,
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (out.code !== 0) {
    throw new Error(
      `git ${args[0]} failed (exit ${out.code}): ${
        new TextDecoder().decode(out.stderr).trim()
      }`,
    );
  }
  return new TextDecoder().decode(out.stdout);
}

/**
 * Create (or replace, locally) the signed annotated tag `attestation/<headSha>`
 * on headSha. The message is a subject line, a blank line, and the document as
 * JSON, so `git for-each-ref --format='%(contents:body)'` returns the JSON.
 * Refuses a tag that is unsigned or does not point at headSha.
 */
export async function tagAttestation(
  worktree: string,
  document: Attestation,
): Promise<{ tag: string; tagSha: string }> {
  const tag = tagName(document.headSha);
  const dir = await Deno.makeTempDir({ prefix: "attestation-" });
  try {
    const message =
      `fabrikk attestation for ${document.workItem} at ${document.headSha}\n\n${
        JSON.stringify(document, null, 2)
      }\n`;
    await Deno.writeTextFile(`${dir}/message`, message);
    await git(worktree, [
      "tag",
      "--sign",
      "--force",
      "--cleanup=verbatim",
      "--file",
      `${dir}/message`,
      tag,
      document.headSha,
    ]);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
  const raw = await git(worktree, ["cat-file", "tag", tag]);
  if (!/-----BEGIN (SSH|PGP) SIGNATURE-----/.test(raw)) {
    throw new Error(`${tag} was created without a signature`);
  }
  const target = (await git(worktree, ["rev-parse", `${tag}^{commit}`])).trim();
  if (target !== document.headSha) {
    throw new Error(`${tag} points at ${target}, not ${document.headSha}`);
  }
  return { tag, tagSha: (await git(worktree, ["rev-parse", tag])).trim() };
}

const RecordedSchema = z.object({
  tag: z.string(),
  tagSha: z.string(),
  attestation: AttestationSchema,
});

/** Model definition for fabrikk attestations. */
export const model = {
  type: "@dataverket/attestation",
  version: "2026.09.17.1",
  globalArguments: GlobalArgsSchema,
  resources: {
    attestation: {
      description:
        "The attestation and the signed tag attestation/<headSha> that carries it",
      schema: RecordedSchema,
      lifetime: "infinite" as const,
      garbageCollection: 20,
    },
  },
  methods: {
    tag: {
      description:
        "Refuse unless verification, review, approval, and digest all concern headSha; then sign the attestation as tag attestation/<headSha>",
      arguments: WriteArgsSchema,
      execute: async (
        args: WriteArgs,
        context: {
          globalArgs: GlobalArgs;
          logger: { info(msg: string, props?: Record<string, unknown>): void };
          writeResource: (
            specName: string,
            name: string,
            data: Record<string, unknown>,
          ) => Promise<{ name: string }>;
        },
      ) => {
        context.logger.info("Attesting {workItem} at {headSha}", { ...args });
        const problems = violations(args);
        if (problems.length > 0) {
          throw new Error(
            `refusing to attest ${args.workItem} at ${args.headSha}:\n- ${
              problems.join("\n- ")
            }`,
          );
        }
        const attestation = buildAttestation(args, new Date());
        const { tag, tagSha } = await tagAttestation(
          context.globalArgs.worktree,
          attestation,
        );
        const handle = await context.writeResource(
          "attestation",
          "attestation",
          {
            tag,
            tagSha,
            attestation,
          },
        );
        context.logger.info(
          "Signed {tag}; protected paths changed: {changed}",
          {
            tag,
            changed: attestation.protectedPaths.changed.length,
          },
        );
        return { dataHandles: [handle] };
      },
    },
  },
};
