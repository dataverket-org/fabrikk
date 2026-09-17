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
    codeReview: {
      workItem: "SEN-12",
      cycle: 2,
      recordedAt: "2026-09-17T07:50:00.000Z",
      payload: {
        findings: [
          { id: "SEC-1", severity: "high" as const, resolved: true },
          { id: "OBS-2", severity: "medium" as const },
          { id: "SIM-3", severity: "low" as const },
        ],
      },
    },
    planApproval: {
      workItem: "SEN-12",
      gateId: "plan-approval",
      decision: "approved" as const,
      actor: "beddari",
      cycle: 1,
      decidedAt: "2026-09-16T12:00:00.000Z",
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
  a.planApproval.decision = "rejected";
  a.codeReview.payload.findings.push({ id: "SEC-4", severity: "critical" });
  assertEquals(violations(a), [
    `check: ran at ${OTHER}, not ${HEAD}`,
    "verify: did not succeed (exit 2)",
    `protected paths: digest is of ${OTHER}, not ${HEAD}`,
    "plan approval: rejected by beddari",
    "code review: unresolved SEC-4 (critical)",
  ]);
});

Deno.test("records from another work item or target are violations", () => {
  const a = args();
  a.check.target = "verify";
  a.planApproval.workItem = "SEN-99";
  a.codeReview.workItem = "SEN-99";
  assertEquals(violations(a), [
    "check: record is for make verify",
    "plan approval: belongs to SEN-99",
    "code review: belongs to SEN-99",
  ]);
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
  assertEquals(doc.protectedPaths.changed, ["skills/architecture/SKILL.md"]);
  assertEquals(doc.protectedPaths.unmatched, ["docs/adr/"]);
  assertEquals(doc.attestedAt, "2026-09-17T08:05:00.000Z");
});

Deno.test("write refuses before touching the worktree", async () => {
  const dir = await Deno.makeTempDir();
  const a = args();
  a.verify.headSha = OTHER;
  const written: string[] = [];
  try {
    await assertRejects(
      () =>
        model.methods.write.execute(a, {
          globalArgs: { worktree: dir },
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
    assertEquals([...Deno.readDirSync(dir)], []);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("write puts the document at .fabrikk/attestation.json", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await model.methods.write.execute(args(), {
      globalArgs: { worktree: dir },
      logger: { info: () => {} },
      writeResource: (_s, name) => Promise.resolve({ name }),
    });
    const doc = JSON.parse(
      await Deno.readTextFile(`${dir}/.fabrikk/attestation.json`),
    );
    assertEquals(doc.attestation, "fabrikk/v1");
    assertEquals(doc.headSha, HEAD);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
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
