import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.13";
import {
  model,
  resolveRef,
  setGit,
  syncRepo,
  unlisted,
} from "./reference_repos.ts";

const git = async (cwd: string, args: string[]): Promise<string> => {
  const out = await new Deno.Command("git", {
    args: [
      "-c",
      "commit.gpgsign=false",
      "-c",
      "tag.gpgsign=false",
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@example.com",
      ...args,
    ],
    cwd,
    env: { GIT_TERMINAL_PROMPT: "0" },
  }).output();
  if (out.code !== 0) {
    throw new Error(new TextDecoder().decode(out.stderr));
  }
  return new TextDecoder().decode(out.stdout).trim();
};

/** An upstream with two commits: v1 tagged, main one commit ahead. */
async function upstream(): Promise<{ dir: string; v1: string; main: string }> {
  const dir = await Deno.makeTempDir({ prefix: "upstream-" });
  await git(dir, ["init", "--quiet", "-b", "main"]);
  await Deno.writeTextFile(`${dir}/SPEC.md`, "v1\n");
  await git(dir, ["add", "-A"]);
  await git(dir, ["commit", "-qm", "v1"]);
  await git(dir, ["tag", "-a", "v1.0.0", "-m", "v1"]);
  const v1 = await git(dir, ["rev-parse", "HEAD"]);
  await Deno.writeTextFile(`${dir}/SPEC.md`, "v2\n");
  await git(dir, ["commit", "-qam", "v2"]);
  return { dir, v1, main: await git(dir, ["rev-parse", "HEAD"]) };
}

const repo = (url: string, ref: string) => ({
  name: "spec",
  url,
  ref,
  purpose: "test",
});

