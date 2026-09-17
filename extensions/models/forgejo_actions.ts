/**
 * Adds to `@thomas/forgejo` the three release-infrastructure actions the
 * factory needs that the upstream model does not cover: a tag protection rule
 * (who may push `attestation/*`), Actions secrets (cosign key, registry
 * credentials; write-only), and a runner registration token (handed to
 * `forgejo-runner register` on the runner host).
 *
 * Same conventions as upstream: find-or-create, no delete methods, no secret
 * value is ever recorded or logged. The registration token is the one secret
 * this file produces; it is marked sensitive so swamp stores it in the vault
 * and records a reference, never the value.
 *
 * @module
 */
import { z } from "npm:zod@4";

/** One REST request against `apiUrl`. */
export interface ApiCall {
  method: "GET" | "POST" | "PATCH" | "PUT";
  path: string;
  body?: unknown;
}

/** Status plus parsed JSON body (`{}` when empty). */
export interface ApiResult {
  status: number;
  body: Record<string, unknown>;
}

/** The authenticated-call seam; swapped for a fake in tests. */
export type Caller = (call: ApiCall) => Promise<ApiResult>;

interface GlobalArgs {
  apiUrl: string;
  token: string;
  httpTimeoutMs?: number;
}

function fetchCaller(g: GlobalArgs, signal?: AbortSignal): Caller {
  return async (c) => {
    const headers: Record<string, string> = {
      authorization: `token ${g.token}`,
      accept: "application/json",
    };
    let body: string | undefined;
    if (c.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(c.body);
    }
    const ctrl = new AbortController();
    const abort = () => ctrl.abort();
    signal?.addEventListener("abort", abort);
    const timer = setTimeout(abort, g.httpTimeoutMs ?? 30000);
    try {
      const res = await fetch(`${g.apiUrl.replace(/\/+$/, "")}${c.path}`, {
        method: c.method,
        headers,
        body,
        signal: ctrl.signal,
      });
      const text = await res.text();
      let parsed: Record<string, unknown> = {};
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { raw: text };
        }
      }
      return { status: res.status, body: parsed };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  };
}

async function call(api: Caller, c: ApiCall): Promise<ApiResult> {
  const r = await api(c);
  if (r.status >= 400) {
    const b = r.body;
    const msg = typeof b.message === "string"
      ? b.message
      : typeof b.raw === "string"
      ? b.raw
      : JSON.stringify(b);
    throw new Error(`Forgejo API ${c.method} ${c.path} -> HTTP ${r.status}: ${msg}`);
  }
  return r;
}

const enc = encodeURIComponent;
const repoPath = (owner: string, repo: string) => `/api/v1/repos/${enc(owner)}/${enc(repo)}`;
/** Repo-scoped when `repo` is given, else org-scoped. */
const actionsPath = (owner: string, repo?: string) =>
  repo ? `${repoPath(owner, repo)}/actions` : `/api/v1/orgs/${enc(owner)}/actions`;
const safeName = (s: string) => s.replace(/[\\/]/g, ":");
const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
const strings = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

// ─────────────────────────── tag protection ───────────────────────────

const TagProtectionEnsureArgs = z.object({
  owner: z.string().min(1).describe("Owning org or user login."),
  name: z.string().min(1).describe("Repository name."),
  namePattern: z.string().min(1).describe(
    "Tag glob the rule applies to (find-or-create key), e.g. attestation/*.",
  ),
  whitelistUsernames: z.array(z.string().min(1)).default([]).describe(
    "Logins allowed to create or delete matching tags. Converged as an exact set; empty means nobody.",
  ),
  whitelistTeams: z.array(z.string().min(1)).default([]).describe(
    "Org teams allowed to create or delete matching tags. Converged as an exact set.",
  ),
});

