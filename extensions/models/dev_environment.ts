/**
 * The Dataverket development environment, driven through its make targets
 * (see the dev-environment skill). One method per target; each records the
 * outcome pinned to the worktree's HEAD, plus the full log.
 *
 * @module
 */
import { z } from "npm:zod@4";
import { runTarget, type TargetResult } from "./_lib/make.ts";

const GlobalArgsSchema = z.object({
  worktree: z.string().startsWith("/").describe(
    "Absolute path to the repository worktree that holds the Makefile",
  ),
});
type GlobalArgs = z.infer<typeof GlobalArgsSchema>;

const ProfileSchema = z.enum(["default", "objekt", "maskin"]).default(
  "default",
).describe("Compose profile (verify is selected by make verify itself)");

const timeoutSeconds = (fallback: number) =>
  z.number().int().positive().default(fallback).describe(
    "Kill make after this many seconds",
  );

const ProfileArgsSchema = z.object({
  profile: ProfileSchema,
  timeoutSeconds: timeoutSeconds(600),
});
const PlainArgsSchema = (fallback: number) =>
  z.object({ timeoutSeconds: timeoutSeconds(fallback) });

const RunSchema = z.object({
  target: z.string(),
  profile: z.string().nullable(),
  worktree: z.string(),
  headSha: z.string(),
  exitCode: z.number().int(),
  succeeded: z.boolean(),
  timedOut: z.boolean(),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime(),
  durationMs: z.number().int().nonnegative(),
  logTail: z.array(z.string()),
  logTruncated: z.boolean(),
});

interface Context {
  globalArgs: GlobalArgs;
  methodName: string;
  signal: AbortSignal;
  logger: { info(msg: string, props?: Record<string, unknown>): void };
  writeResource: (
    specName: string,
    name: string,
    data: Record<string, unknown>,
  ) => Promise<{ name: string }>;
  createFileWriter: (
    specName: string,
    name: string,
  ) => { writeText(text: string): Promise<{ name: string }> };
}

/**
 * Run the target, persist the result and log, then fail the method if make
 * failed — the data is written first so a red run can be diagnosed.
 */
async function record(
  target: string,
  args: { profile?: string; timeoutSeconds: number },
  context: Context,
): Promise<{ dataHandles: Array<{ name: string }> }> {
  context.logger.info("make {target} in {worktree}", {
    target,
    worktree: context.globalArgs.worktree,
  });
  const result: TargetResult = await runTarget({
    worktree: context.globalArgs.worktree,
    target,
    profile: args.profile,
    timeoutSeconds: args.timeoutSeconds,
    signal: context.signal,
  });
  const { output, ...run } = result;
  const log = await context
    .createFileWriter("log", `${context.methodName}-log`)
    .writeText(output);
  const handle = await context.writeResource("run", context.methodName, run);
  context.logger.info(
    "make {target} at {headSha}: exit {exitCode} in {durationMs}ms",
    {
      ...run,
    },
  );
  if (!run.succeeded) {
    throw new Error(
      `make ${target} ${
        run.timedOut
          ? `timed out after ${args.timeoutSeconds}s`
          : `failed with exit ${run.exitCode}`
      } at ${run.headSha}:\n${run.logTail.join("\n")}`,
    );
  }
  return { dataHandles: [handle, log] };
}

/** Model definition for the make-driven development environment. */
export const model = {
  type: "@dataverket/dev-environment",
  version: "2026.09.17.1",
  globalArguments: GlobalArgsSchema,
  resources: {
    run: {
      description: "Outcome of one make target, pinned to the worktree HEAD",
      schema: RunSchema,
      lifetime: "infinite",
      garbageCollection: 20,
    },
  },
  files: {
    log: {
      description: "Combined stdout and stderr of the make target",
      contentType: "text/plain",
      lifetime: "30d",
      garbageCollection: 20,
    },
  },
  methods: {
    up: {
      description:
        "make dev.up: start the session stack and wait until healthy",
      arguments: ProfileArgsSchema,
      execute: (args: z.infer<typeof ProfileArgsSchema>, context: Context) =>
        record("dev.up", args, context),
    },
    down: {
      description: "make dev.down: stop the session stack, keep volumes",
      arguments: PlainArgsSchema(300),
      execute: (
        args: z.infer<ReturnType<typeof PlainArgsSchema>>,
        context: Context,
      ) => record("dev.down", args, context),
    },
    reset: {
      description: "make dev.reset: return every fragment to its seeded state",
      arguments: ProfileArgsSchema,
      execute: (args: z.infer<typeof ProfileArgsSchema>, context: Context) =>
        record("dev.reset", args, context),
    },
    check: {
      description: "make check: gofmt, go vet, golangci-lint, go test (tier 0)",
      arguments: PlainArgsSchema(900),
      execute: (
        args: z.infer<ReturnType<typeof PlainArgsSchema>>,
        context: Context,
      ) => record("check", args, context),
    },
    verify: {
      description:
        "make verify: ko images, verify profile, contract and black-box suites (tier 2)",
      arguments: PlainArgsSchema(3600),
      execute: (
        args: z.infer<ReturnType<typeof PlainArgsSchema>>,
        context: Context,
      ) => record("verify", args, context),
    },
  },
};
