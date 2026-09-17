/**
 * fabrikk's verification attestation: checks that the recorded verification,
 * review, and approval all concern the commit under review, then writes the
 * attestation document into the worktree for committing on the branch.
 *
 * @module
 */
import { z } from "npm:zod@4";

/** Where the attestation lives in the repository. */
export const ATTESTATION_PATH = ".fabrikk/attestation.json";

const GlobalArgsSchema = z.object({
  worktree: z.string().startsWith("/").describe(
    "Absolute path to the worktree the attestation is written into",
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

/** Model definition for writing fabrikk attestations. */
export const model = {
  type: "@dataverket/attestation",
  version: "2026.09.17.1",
  globalArguments: GlobalArgsSchema,
  resources: {
    attestation: {
      description: `The attestation document written to ${ATTESTATION_PATH}`,
      schema: AttestationSchema,
      lifetime: "infinite" as const,
      garbageCollection: 20,
    },
  },
  methods: {
    write: {
      description:
        `Refuse unless verification, review, approval, and digest all concern headSha; then write ${ATTESTATION_PATH}`,
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
        const document = buildAttestation(args, new Date());
        const path = `${context.globalArgs.worktree}/${ATTESTATION_PATH}`;
        await Deno.mkdir(path.slice(0, path.lastIndexOf("/")), {
          recursive: true,
        });
        await Deno.writeTextFile(
          path,
          `${JSON.stringify(document, null, 2)}\n`,
        );
        const handle = await context.writeResource(
          "attestation",
          "attestation",
          document,
        );
        context.logger.info(
          "Wrote {path}; protected paths changed: {changed}",
          {
            path,
            changed: document.protectedPaths.changed.length,
          },
        );
        return { dataHandles: [handle] };
      },
    },
  },
};
