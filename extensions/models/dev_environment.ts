/**
 * The Dataverket development environment, driven through its Taskfile
 * (see the dev-environment skill). One method per task; each records the
 * outcome pinned to the worktree's HEAD, plus the full log.
 *
 * @module
 */
import { z } from "npm:zod@4";
import { runTarget, type TargetResult } from "./_lib/task.ts";

const GlobalArgsSchema = z.object({
  worktree: z.string().startsWith("/").describe(
    "Absolute path to the repository worktree that holds the Taskfile",
  ),
});
type GlobalArgs = z.infer<typeof GlobalArgsSchema>;

const ArgsSchema = (fallback: number) =>
  z.object({
    timeoutSeconds: z.number().int().positive().default(fallback).describe(
      "Kill task after this many seconds",
    ),
  });
type Args = z.infer<ReturnType<typeof ArgsSchema>>;

const RunSchema = z.object({
  target: z.string(),
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
 * Run the task, persist the result and log, then fail the method if it
 * failed — the data is written first so a red run can be diagnosed.
 */
async function record(
  target: string,
  args: Args,
  context: Context,
): Promise<{ dataHandles: Array<{ name: string }> }> {
  context.logger.info("task {target} in {worktree}", {
    target,
    worktree: context.globalArgs.worktree,
  });
  const result: TargetResult = await runTarget({
    worktree: context.globalArgs.worktree,
    target,
    timeoutSeconds: args.timeoutSeconds,
    signal: context.signal,
  });
  const { output, ...run } = result;
  const log = await context
    .createFileWriter("log", `${context.methodName}-log`)
    .writeText(output);
  const handle = await context.writeResource("run", context.methodName, run);
  context.logger.info(
    "task {target} at {headSha}: exit {exitCode} in {durationMs}ms",
    {
      ...run,
    },
  );
  if (!run.succeeded) {
    throw new Error(
      `task ${target} ${
        run.timedOut
          ? `timed out after ${args.timeoutSeconds}s`
          : `failed with exit ${run.exitCode}`
      } at ${run.headSha}:\n${run.logTail.join("\n")}`,
    );
  }
  return { dataHandles: [handle, log] };
}

/** Model definition for the task-driven development environment. */
export const model = {
  type: "@dataverket/dev-environment",
  version: "2026.11.12.1",
  globalArguments: GlobalArgsSchema,
  resources: {
    run: {
      description: "Outcome of one task, pinned to the worktree HEAD",
      schema: RunSchema,
      lifetime: "infinite",
      garbageCollection: 20,
    },
  },
  files: {
    log: {
      description: "Combined stdout and stderr of the task",
      contentType: "text/plain",
      lifetime: "30d",
      garbageCollection: 20,
    },
  },
  methods: {
    check: {
      description:
        "task check: SPDX headers, gofmt, go vet, golangci-lint and the unit tests",
      arguments: ArgsSchema(900),
      execute: (args: Args, context: Context) => record("check", args, context),
    },
    verify: {
      description:
        "task verify: ko images for the commit, a private stack, the system tests from outside",
      arguments: ArgsSchema(3600),
      execute: (args: Args, context: Context) =>
        record("verify", args, context),
    },
  },
};
