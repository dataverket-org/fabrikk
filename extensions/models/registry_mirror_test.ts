import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.13";
import { type ExecOptions, mirror, setRuntime, sourceDigest } from "./registry_mirror.ts";

const D = "sha256:" + "a".repeat(64);
const g = { registry: "registry.example.org", namespace: "mirror", username: "ci", password: "s3cret", tools: "_bin" };
const a = { source: `docker.io/library/nats@${D}`, name: "nats", tag: "2.15.0-alpine" };

/** A fake crane: `digest` answers from `digests`, everything else succeeds; every call is recorded. */
function fakeCrane(digests: Record<string, string | undefined>) {
  const calls: { argv: string[]; opts?: ExecOptions }[] = [];
  setRuntime((argv, opts) => {
    calls.push({ argv, opts });
    if (argv[1] === "digest") {
      const d = digests[argv[2]];
      return Promise.resolve(d ? { code: 0, stdout: d, stderr: "" } : { code: 1, stdout: "", stderr: "MANIFEST_UNKNOWN" });
    }
    if (argv[1] === "copy") digests[argv[3]] = digests["__after_copy__"];
    return Promise.resolve({ code: 0, stdout: "", stderr: "" });
  });
  return calls;
}

Deno.test("mirror copies a missing image, logs in with the password on stdin, and verifies the digest", async () => {
  const calls = fakeCrane({ __after_copy__: D });
  try {
    const info = await mirror("crane", g, a, "/tmp/dc");
    assertEquals(info.action, "copied");
    assertEquals(info.target, `registry.example.org/mirror/nats@${D}`);
    const login = calls.find((c) => c.argv[1] === "auth")!;
    assertEquals(login.opts?.stdin, "s3cret");
    assertEquals(login.argv.includes("s3cret"), false);
    assertEquals(login.opts?.env?.DOCKER_CONFIG, "/tmp/dc");
    assertEquals(calls.map((c) => c.argv[1]), ["digest", "auth", "copy", "digest"]);
  } finally {
    setRuntime();
  }
});

Deno.test("mirror leaves an image at the right digest unchanged without logging in", async () => {
  const calls = fakeCrane({ "registry.example.org/mirror/nats:2.15.0-alpine": D });
  try {
    const info = await mirror("crane", g, a, "/tmp/dc");
    assertEquals(info.action, "unchanged");
    assertEquals(calls.length, 1);
  } finally {
    setRuntime();
  }
});

Deno.test("mirror refuses a copy whose resulting digest differs", async () => {
  fakeCrane({ __after_copy__: "sha256:" + "b".repeat(64) });
  try {
    await assertRejects(() => mirror("crane", g, a, "/tmp/dc"), Error, "expected " + D);
  } finally {
    setRuntime();
  }
});

Deno.test("sourceDigest reads the pinned digest", () => {
  assertEquals(sourceDigest(a.source), D);
});
