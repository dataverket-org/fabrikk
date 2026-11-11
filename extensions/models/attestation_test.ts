import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.13";
import {
  buildAttestation,
  model,
  violations,
  type WriteArgs,
} from "./attestation.ts";
import {
  parseLsTree,
  PATHS_DIGEST_RECIPE,
  pathsDigest,
  unmatchedPaths,
} from "./git_paths_digest.ts";

const HEAD = "0123456789abcdef0123456789abcdef01234567";
const OTHER = "fedcba9876543210fedcba9876543210fedcba98";

function args(): WriteArgs {
  const run = (target: string) => ({
    target,
    headSha: HEAD,
    succeeded: true,
    exitCode: 0,
    durationMs: 1200,
    finishedAt: "2026-09-17T08:00:00.000Z",
  });
  return {
    workItem: "SEN-12",
    branch: "sen-12-tenant-onboarding",
    headSha: HEAD,
    base: "main",
    check: run("check"),
    verify: run("verify"),
    era: "era-1",
    approvals: [{
      gateId: "plan-approval",
      decision: "approve" as "approve" | "decline",
      era: "era-1",
      cycle: 1,
      at: "2026-09-16T12:00:00.000Z",
      actor: { principal: "user:someone", asserted: "beddari" },
      products: { artifacts: { plan: { version: 2 } } },
    }],
    products: {
      plan: { version: 2, cycle: 2, at: "2026-09-16T11:00:00.000Z" },
      "change-summary": {
        version: 3,
        cycle: 2,
        at: "2026-09-17T07:40:00.000Z",
      },
      "code-review": {
        version: 2,
        cycle: 2,
        at: "2026-09-17T07:50:00.000Z",
        subject: { name: "change-summary", version: 3 },
      },
    } as WriteArgs["products"],
    changeSummary: { commit: HEAD },
    codeReview: {
      findings: [
        { id: "1-1", severity: "high" as const, resolved: true },
        { id: "1-2", severity: "medium" as const },
        { id: "1-3", severity: "low" as const },
      ] as WriteArgs["codeReview"]["findings"],
    },
    protectedPaths: {
      commitSha: HEAD,
      paths: ["skills/", "docs/adr/"],
      unmatched: ["docs/adr/"],
      algorithm: "sha256" as const,
      fileCount: 8,
      sha256: "a".repeat(64),
    },
    protectedPathsChanged: [] as string[],
  };
}

Deno.test("a consistent set of records attests with no violations", () => {
  assertEquals(violations(args()), []);
});

Deno.test("every record that is not about headSha, or not green, is a violation", () => {
  const a = args();
  a.check.headSha = OTHER;
  a.verify.succeeded = false;
  a.verify.exitCode = 2;
  a.protectedPaths.commitSha = OTHER;
  a.changeSummary.commit = OTHER;
  a.approvals[0].decision = "decline";
  a.codeReview.findings.push({ id: "1-4", severity: "critical" });
  assertEquals(violations(a), [
    `check: ran at ${OTHER}, not ${HEAD}`,
    "verify: did not succeed (exit 2)",
    `protected paths: digest is of ${OTHER}, not ${HEAD}`,
    `change summary: names ${OTHER}, not ${HEAD}`,
    "plan approval: declined by beddari",
    "code review: unresolved 1-4 (critical)",
  ]);
});

Deno.test("a record for another task, plan, change or era is a violation", () => {
  const a = args();
  a.check.target = "verify";
  a.products["plan"].version = 3;
  a.products["change-summary"].version = 4;
  assertEquals(violations(a), [
    "check: record is for task verify",
    "plan approval: covers plan version 2, not the current 3",
    "code review: is not of the current change summary",
  ]);

  const b = args();
  b.era = "era-2";
  delete b.products["code-review"];
  assertEquals(violations(b), [
    "plan approval: none recorded",
    "code review: none recorded",
  ]);
});

Deno.test("the latest decision on the plan is the one that counts", () => {
  const a = args();
  a.approvals.unshift({ ...a.approvals[0], decision: "decline" });
  assertEquals(violations(a), []);
  a.approvals.push({ ...a.approvals[1], decision: "decline" });
  assertEquals(violations(a), ["plan approval: declined by beddari"]);
});