Deno.test("syncRepo clones full history: any version can be looked up while ref is checked out", async () => {
  const up = await upstream();
  const root = await Deno.makeTempDir({ prefix: "refs-" });
  const url = `file://${up.dir}`;
  try {
    const first = await syncRepo(
      git,
      root,
      repo(url, "v1.0.0"),
      () => new Date("2026-09-17T09:00:00Z"),
    );
    assertEquals(first.commit, up.v1);
    assertEquals(first.path, `${root}/spec`);
    assertEquals(first.syncedAt, "2026-09-17T09:00:00.000Z");
    assertEquals(await Deno.readTextFile(`${root}/spec/SPEC.md`), "v1\n");
    assertEquals(
      await git(`${root}/spec`, ["rev-parse", "--is-shallow-repository"]),
      "false",
    );
    assertEquals(
      await git(`${root}/spec`, ["show", "origin/main:SPEC.md"]),
      "v2",
    );
    assertEquals(
      await git(`${root}/spec`, ["log", "--format=%s", "origin/main"]),
      "v2\nv1",
    );

    await Deno.writeTextFile(`${root}/spec/SPEC.md`, "edited by an agent\n");
    const second = await syncRepo(git, root, repo(url, "main"));
    assertEquals(second.commit, up.main);
    assertEquals(await Deno.readTextFile(`${root}/spec/SPEC.md`), "v2\n");
    assertEquals(await git(`${root}/spec`, ["show", "v1.0.0:SPEC.md"]), "v1");
  } finally {
    await Deno.remove(up.dir, { recursive: true });
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("resolveRef prefers a tag over a branch of the same name, accepts a commit, rejects the unknown", async () => {
  const up = await upstream();
  const root = await Deno.makeTempDir({ prefix: "refs-" });
  try {
    await git(up.dir, ["branch", "v1.0.0", "main"]);
    await syncRepo(git, root, repo(`file://${up.dir}`, "main"));
    const path = `${root}/spec`;
    assertEquals(await resolveRef(git, path, "v1.0.0"), up.v1);
    assertEquals(await resolveRef(git, path, up.v1), up.v1);
    await assertRejects(
      () => resolveRef(git, path, "no-such-ref"),
      Error,
      "no-such-ref is not a branch, tag, or commit in origin",
    );
  } finally {
    await Deno.remove(up.dir, { recursive: true });
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("syncRepo follows a changed URL", async () => {
  const a = await upstream();
  const b = await upstream();
  const root = await Deno.makeTempDir({ prefix: "refs-" });
  try {
    await syncRepo(git, root, repo(`file://${a.dir}`, "main"));
    const moved = await syncRepo(git, root, repo(`file://${b.dir}`, "main"));
    assertEquals(moved.commit, b.main);
    assertEquals(
      await git(`${root}/spec`, ["remote", "get-url", "origin"]),
      `file://${b.dir}`,
    );
  } finally {
    for (const d of [a.dir, b.dir, root]) {
      await Deno.remove(d, { recursive: true });
    }
  }
});

Deno.test("unlisted reports directories no longer in the list", async () => {
  const root = await Deno.makeTempDir();
  try {
    assertEquals(await unlisted(`${root}/missing`, []), []);
    await Deno.mkdir(`${root}/spec`);
    await Deno.mkdir(`${root}/old`);
    assertEquals(await unlisted(root, [repo("x", "main")]), ["old"]);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("globalArguments reject a Go-visible dir, unsafe names, and duplicates", () => {
  const base = { repos: [repo("x", "main")] };
  assertEquals(model.globalArguments.safeParse(base).data?.dir, "_reference");
  assertEquals(
    model.globalArguments.safeParse({ ...base, dir: "reference" }).success,
    false,
  );
  assertEquals(
    model.globalArguments.safeParse({
      repos: [{ ...repo("x", "main"), name: "../escape" }],
    }).success,
    false,
  );
  assertEquals(
    model.globalArguments.safeParse({
      repos: [repo("x", "main"), repo("y", "main")],
    }).success,
    false,
  );
});

function context(repoDir: string, repos: ReturnType<typeof repo>[]) {
  const written: Record<string, Record<string, unknown>> = {};
  const warnings: string[] = [];
  return {
    written,
    warnings,
    ctx: {
      globalArgs: { dir: "_reference", repos },
      repoDir,
      signal: new AbortController().signal,
      logger: { info: () => {}, warning: (m: string) => warnings.push(m) },
      writeResource: (
        _s: string,
        name: string,
        data: Record<string, unknown>,
      ) => {
        written[name] = data;
        return Promise.resolve({ name });
      },
    },
  };
}

Deno.test("sync records the repos that succeeded and fails naming the ones that did not", async () => {
  const up = await upstream();
  const repoDir = await Deno.makeTempDir();
  const good = repo(`file://${up.dir}`, "main");
  const bad = { ...repo(`file://${up.dir}`, "no-such-ref"), name: "broken" };
  const { ctx, written } = context(repoDir, [good, bad]);
  setGit(git);
  try {
    await assertRejects(
      () => model.methods.sync.execute({}, ctx),
      Error,
      "1 of 2 reference repos failed to sync:\n- broken:",
    );
    assertEquals(Object.keys(written), ["spec"]);
    assertEquals(written.spec.commit, up.main);
  } finally {
    setGit(undefined);
    await Deno.remove(up.dir, { recursive: true });
    await Deno.remove(repoDir, { recursive: true });
  }
});

Deno.test("sync refuses names that are not in the list before touching anything", async () => {
  const repoDir = await Deno.makeTempDir();
  const { ctx } = context(repoDir, [repo("file:///nowhere", "main")]);
  let calls = 0;
  setGit(() => {
    calls++;
    return Promise.resolve("");
  });
  try {
    await assertRejects(
      () => model.methods.sync.execute({ names: ["zitadel"] }, ctx),
      Error,
      "not in the reference list: zitadel",
    );
    assertEquals(calls, 0);
  } finally {
    setGit(undefined);
    await Deno.remove(repoDir, { recursive: true });
  }
});
