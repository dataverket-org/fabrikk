import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.13";
import {
  type ApiCall,
  type Caller,
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