Deno.test("the document counts unresolved findings and records changed protected paths", () => {
  const a = args();
  a.protectedPathsChanged = ["skills/architecture/SKILL.md"];
  const doc = buildAttestation(a, new Date("2026-09-17T08:05:00Z"));
  assertEquals(doc.codeReview.unresolved, {
    critical: 0,
    high: 0,
    medium: 1,
    low: 1,
  });
  assertEquals(doc.planApproval, {
    actor: "beddari",
    cycle: 1,
    decidedAt: "2026-09-16T12:00:00.000Z",
  });
  assertEquals(doc.codeReview.cycle, 2);
  assertEquals(doc.codeReview.recordedAt, "2026-09-17T07:50:00.000Z");
  assertEquals(doc.protectedPaths.changed, ["skills/architecture/SKILL.md"]);
  assertEquals(doc.protectedPaths.unmatched, ["docs/adr/"]);
  assertEquals(doc.attestedAt, "2026-09-17T08:05:00.000Z");
});

/**
 * A repository with one commit and SSH tag signing configured locally, isolated
 * from the user's global git config (no hardware key prompts).
 */
async function signingRepo(): Promise<{ dir: string; head: string }> {
  const dir = await Deno.makeTempDir({ prefix: "attest-tag-" });
  const run = async (cmd: string, args: string[]) => {
    const out = await new Deno.Command(cmd, { args, cwd: dir }).output();
    assertEquals(out.code, 0, new TextDecoder().decode(out.stderr));
    return new TextDecoder().decode(out.stdout).trim();
  };
  await run("ssh-keygen", [
    "-q",
    "-t",
    "ed25519",
    "-N",
    "",
    "-C",
    "attester",
    "-f",
    `${dir}/key`,
  ]);
  const pub = (await Deno.readTextFile(`${dir}/key.pub`)).trim();
  await Deno.writeTextFile(
    `${dir}/allowed_signers`,
    `attester@example.com namespaces="git" ${pub}\n`,
  );
  await run("git", ["init", "-q", `${dir}/repo`]);
  for (
    const [k, v] of [
      ["user.name", "attester"],
      ["user.email", "attester@example.com"],
      ["gpg.format", "ssh"],
      ["gpg.ssh.program", "ssh-keygen"],
      ["user.signingkey", `${dir}/key`],
      ["gpg.ssh.allowedSignersFile", `${dir}/allowed_signers`],
      ["commit.gpgsign", "false"],
    ]
  ) await run("git", ["-C", `${dir}/repo`, "config", k, v]);
  await Deno.writeTextFile(`${dir}/repo/main.go`, "package main\n");
  await run("git", ["-C", `${dir}/repo`, "add", "-A"]);
  await run("git", ["-C", `${dir}/repo`, "commit", "-qm", "feat: x"]);
  return {
    dir,
    head: await run("git", ["-C", `${dir}/repo`, "rev-parse", "HEAD"]),
  };
}

async function withIsolatedGit(fn: () => Promise<void>) {
  const previous = Deno.env.get("GIT_CONFIG_GLOBAL");
  Deno.env.set("GIT_CONFIG_GLOBAL", "/dev/null");
  try {
    await fn();
  } finally {
    if (previous === undefined) Deno.env.delete("GIT_CONFIG_GLOBAL");
    else Deno.env.set("GIT_CONFIG_GLOBAL", previous);
  }
}

const gitOut = async (cwd: string, ...args: string[]) => {
  const out = await new Deno.Command("git", { args, cwd }).output();
  return {
    code: out.code,
    stdout: new TextDecoder().decode(out.stdout),
    stderr: new TextDecoder().decode(out.stderr),
  };
};

Deno.test("tag refuses before creating anything", async () => {
  await withIsolatedGit(async () => {
    const { dir, head } = await signingRepo();
    const a = args();
    a.headSha = head;
    a.check.headSha = head;
    a.verify.headSha = OTHER;
    a.protectedPaths.commitSha = head;
    a.changeSummary.commit = head;
    const written: string[] = [];
    try {
      await assertRejects(
        () =>
          model.methods.tag.execute(a, {
            globalArgs: { worktree: `${dir}/repo` },
            logger: { info: () => {} },
            writeResource: (_s, name) => {
              written.push(name);
              return Promise.resolve({ name });
            },
          }),
        Error,
        "refusing to attest SEN-12",
      );
      assertEquals(written, []);
      assertEquals((await gitOut(`${dir}/repo`, "tag", "--list")).stdout, "");
    } finally {
      await Deno.remove(dir, { recursive: true });
    }
  });
});

