import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.13";
import {
  type ApiCall,
  type Caller,
  prMergeState,
  tagProtectionEnsure,
} from "./forgejo_actions.ts";

/** A fake API: replies per `method path`, records every call. */
function fakeApi(
  replies: Record<
    string,
    { status: number; body?: Record<string, unknown> | unknown[] }
  >,
): { api: Caller; calls: ApiCall[] } {
  const calls: ApiCall[] = [];
  const api: Caller = (c) => {
    calls.push(c);
    const r = replies[`${c.method} ${c.path}`];
    if (!r) {
      return Promise.resolve({
        status: 404,
        body: { message: `no reply for ${c.method} ${c.path}` },
      });
    }
    return Promise.resolve({
      status: r.status,
      body: (r.body ?? {}) as Record<string, unknown>,
    });
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

Deno.test("HTTP errors carry method, path, status, and the server message", async () => {
  const { api } = fakeApi({
    [`GET ${TAGS}`]: {
      status: 403,
      body: { message: "token lacks write:repository" },
    },
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
const repo = (n: string) => ({
  name: n,
  html_url: `https://forge/dataverket/${n}`,
  clone_url: `https://forge/dataverket/${n}.git`,
  ssh_url: `git@forge:dataverket/${n}.git`,
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
  const info = await prMergeState(api, {
    owner: "dataverket",
    name: "fabrikk",
    index: 5,
  });
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
  const info = await prMergeState(api, {
    owner: "dataverket",
    name: "fabrikk",
    index: 5,
  });
  assertEquals(info.merged, true);
  assertEquals(info.mergeSha, "b".repeat(40));
  assertEquals(info.mergedAt, "2026-09-17T16:30:00Z");
  assertEquals(info.mergedBy, "beddari");
  assertEquals(
    info.url,
    "https://git.dataverket.org/dataverket/fabrikk/pulls/5",
  );
});

Deno.test("prMergeState refuses a merged PR that reports no merge commit", async () => {
  const { api } = fakeApi({
    [`GET ${PR}`]: {
      status: 200,
      body: pr({ merged: true, merge_commit_sha: "" }),
    },
  });
  await assertRejects(
    () => prMergeState(api, { owner: "dataverket", name: "fabrikk", index: 5 }),
    Error,
    "reports no merge commit",
  );
});
