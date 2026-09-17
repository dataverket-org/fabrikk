import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.13";
import {
  actionsSecretPut,
  prMergeState,
  type ApiCall,
  type Caller,
  repoRename,
  runnerList,
  runnerRegistrationToken,
  tagProtectionEnsure,
} from "./forgejo_actions.ts";

/** A fake API: replies per `method path`, records every call. */
function fakeApi(
  replies: Record<string, { status: number; body?: Record<string, unknown> | unknown[] }>,
): { api: Caller; calls: ApiCall[] } {
  const calls: ApiCall[] = [];
  const api: Caller = (c) => {
    calls.push(c);
    const r = replies[`${c.method} ${c.path}`];
    if (!r) return Promise.resolve({ status: 404, body: { message: `no reply for ${c.method} ${c.path}` } });
    return Promise.resolve({ status: r.status, body: (r.body ?? {}) as Record<string, unknown> });
  };
  return { api, calls };
}

const TAGS = "/api/v1/repos/dataverket/fabrikk/tag_protections";
const rule = (id: number, users: string[]) => ({
  id,
  name_pattern: "attestation/*",
  whitelist_usernames: users,
  whitelist_teams: [],
});

Deno.test("tagProtectionEnsure creates a missing rule", async () => {
  const { api, calls } = fakeApi({
    [`GET ${TAGS}`]: { status: 200, body: [] },
    [`POST ${TAGS}`]: { status: 201, body: rule(7, ["beddari"]) },
  });
  const info = await tagProtectionEnsure(api, {
    owner: "dataverket",
    name: "fabrikk",
    namePattern: "attestation/*",
    whitelistUsernames: ["beddari"],
    whitelistTeams: [],
  });
  assertEquals(info.action, "created");
  assertEquals(info.id, 7);
  assertEquals(calls[1].body, {
    name_pattern: "attestation/*",
    whitelist_usernames: ["beddari"],
    whitelist_teams: [],
  });
});

Deno.test("tagProtectionEnsure leaves a matching rule unchanged, order-insensitive", async () => {
  const { api, calls } = fakeApi({
    [`GET ${TAGS}`]: { status: 200, body: [rule(7, ["b", "a"])] },
  });
  const info = await tagProtectionEnsure(api, {
    owner: "dataverket",
    name: "fabrikk",
    namePattern: "attestation/*",
    whitelistUsernames: ["a", "b"],
    whitelistTeams: [],
  });
  assertEquals(info.action, "unchanged");
  assertEquals(calls.length, 1);
});

Deno.test("tagProtectionEnsure patches a rule whose whitelist drifted", async () => {
  const { api, calls } = fakeApi({
    [`GET ${TAGS}`]: { status: 200, body: [rule(7, ["someone-else"])] },
    [`PATCH ${TAGS}/7`]: { status: 200, body: rule(7, ["beddari"]) },
  });
  const info = await tagProtectionEnsure(api, {
    owner: "dataverket",
    name: "fabrikk",
    namePattern: "attestation/*",
    whitelistUsernames: ["beddari"],
    whitelistTeams: [],
  });
  assertEquals(info.action, "updated");
  assertEquals(info.whitelistUsernames, ["beddari"]);
  assertEquals(calls[1].method, "PATCH");
});

Deno.test("actionsSecretPut targets the repo or the org and reports created vs updated", async () => {
  const repo = fakeApi({
    ["PUT /api/v1/repos/dataverket/fabrikk/actions/secrets/COSIGN_PASSWORD"]: { status: 201 },
  });
  const created = await actionsSecretPut(repo.api, {
    owner: "dataverket",
    repo: "fabrikk",
    name: "COSIGN_PASSWORD",
    value: "hunter2",
  });
  assertEquals(created, { ...created, scope: "repo", target: "dataverket/fabrikk", action: "created" });
  assertEquals(repo.calls[0].body, { data: "hunter2" });

  const org = fakeApi({
    ["PUT /api/v1/orgs/dataverket/actions/secrets/REGISTRY_PASSWORD"]: { status: 204 },
  });
  const updated = await actionsSecretPut(org.api, {
    owner: "dataverket",
    name: "REGISTRY_PASSWORD",
    value: "x",
  });
  assertEquals(updated.scope, "org");
  assertEquals(updated.action, "updated");
});