const TagProtectionInfo = z.object({
  repo: z.string(),
  id: z.number().int(),
  namePattern: z.string(),
  whitelistUsernames: z.array(z.string()),
  whitelistTeams: z.array(z.string()),
  action: z.enum(["created", "updated", "unchanged"]),
  timestamp: z.string(),
});

/** Find-or-create a tag protection rule and converge its whitelists. */
export async function tagProtectionEnsure(
  api: Caller,
  a: z.infer<typeof TagProtectionEnsureArgs>,
): Promise<z.infer<typeof TagProtectionInfo>> {
  const base = `${repoPath(a.owner, a.name)}/tag_protections`;
  const existing = (await call(api, { method: "GET", path: base })).body;
  const rules = Array.isArray(existing) ? existing as Record<string, unknown>[] : [];
  const found = rules.find((r) => r.name_pattern === a.namePattern);
  const body = {
    name_pattern: a.namePattern,
    whitelist_usernames: a.whitelistUsernames,
    whitelist_teams: a.whitelistTeams,
  };
  let rule: Record<string, unknown>;
  let action: "created" | "updated" | "unchanged";
  if (!found) {
    rule = (await call(api, { method: "POST", path: base, body })).body;
    action = "created";
  } else if (
    sameSet(strings(found.whitelist_usernames), a.whitelistUsernames) &&
    sameSet(strings(found.whitelist_teams), a.whitelistTeams)
  ) {
    rule = found;
    action = "unchanged";
  } else {
    rule = (await call(api, { method: "PATCH", path: `${base}/${found.id}`, body })).body;
    action = "updated";
  }
  return {
    repo: `${a.owner}/${a.name}`,
    id: Number(rule.id),
    namePattern: String(rule.name_pattern),
    whitelistUsernames: strings(rule.whitelist_usernames),
    whitelistTeams: strings(rule.whitelist_teams),
    action,
    timestamp: new Date().toISOString(),
  };
}

// ─────────────────────────── Actions secrets ───────────────────────────

const ActionsSecretPutArgs = z.object({
  owner: z.string().min(1).describe("Org login (org-scoped secret) or repo owner."),
  repo: z.string().min(1).optional().describe(
    "Repository name for a repo-scoped secret; omit for an org-scoped one.",
  ),
  name: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).describe(
    "Secret name as the workflow reads it, e.g. COSIGN_PRIVATE_KEY.",
  ),
  value: z.string().min(1).meta({ sensitive: true }).describe(
    "Secret value. Supply via vault: ${{ vault.get(<vault>, <key>) }}. Never recorded.",
  ),
});

const ActionsSecretInfo = z.object({
  scope: z.enum(["repo", "org"]),
  target: z.string(),
  name: z.string(),
  action: z.enum(["created", "updated"]),
  timestamp: z.string(),
});

/** Create or update an Actions secret; records the name and scope only. */
export async function actionsSecretPut(
  api: Caller,
  a: z.infer<typeof ActionsSecretPutArgs>,
): Promise<z.infer<typeof ActionsSecretInfo>> {
  const r = await call(api, {
    method: "PUT",
    path: `${actionsPath(a.owner, a.repo)}/secrets/${enc(a.name)}`,
    body: { data: a.value },
  });
  return {
    scope: a.repo ? "repo" : "org",
    target: a.repo ? `${a.owner}/${a.repo}` : a.owner,
    name: a.name,
    action: r.status === 201 ? "created" : "updated",
    timestamp: new Date().toISOString(),
  };
}

// ─────────────────────────── runner registration ───────────────────────────

const RunnerRegistrationTokenArgs = z.object({
  owner: z.string().min(1).describe("Org login (org-wide runner) or repo owner."),
  repo: z.string().min(1).optional().describe(
    "Repository name for a repo-scoped runner; omit for an org-wide one.",
  ),
});

const RunnerRegistrationInfo = z.object({
  scope: z.enum(["repo", "org"]),
  target: z.string(),
  token: z.string().meta({ sensitive: true }),
  timestamp: z.string(),
});

