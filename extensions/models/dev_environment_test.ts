import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.13";
import { resetSpawn, runTarget, setSpawn, type Spawn } from "./_lib/make.ts";
import { model } from "./dev_environment.ts";

const SHA = "0123456789abcdef0123456789abcdef01234567";

function fakeSpawn(
  make: (
    argv: string[],
    signal?: AbortSignal,
  ) => Promise<{ exitCode: number; output: string }>,
): { calls: string[][] } {
  const calls: string[][] = [];
  const fn: Spawn = (argv, opts) => {
    calls.push(argv);
    if (argv[0] === "git") {
      return Promise.resolve({ exitCode: 0, output: `${SHA}\n` });
    }
    return make(argv, opts.signal);
  };
  setSpawn(fn);
  return { calls };
}

function fakeContext(methodName: string) {
  const resources: Record<string, Record<string, unknown>> = {};
  const files: Record<string, string> = {};
  return {
    resources,
    files,
    context: {
      globalArgs: { worktree: "/work/sentral" },
      methodName,
      signal: new AbortController().signal,
      logger: { info: () => {} },
      writeResource: (
        _spec: string,
        name: string,
        data: Record<string, unknown>,
      ) => {
        resources[name] = data;
        return Promise.resolve({ name });
      },
      createFileWriter: (_spec: string, name: string) => ({
        writeText: (text: string) => {
          files[name] = text;
          return Promise.resolve({ name });
        },
      }),
    },
  };
}

Deno.test("runTarget pins the result to HEAD and passes PROFILE only when not default", async () => {
  const { calls } = fakeSpawn(() =>
    Promise.resolve({ exitCode: 0, output: "ok\n" })
  );
  try {
    const plain = await runTarget({
      worktree: "/w",
      target: "dev.up",
      profile: "default",
      timeoutSeconds: 5,
    });
    const objekt = await runTarget({
      worktree: "/w",
      target: "dev.up",
      profile: "objekt",
      timeoutSeconds: 5,
    });
    assertEquals(calls.filter((c) => c[0] === "make"), [
      ["make", "dev.up"],
      ["make", "dev.up", "PROFILE=objekt"],
    ]);
    assertEquals(plain.headSha, SHA);
    assertEquals(plain.profile, null);
    assertEquals(objekt.profile, "objekt");
    assertEquals(plain.succeeded, true);
  } finally {
    resetSpawn();
  }
});

Deno.test("runTarget keeps only the log tail in the result", async () => {
  const output = Array.from({ length: 100 }, (_, i) => `line ${i}`).join("\n") +
    "\n";
  fakeSpawn(() => Promise.resolve({ exitCode: 2, output }));
  try {
    const r = await runTarget({
      worktree: "/w",
      target: "check",
      timeoutSeconds: 5,
    });
    assertEquals(r.succeeded, false);
    assertEquals(r.exitCode, 2);
    assertEquals(r.logTail.length, 40);
    assertEquals(r.logTail.at(-1), "line 99");
    assertEquals(r.logTruncated, true);
    assertEquals(r.output, output);
  } finally {
    resetSpawn();
  }
});

Deno.test("runTarget reports a timeout as a failure", async () => {
  fakeSpawn((_argv, signal) =>
    new Promise((_resolve, reject) => {
      signal?.addEventListener("abort", () => reject(new Error("killed")));
    })
  );
  try {
    const r = await runTarget({
      worktree: "/w",
      target: "verify",
      timeoutSeconds: 0.05,
    });
    assertEquals(r.timedOut, true);
    assertEquals(r.succeeded, false);
  } finally {
    resetSpawn();
  }
});

Deno.test("runTarget refuses a directory that is not a git worktree", async () => {
  setSpawn(() =>
    Promise.resolve({ exitCode: 128, output: "fatal: not a git repository" })
  );
  try {
    await assertRejects(
      () => runTarget({ worktree: "/tmp", target: "check", timeoutSeconds: 5 }),
      Error,
      "not a git worktree",
    );
  } finally {
    resetSpawn();
  }
});

Deno.test("check records result and full log before failing the method", async () => {
  fakeSpawn(() =>
    Promise.resolve({ exitCode: 1, output: "--- FAIL: TestIsolation\n" })
  );
  const { context, resources, files } = fakeContext("check");
  try {
    await assertRejects(
      () => model.methods.check.execute({ timeoutSeconds: 5 }, context),
      Error,
      "make check failed with exit 1",
    );
    assertEquals(resources.check.succeeded, false);
    assertEquals(resources.check.headSha, SHA);
    assertEquals("output" in resources.check, false);
    assertEquals(files["check-log"], "--- FAIL: TestIsolation\n");
  } finally {
    resetSpawn();
  }
});

Deno.test("verify returns data handles on success", async () => {
  fakeSpawn(() => Promise.resolve({ exitCode: 0, output: "PASS\n" }));
  const { context, resources } = fakeContext("verify");
  try {
    const out = await model.methods.verify.execute(
      { timeoutSeconds: 5 },
      context,
    );
    assertEquals(out.dataHandles.map((h) => h.name), ["verify", "verify-log"]);
    assertEquals(resources.verify.target, "verify");
    assertEquals(resources.verify.logTruncated, false);
  } finally {
    resetSpawn();
  }
});

async function gitWorktree(makefile: string): Promise<string> {
  const dir = await Deno.makeTempDir({ prefix: "dev-env-test-" });
  await Deno.writeTextFile(`${dir}/Makefile`, makefile);
  for (
    const args of [
      ["init", "-q"],
      ["add", "Makefile"],
      [
        "-c",
        "commit.gpgsign=false",
        "-c",
        "user.name=t",
        "-c",
        "user.email=t@example.com",
        "commit",
        "-qm",
        "t",
      ],
    ]
  ) {
    const { code } = await new Deno.Command("git", { args, cwd: dir }).output();
    assertEquals(code, 0);
  }
  return dir;
}

Deno.test("real make: output is captured and pinned to the commit", async () => {
  const dir = await gitWorktree(
    "check:\n\t@echo out\n\t@echo err >&2\n\t@exit 3\n",
  );
  try {
    const r = await runTarget({
      worktree: dir,
      target: "check",
      timeoutSeconds: 30,
    });
    assertEquals(r.exitCode, 2); // make exits 2 when a recipe fails
    assertEquals(r.succeeded, false);
    assertEquals(r.headSha.length, 40);
    assertEquals(r.output.includes("out") && r.output.includes("err"), true);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("real make: a grandchild holding the pipes does not hang the run", async () => {
  const dir = await gitWorktree("dev.up:\n\t@echo started\n\t@sleep 60 &\n");
  try {
    const start = Date.now();
    const r = await runTarget({
      worktree: dir,
      target: "dev.up",
      timeoutSeconds: 30,
    });
    assertEquals(r.succeeded, true);
    assertEquals(r.output.includes("started"), true);
    assertEquals(Date.now() - start < 15_000, true);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("real make: timeout kills make and reports it", async () => {
  const dir = await gitWorktree("verify:\n\t@sleep 60\n");
  try {
    const start = Date.now();
    const r = await runTarget({
      worktree: dir,
      target: "verify",
      timeoutSeconds: 1,
    });
    assertEquals(r.timedOut, true);
    assertEquals(r.succeeded, false);
    assertEquals(Date.now() - start < 15_000, true);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