Deno.test("runnerRegistrationToken returns the token and refuses an empty one", async () => {
  const ok = fakeApi({
    ["GET /api/v1/orgs/dataverket/actions/runners/registration-token"]: { status: 200, body: { token: "reg-123" } },
  });
  const info = await runnerRegistrationToken(ok.api, { owner: "dataverket" });
  assertEquals(info.token, "reg-123");
  assertEquals(info.scope, "org");

  const empty = fakeApi({
    ["GET /api/v1/repos/dataverket/fabrikk/actions/runners/registration-token"]: { status: 200, body: {} },
  });
  await assertRejects(
    () => runnerRegistrationToken(empty.api, { owner: "dataverket", repo: "fabrikk" }),
    Error,
    "no registration token",
  );
});

Deno.test("runnerList reads both response shapes and classifies scope from ids", async () => {
  const runner = (id: number, extra: Record<string, unknown>) => ({
    id,
    uuid: `u${id}`,
    name: `r${id}`,
    status: "online",
    labels: ["fabrikk-release"],
    ephemeral: false,
    version: "6.3.0",
    owner_id: 0,
    repo_id: 0,
    ...extra,
  });
  const wrapped = fakeApi({
    ["GET /api/v1/orgs/dataverket/actions/runners?visible=true&limit=100"]: {
      status: 200,
      body: { runners: [runner(1, { owner_id: 5 }), runner(2, { repo_id: 9, labels: [{ name: "docker" }] })] },
    },
  });
  const list = await runnerList(wrapped.api, { owner: "dataverket" });
  assertEquals(list.map((r) => [r.name, r.level, r.labels]), [
    ["r1", "org", ["fabrikk-release"]],
    ["r2", "repo", ["docker"]],
  ]);

  const bare = fakeApi({
    ["GET /api/v1/repos/dataverket/fabrikk/actions/runners?visible=true&limit=100"]: {
      status: 200,
      body: [runner(3, {})],
    },
  });
  const one = await runnerList(bare.api, { owner: "dataverket", repo: "fabrikk" });
  assertEquals(one.length, 1);
  assertEquals(one[0].level, "instance");
  assertEquals(one[0].target, "dataverket/fabrikk");
});

Deno.test("HTTP errors carry method, path, status, and the server message", async () => {
  const { api } = fakeApi({
    [`GET ${TAGS}`]: { status: 403, body: { message: "token lacks write:repository" } },
  });
  await assertRejects(
    () =>
      tagProtectionEnsure(api, {
        owner: "dataverket",
        name: "fabrikk",
        namePattern: "attestation/*",
        whitelistUsernames: [],
        whitelistTeams: [],
      }),
    Error,
    "GET /api/v1/repos/dataverket/fabrikk/tag_protections -> HTTP 403: token lacks write:repository",
  );
});


const REPO = (n: string) => `/api/v1/repos/dataverket/${n}`;
const repo = (n: string) => ({ name: n, html_url: `https://forge/dataverket/${n}`, clone_url: `https://forge/dataverket/${n}.git`, ssh_url: `git@forge:dataverket/${n}.git` });

Deno.test("repoRename verifies source and target, then patches the name", async () => {
  const { api, calls } = fakeApi({
    [`GET ${REPO("flux-bootstrap")}`]: { status: 200, body: repo("flux-bootstrap") },
    [`PATCH ${REPO("flux-bootstrap")}`]: { status: 200, body: repo("fabrikk-infra") },
  });
  const info = await repoRename(api, { owner: "dataverket", name: "flux-bootstrap", newName: "fabrikk-infra" });
  assertEquals(info.action, "renamed");
  assertEquals(info.to, "fabrikk-infra");
  assertEquals(info.cloneUrl, "https://forge/dataverket/fabrikk-infra.git");
  assertEquals(calls.map((c) => `${c.method} ${c.path}`), [
    `GET ${REPO("flux-bootstrap")}`,
    `GET ${REPO("fabrikk-infra")}`,
    `PATCH ${REPO("flux-bootstrap")}`,
  ]);
  assertEquals(calls[2].body, { name: "fabrikk-infra" });
});

