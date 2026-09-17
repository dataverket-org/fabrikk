import { assertEquals } from "jsr:@std/assert@1";
import { resetArgs, summarize } from "./flux_reset.ts";

Deno.test("resetArgs pins the flux invocation", () => {
  assertEquals(resetArgs({ name: "cert-manager", namespace: "cert-manager" }), [
    "reconcile", "helmrelease", "cert-manager", "-n", "cert-manager", "--reset",
  ]);
  assertEquals(
    resetArgs({ name: "a", namespace: "b", withSource: true }).at(-1),
    "--with-source",
  );
});

Deno.test("summarize reads readiness, history and counters", () => {
  const r = summarize({
    status: {
      installFailures: 1,
      history: [{ status: "failed" }],
      conditions: [{ type: "Ready", status: "False", reason: "InstallFailed", message: "timeout" }],
    },
  }, "cert-manager", "cert-manager");
  assertEquals(r.ready, false);
  assertEquals(r.readyReason, "InstallFailed");
  assertEquals(r.deployStatus, "failed");
  assertEquals(r.installFailures, 1);
  assertEquals(r.upgradeFailures, 0);
});