/** Fetch a registration token for `forgejo-runner register`. */
export async function runnerRegistrationToken(
  api: Caller,
  a: z.infer<typeof RunnerRegistrationTokenArgs>,
): Promise<z.infer<typeof RunnerRegistrationInfo>> {
  const r = await call(api, {
    method: "GET",
    path: `${actionsPath(a.owner, a.repo)}/runners/registration-token`,
  });
  if (typeof r.body.token !== "string" || r.body.token.length === 0) {
    throw new Error("Forgejo returned no registration token");
  }
  return {
    scope: a.repo ? "repo" : "org",
    target: a.repo ? `${a.owner}/${a.repo}` : a.owner,
    token: r.body.token,
    timestamp: new Date().toISOString(),
  };
}

// ─────────────────────────── runner list ───────────────────────────

const RunnerListArgs = z.object({
  owner: z.string().min(1).describe("Org login (org scope) or repo owner."),
  repo: z.string().min(1).optional().describe(
    "Repository name to list the runners visible to that repository; omit for the org's.",
  ),
});

const RunnerInfo = z.object({
  target: z.string(),
  id: z.number().int(),
  uuid: z.string(),
  name: z.string(),
  status: z.string(),
  labels: z.array(z.string()),
  ephemeral: z.boolean(),
  version: z.string(),
  level: z.enum(["instance", "org", "repo"]),
  action: z.literal("observed"),
  timestamp: z.string(),
});

/** Runners visible at a scope: name, status, and labels. Read-only. */
export async function runnerList(
  api: Caller,
  a: z.infer<typeof RunnerListArgs>,
): Promise<z.infer<typeof RunnerInfo>[]> {
  const r = await call(api, {
    method: "GET",
    path: `${actionsPath(a.owner, a.repo)}/runners?visible=true&limit=100`,
  });
  const items = Array.isArray(r.body)
    ? r.body
    : Array.isArray(r.body.runners)
    ? r.body.runners
    : [];
  const target = a.repo ? `${a.owner}/${a.repo}` : a.owner;
  const timestamp = new Date().toISOString();
  return (items as Record<string, unknown>[]).map((x) => ({
    target,
    id: Number(x.id),
    uuid: String(x.uuid ?? ""),
    name: String(x.name ?? ""),
    status: String(x.status ?? ""),
    labels: strings(x.labels).length
      ? strings(x.labels)
      : (Array.isArray(x.labels)
        ? (x.labels as Record<string, unknown>[]).map((l) => String(l.name ?? l))
        : []),
    ephemeral: x.ephemeral === true,
    version: String(x.version ?? ""),
    level: Number(x.repo_id) > 0 ? "repo" : Number(x.owner_id) > 0 ? "org" : "instance",
    action: "observed" as const,
    timestamp,
  }));
}

// ─────────────────────────── extension ───────────────────────────

interface Ctx {
  globalArgs: GlobalArgs;
  signal: AbortSignal;
  logger: { info(msg: string, props?: Record<string, unknown>): void };
  writeResource: (
    specName: string,
    name: string,
    data: Record<string, unknown>,
  ) => Promise<{ name: string }>;
}

