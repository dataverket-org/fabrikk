/**
 * Adds to `@ginger_pappa/flux/helmrelease` the one action the upstream model
 * lacks: a reconcile with `--reset`, which clears a HelmRelease's failure
 * counters so helm-controller tries again after `RetriesExceeded`. Without it a
 * release whose first install timed out stays failed forever, even when every
 * workload it created is healthy.
 *
 * Same shape as upstream: wraps the pinned `flux` CLI (run with `_tools/bin` on
 * PATH), reads the object back with kubectl, records the outcome.
 *
 * @module
 */
import { z } from "npm:zod@4";

const ResetArgsSchema = z.object({
  /** HelmRelease name. */
  name: z.string().min(1),
  /** Namespace of the HelmRelease. Defaults to the model's namespace. */
  namespace: z.string().optional(),
  /** Also reconcile the upstream source before the release. */
  withSource: z.boolean().optional(),
});

export const ResetResultSchema = z.object({
  name: z.string(),
  namespace: z.string(),
  ready: z.boolean(),
  readyReason: z.string(),
  readyMessage: z.string(),
  /** Helm release status of the newest history entry (deployed, failed, …). */
  deployStatus: z.string().optional(),
  installFailures: z.number(),
  upgradeFailures: z.number(),
  timestamp: z.string(),
});

interface GlobalArgs {
  namespace?: string;
  kubeconfig?: string;
  context?: string;
}

/** The exact `flux` argument list; pure so the test can pin it. */
export function resetArgs(
  a: { name: string; namespace: string; withSource?: boolean },
): string[] {
  const args = ["reconcile", "helmrelease", a.name, "-n", a.namespace, "--reset"];
  if (a.withSource) args.push("--with-source");
  return args;
}

/** Reduce a HelmRelease object to the recorded result. */
export function summarize(
  obj: Record<string, unknown>,
  name: string,
  namespace: string,
): z.infer<typeof ResetResultSchema> {
  const status = (obj.status ?? {}) as Record<string, unknown>;
  const conds = (status.conditions ?? []) as Array<Record<string, string>>;
  const ready = conds.find((c) => c.type === "Ready");
  const history = (status.history ?? []) as Array<Record<string, unknown>>;
  return {
    name,
    namespace,
    ready: ready?.status === "True",
    readyReason: ready?.reason ?? "",
    readyMessage: ready?.message ?? "",
    deployStatus: history[0]?.status as string | undefined,
    installFailures: Number(status.installFailures ?? 0),
    upgradeFailures: Number(status.upgradeFailures ?? 0),
    timestamp: new Date().toISOString(),
  };
}

async function run(
  bin: string,
  args: string[],
  g: GlobalArgs,
  signal?: AbortSignal,
): Promise<string> {
  const full: string[] = [];
  if (g.kubeconfig) full.push("--kubeconfig", g.kubeconfig);
  if (g.context) full.push("--context", g.context);
  full.push(...args);
  const out = await new Deno.Command(bin, {
    args: full,
    stdout: "piped",
    stderr: "piped",
    signal,
  }).output();
  const stdout = new TextDecoder().decode(out.stdout);
  const stderr = new TextDecoder().decode(out.stderr);
  if (!out.success) {
    throw new Error(`${bin} ${args[0]} failed: ${(stderr || stdout).trim()}`);
  }
  return stdout;
}

export const extension = {
  type: "@ginger_pappa/flux/helmrelease",
  resources: {
    resetResult: {
      description:
        "Outcome of a reconcile with --reset: readiness and failure counters afterwards.",
      schema: ResetResultSchema,
      lifetime: "infinite" as const,
      garbageCollection: 20,
    },
  },
  methods: [{
    reset: {
      description:
        "Reconcile a HelmRelease with --reset: clears its failure counters so helm-controller retries a release stuck at RetriesExceeded. Waits for the attempt and records the result.",
      arguments: ResetArgsSchema,
      execute: async (
        args: z.infer<typeof ResetArgsSchema>,
        context: {
          globalArgs: GlobalArgs;
          signal: AbortSignal;
          logger: { info(msg: string, props?: Record<string, unknown>): void };
          writeResource: (
            specName: string,
            name: string,
            data: Record<string, unknown>,
          ) => Promise<{ name: string }>;
        },
      ) => {
        const namespace = args.namespace ?? context.globalArgs.namespace;
        if (!namespace) {
          throw new Error(
            "namespace is required: set it on the model or pass --input namespace=<ns>",
          );
        }
        context.logger.info("Resetting and reconciling HelmRelease {name} in {namespace}", {
          name: args.name,
          namespace,
        });
        let attemptError: string | undefined;
        try {
          await run("flux", resetArgs({ name: args.name, namespace, withSource: args.withSource }), context.globalArgs, context.signal);
        } catch (e) {
          // The attempt itself may fail again; record what the object says rather than hide it.
          attemptError = e instanceof Error ? e.message : String(e);
        }
        const raw = JSON.parse(
          await run("kubectl", ["get", "helmrelease", args.name, "-n", namespace, "-o", "json"], context.globalArgs, context.signal),
        ) as Record<string, unknown>;
        const result = summarize(raw, args.name, namespace);
        const handle = await context.writeResource("resetResult", `${namespace}--${args.name}`, result);
        context.logger.info("HelmRelease {name}: ready={ready} {reason}", {
          name: args.name,
          ready: String(result.ready),
          reason: result.readyReason,
        });
        if (attemptError && !result.ready) throw new Error(attemptError);
        return { dataHandles: [handle] };
      },
    },
  }],
};