Deno.test("tag signs attestation/<headSha> on headSha; CI can verify it and read the JSON back", async () => {
  await withIsolatedGit(async () => {
    const { dir, head } = await signingRepo();
    const repo = `${dir}/repo`;
    const a = args();
    a.headSha = head;
    a.check.headSha = head;
    a.verify.headSha = head;
    a.protectedPaths.commitSha = head;
    a.changeSummary.commit = head;
    const written: Record<string, Record<string, unknown>> = {};
    try {
      await model.methods.tag.execute(a, {
        globalArgs: { worktree: repo },
        logger: { info: () => {} },
        writeResource: (_s, name, data) => {
          written[name] = data;
          return Promise.resolve({ name });
        },
      });
      const tag = `attestation/${head}`;
      assertEquals(written.attestation.tag, tag);
      assertEquals((await gitOut(repo, "tag", "-v", tag)).code, 0);
      assertEquals(
        (await gitOut(repo, "rev-parse", `${tag}^{commit}`)).stdout.trim(),
        head,
      );
      const body = (await gitOut(
        repo,
        "for-each-ref",
        `refs/tags/${tag}`,
        "--format=%(contents:body)",
      )).stdout;
      const doc = JSON.parse(body);
      assertEquals(doc.attestation, "fabrikk/v1");
      assertEquals(doc.headSha, head);
      assertEquals(doc, written.attestation.attestation);
      assertEquals((await gitOut(repo, "status", "--porcelain")).stdout, "");
    } finally {
      await Deno.remove(dir, { recursive: true });
    }
  });
});

Deno.test("a tag signed by a key that is not an allowed attester fails verification", async () => {
  await withIsolatedGit(async () => {
    const { dir, head } = await signingRepo();
    const repo = `${dir}/repo`;
    const a = args();
    a.headSha = head;
    a.check.headSha = head;
    a.verify.headSha = head;
    a.protectedPaths.commitSha = head;
    a.changeSummary.commit = head;
    try {
      await model.methods.tag.execute(a, {
        globalArgs: { worktree: repo },
        logger: { info: () => {} },
        writeResource: (_s, name) => Promise.resolve({ name }),
      });
      await Deno.writeTextFile(
        `${dir}/allowed_signers`,
        'someone@example.com namespaces="git" ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl\n',
      );
      assertEquals(
        (await gitOut(repo, "tag", "-v", `attestation/${head}`)).code === 0,
        false,
      );
    } finally {
      await Deno.remove(dir, { recursive: true });
    }
  });
});

Deno.test("parseLsTree keeps blobs, including symlinks, and paths with spaces", () => {
  const raw = new TextEncoder().encode(
    "100644 blob aaa\tskills/a b.md\0" +
      "120000 blob bbb\tskills/link\0" +
      "160000 commit ccc\tvendor/sub\0",
  );
  assertEquals(parseLsTree(raw), [
    { oid: "aaa", path: "skills/a b.md" },
    { oid: "bbb", path: "skills/link" },
  ]);
  assertEquals(
    unmatchedPaths(["skills/", "CLAUDE.md", "docs/adr/"], parseLsTree(raw)),
    ["CLAUDE.md", "docs/adr/"],
  );
});

async function git(cwd: string, ...args: string[]): Promise<string> {
  const out = await new Deno.Command("git", {
    args: [
      "-c",
      "commit.gpgsign=false",
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@example.com",
      ...args,
    ],
    cwd,
  }).output();
  assertEquals(out.code, 0, new TextDecoder().decode(out.stderr));
  return new TextDecoder().decode(out.stdout).trim();
}

Deno.test("pathsDigest matches the documented shell recipe on a real repository", async () => {
  const dir = await Deno.makeTempDir({ prefix: "paths-digest-" });
  try {
    await git(dir, "init", "-q");
    await Deno.mkdir(`${dir}/skills/architecture`, { recursive: true });
    await Deno.writeTextFile(
      `${dir}/skills/architecture/SKILL.md`,
      "# architecture\n",
    );
    await Deno.writeTextFile(`${dir}/skills/with space.md`, "spaced\n");
    await Deno.writeTextFile(`${dir}/skills/ærlig.md`, "non-ascii\n");
    await Deno.symlink("architecture/SKILL.md", `${dir}/skills/link`);
    await Deno.writeTextFile(`${dir}/CLAUDE.md`, "# rules\n");
    await Deno.writeTextFile(`${dir}/main.go`, "package main\n");
    await git(dir, "add", "-A");
    await git(dir, "commit", "-qm", "init");
    const sha = await git(dir, "rev-parse", "HEAD");

    const paths = ["skills/", "CLAUDE.md", "docs/adr/"];
    const rawGit = async (a: string[]) =>
      (await new Deno.Command("git", { args: a, cwd: dir }).output()).stdout;
    const result = await pathsDigest(rawGit, "HEAD", paths);
    const shell = await new Deno.Command("bash", {
      args: ["-c", PATHS_DIGEST_RECIPE],
      cwd: dir,
      env: { SHA: sha, PATHS: paths.join(" ") },
    }).output();

    assertEquals(result.commitSha, sha);
    assertEquals(result.fileCount, 5);
    assertEquals(result.unmatched, ["docs/adr/"]);
    assertEquals(result.sha256, new TextDecoder().decode(shell.stdout).trim());
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