/** Extension adding tag protection, Actions secrets, and runner registration to @thomas/forgejo. */
export const extension = {
  type: "@thomas/forgejo",
  resources: {
    tagProtection: {
      description: "A tag protection rule: the pattern and who may push matching tags.",
      schema: TagProtectionInfo,
      lifetime: "infinite" as const,
      garbageCollection: 20,
    },
    actionsSecret: {
      description: "An Actions secret's name and scope. Never the value.",
      schema: ActionsSecretInfo,
      lifetime: "infinite" as const,
      garbageCollection: 20,
    },
    runnerRegistration: {
      description: "A runner registration token, stored in the vault; the record holds a reference.",
      schema: RunnerRegistrationInfo,
      lifetime: "infinite" as const,
      garbageCollection: 5,
      vaultName: "fabrikk",
    },
    runner: {
      description: "A registered Actions runner: name, online/offline status, labels, and scope.",
      schema: RunnerInfo,
      lifetime: "infinite" as const,
      garbageCollection: 20,
    },
  },
  methods: [{
    runner_list: {
      description:
        "List the Actions runners visible to a repository or an organization, with status and labels (factory). " +
        "Read-only.",
      arguments: RunnerListArgs,
      execute: async (args: z.infer<typeof RunnerListArgs>, context: Ctx) => {
        const a = RunnerListArgs.parse(args);
        const runners = await runnerList(fetchCaller(context.globalArgs, context.signal), a);
        context.logger.info("{count} runner(s) visible to {target}", {
          count: runners.length,
          target: a.repo ? `${a.owner}/${a.repo}` : a.owner,
        });
        const dataHandles = [];
        for (const r of runners) {
          dataHandles.push(
            await context.writeResource("runner", safeName(`${r.target}:runner:${r.name || r.id}`), r),
          );
        }
        return { dataHandles };
      },
    },
    tag_protection_ensure: {
      description:
        "Find-or-create a tag protection rule for a tag glob and converge who may push matching tags. " +
        "Idempotent — reports created/updated/unchanged. Never deletes a rule.",
      arguments: TagProtectionEnsureArgs,
      execute: async (args: z.infer<typeof TagProtectionEnsureArgs>, context: Ctx) => {
        const a = TagProtectionEnsureArgs.parse(args);
        context.logger.info("Ensuring tag protection {pattern} on {repo}", {
          pattern: a.namePattern,
          repo: `${a.owner}/${a.name}`,
        });
        const info = await tagProtectionEnsure(fetchCaller(context.globalArgs, context.signal), a);
        context.logger.info("Tag protection {pattern}: {action}", { pattern: info.namePattern, action: info.action });
        const handle = await context.writeResource(
          "tagProtection",
          safeName(`${info.repo}:${info.namePattern}`),
          info,
        );
        return { dataHandles: [handle] };
      },
    },
    actions_secret_put: {
      description:
        "Create or update an Actions secret on a repository or an organization. Write-only: the value comes " +
        "from a vault reference and is never recorded or logged.",
      arguments: ActionsSecretPutArgs,
      execute: async (args: z.infer<typeof ActionsSecretPutArgs>, context: Ctx) => {
        const a = ActionsSecretPutArgs.parse(args);
        context.logger.info("Putting Actions secret {name} on {target}", {
          name: a.name,
          target: a.repo ? `${a.owner}/${a.repo}` : a.owner,
        });
        const info = await actionsSecretPut(fetchCaller(context.globalArgs, context.signal), a);
        context.logger.info("Actions secret {name}: {action}", { name: info.name, action: info.action });
        const handle = await context.writeResource(
          "actionsSecret",
          safeName(`${info.target}:${info.name}`),
          info,
        );
        return { dataHandles: [handle] };
      },
    },
    runner_registration_token: {
      description:
        "Fetch a registration token for a repository or organization runner, for `forgejo-runner register` " +
        "on the runner host. The token is stored in the vault; read it with `swamp vault read-secret`.",
      arguments: RunnerRegistrationTokenArgs,
      execute: async (args: z.infer<typeof RunnerRegistrationTokenArgs>, context: Ctx) => {
        const a = RunnerRegistrationTokenArgs.parse(args);
        context.logger.info("Fetching runner registration token for {target}", {
          target: a.repo ? `${a.owner}/${a.repo}` : a.owner,
        });
        const info = await runnerRegistrationToken(fetchCaller(context.globalArgs, context.signal), a);
        const handle = await context.writeResource(
          "runnerRegistration",
          safeName(`${info.target}:runner`),
          info,
        );
        return { dataHandles: [handle] };
      },
    },
  }],
};
