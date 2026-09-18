import { assertEquals } from "jsr:@std/assert@1.0.13";
import { commitMessages, parseLog } from "./git_commit_messages.ts";

Deno.test("parseLog splits records and keeps multi-line messages", () => {
  const raw = "a".repeat(40) + "\x1fsubject one\x1fsubject one\n\nbody\n\x1e\n" + "b".repeat(40) + "\x1fsubject two\x1fsubject two\n\x1e\n";
  const commits = parseLog(raw);
  assertEquals(commits.length, 2);
  assertEquals(commits[0].subject, "subject one");
  assertEquals(commits[0].message, "subject one\n\nbody\n");
  assertEquals(commits[1].sha, "b".repeat(40));
});

Deno.test("commitMessages lists exactly the branch's commits on a real repository", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const git = async (args: string[]) => {
      const o = await new Deno.Command("git", {
        args: ["-c", "user.name=t", "-c", "user.email=t@example.org", "-c", "commit.gpgsign=false", ...args],
        cwd: dir,
        stdout: "piped",
        stderr: "piped",
      }).output();
      if (o.code !== 0) throw new Error(`git ${args.join(" ")} failed`);
      return new TextDecoder().decode(o.stdout);
    };
    await git(["init", "-q", "-b", "main"]);
    await Deno.writeTextFile(`${dir}/a`, "1\n");
    await git(["add", "a"]);
    await git(["commit", "-q", "-m", "chore: base"]);
    await git(["checkout", "-q", "-b", "work"]);
    await Deno.writeTextFile(`${dir}/a`, "2\n");
    await git(["commit", "-q", "-am", "feat: one\n\nA body."]);
    await Deno.writeTextFile(`${dir}/a`, "3\n");
    await git(["commit", "-q", "-am", "fix: two"]);

    const r = await commitMessages(git, "main", "HEAD");
    assertEquals(r.commitCount, 2);
    assertEquals(r.commits.map((c) => c.subject), ["fix: two", "feat: one"]);
    assertEquals(r.commits[1].message, "feat: one\n\nA body.\n");
    assertEquals(r.headSha, (await git(["rev-parse", "HEAD"])).trim());
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