Deno.test("repoRename refuses a missing source and an occupied target; a redirect does not count", async () => {
  await assertRejects(
    () => repoRename(fakeApi({}).api, { owner: "dataverket", name: "nope", newName: "x" }),
    Error,
    "does not exist",
  );
  const occupied = fakeApi({
    [`GET ${REPO("a")}`]: { status: 200, body: repo("a") },
    [`GET ${REPO("b")}`]: { status: 200, body: repo("b") },
  });
  await assertRejects(
    () => repoRename(occupied.api, { owner: "dataverket", name: "a", newName: "b" }),
    Error,
    "already exists",
  );
  // A GET of the target that answers with the *source* repo is Forgejo following a stale redirect: not occupied.
  const redirect = fakeApi({
    [`GET ${REPO("a")}`]: { status: 200, body: repo("a") },
    [`GET ${REPO("old")}`]: { status: 200, body: repo("a") },
    [`PATCH ${REPO("a")}`]: { status: 200, body: repo("old") },
  });
  const info = await repoRename(redirect.api, { owner: "dataverket", name: "a", newName: "old" });
  assertEquals(info.action, "renamed");
});

Deno.test("repoRename reports unchanged when the name is already the target", async () => {
  const { api, calls } = fakeApi({ [`GET ${REPO("same")}`]: { status: 200, body: repo("same") } });
  const info = await repoRename(api, { owner: "dataverket", name: "same", newName: "same" });
  assertEquals(info.action, "unchanged");
  assertEquals(calls.length, 1);
});

const PR = "/api/v1/repos/dataverket/fabrikk/pulls/5";
const pr = (extra: Record<string, unknown>) => ({
  number: 5,
  html_url: "https://git.dataverket.org/dataverket/fabrikk/pulls/5",
  state: "open",
  head: { ref: "feature", sha: "a".repeat(40) },
  base: { ref: "main" },
  merged: false,
  ...extra,
});

Deno.test("prMergeState reports an open PR without merge fields", async () => {
  const { api } = fakeApi({ [`GET ${PR}`]: { status: 200, body: pr({}) } });
  const info = await prMergeState(api, { owner: "dataverket", name: "fabrikk", index: 5 });
  assertEquals(info.merged, false);
  assertEquals(info.headSha, "a".repeat(40));
  assertEquals(info.mergeSha, undefined);
  assertEquals(info.mergedBy, undefined);
});

Deno.test("prMergeState copies the merge commit, time, and merger once merged", async () => {
  const { api } = fakeApi({
    [`GET ${PR}`]: {
      status: 200,
      body: pr({
        state: "closed",
        merged: true,
        merge_commit_sha: "b".repeat(40),
        merged_at: "2026-09-17T16:30:00Z",
        merged_by: { login: "beddari" },
      }),
    },
  });
  const info = await prMergeState(api, { owner: "dataverket", name: "fabrikk", index: 5 });
  assertEquals(info.merged, true);
  assertEquals(info.mergeSha, "b".repeat(40));
  assertEquals(info.mergedAt, "2026-09-17T16:30:00Z");
  assertEquals(info.mergedBy, "beddari");
  assertEquals(info.url, "https://git.dataverket.org/dataverket/fabrikk/pulls/5");
});

Deno.test("prMergeState refuses a merged PR that reports no merge commit", async () => {
  const { api } = fakeApi({ [`GET ${PR}`]: { status: 200, body: pr({ merged: true, merge_commit_sha: "" }) } });
  await assertRejects(
    () => prMergeState(api, { owner: "dataverket", name: "fabrikk", index: 5 }),
    Error,
    "reports no merge commit",
  );
});
