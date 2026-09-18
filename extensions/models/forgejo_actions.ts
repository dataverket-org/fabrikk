/**
 * Adds to `@thomas/forgejo` what the factory needs that the upstream model
 * does not cover: a tag protection rule (who may push `attestation/*`, the
 * forge-side half of `.forgejo/attesters`) and the merge state of a pull
 * request (the merge commit, which upstream's `pr_get` drops) for the
 * factory's `merge` evidence.
 *
 * Same conventions as upstream: find-or-create, nothing deleted, no secret
 * value recorded or logged. Forge operations that reach beyond this
 * repository (runners, Actions secrets, renames) live in fabrikk-infra's
 * swamp, not here: the factory holds a repository-scoped token and no more.
 *
 * @module
 */
import { z } from "npm:zod@4";

/** One REST request against `apiUrl`. */
export interface ApiCall {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
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
    throw new Error(
      `Forgejo API ${c.method} ${c.path} -> HTTP ${r.status}: ${msg}`,
    );
  }
  return r;
}

const enc = encodeURIComponent;
const repoPath = (owner: string, repo: string) =>
  `/api/v1/repos/${enc(owner)}/${enc(repo)}`;
const safeName = (s: string) => s.replace(/[\\/]/g, ":");
const sameSet = (a: string[], b: string[]) =>
  a.length === b.length &&
  [...a].sort().every((v, i) => v === [...b].sort()[i]);
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

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
  const rules = Array.isArray(existing)
    ? existing as Record<string, unknown>[]
    : [];
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
    rule =
      (await call(api, { method: "PATCH", path: `${base}/${found.id}`, body }))
        .body;
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

const PrMergeStateArgs = z.object({
  owner: z.string().min(1).describe("Owning org or user login."),
  name: z.string().min(1).describe("Repository name."),
  index: z.coerce.number().int().positive().describe(
    "PR number within the repo.",
  ),
});

const PrMergeStateInfo = z.object({
  repo: z.string(),
  index: z.number().int(),
  url: z.string(),
  state: z.string(),
  merged: z.boolean(),
  headSha: z.string(),
  base: z.string(),
  mergeSha: z.string().optional().describe(
    "The commit on the base branch; present only once merged.",
  ),
  mergedAt: z.string().optional(),
  mergedBy: z.string().optional(),
  action: z.literal("observed"),
  timestamp: z.string(),
});

/**
 * Read a pull request's merge state as the server reports it: the PR head, and
 * once merged, the merge commit, when, and by whom. The factory's `merge`
 * evidence copies these fields; nothing here comes from memory.
 */
export async function prMergeState(
  api: Caller,
  a: z.infer<typeof PrMergeStateArgs>,
): Promise<z.infer<typeof PrMergeStateInfo>> {
  const pr = (await call(api, {
    method: "GET",
    path: `${repoPath(a.owner, a.name)}/pulls/${a.index}`,
  })).body;
  const head = (pr.head ?? {}) as Record<string, unknown>;
  const base = (pr.base ?? {}) as Record<string, unknown>;
  const mergedBy = (pr.merged_by ?? {}) as Record<string, unknown>;
  const merged = pr.merged === true;
  const mergeSha =
    typeof pr.merge_commit_sha === "string" && pr.merge_commit_sha
      ? pr.merge_commit_sha
      : undefined;
  if (merged && !mergeSha) {
    throw new Error(
      `${a.owner}/${a.name}#${a.index} is merged but reports no merge commit`,
    );
  }
  return {
    repo: `${a.owner}/${a.name}`,
    index: a.index,
    url: String(pr.html_url ?? ""),
    state: String(pr.state ?? ""),
    merged,
    headSha: String(head.sha ?? ""),
    base: String(base.ref ?? ""),
    mergeSha: merged ? mergeSha : undefined,
    mergedAt: merged && typeof pr.merged_at === "string"
      ? pr.merged_at
      : undefined,
    mergedBy: merged && typeof mergedBy.login === "string"
      ? mergedBy.login
      : undefined,
    action: "observed",
    timestamp: new Date().toISOString(),
  };
}

// ─────────────────────────── runner prune ───────────────────────────

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

/** Extension adding tag protection and merge state to @thomas/forgejo. */
export const extension = {
  type: "@thomas/forgejo",
  resources: {
    tagProtection: {
      description:
        "A tag protection rule: the pattern and who may push matching tags.",
      schema: TagProtectionInfo,
      lifetime: "infinite" as const,
      garbageCollection: 20,
    },
    prMergeState: {
      description:
        "A pull request's head and, once merged, its merge commit, time, and merger.",
      schema: PrMergeStateInfo,
      lifetime: "infinite" as const,
      garbageCollection: 20,
    },
  },
  methods: [{
    tag_protection_ensure: {
      description:
        "Find-or-create a tag protection rule for a tag glob and converge who may push matching tags. " +
        "Idempotent — reports created/updated/unchanged. Never deletes a rule.",
      arguments: TagProtectionEnsureArgs,
      execute: async (
        args: z.infer<typeof TagProtectionEnsureArgs>,
        context: Ctx,
      ) => {
        const a = TagProtectionEnsureArgs.parse(args);
        context.logger.info("Ensuring tag protection {pattern} on {repo}", {
          pattern: a.namePattern,
          repo: `${a.owner}/${a.name}`,
        });
        const info = await tagProtectionEnsure(
          fetchCaller(context.globalArgs, context.signal),
          a,
        );
        context.logger.info("Tag protection {pattern}: {action}", {
          pattern: info.namePattern,
          action: info.action,
        });
        const handle = await context.writeResource(
          "tagProtection",
          safeName(`${info.repo}:${info.namePattern}`),
          info,
        );
        return { dataHandles: [handle] };
      },
    },
    pr_merge_state: {
      description:
        "Read a pull request's merge state from the server: PR head, and once merged, the merge commit, time, and " +
        "merger. Read-only; the factory's pull-request stage records its evidence from this, never from memory.",
      arguments: PrMergeStateArgs,
      execute: async (args: z.infer<typeof PrMergeStateArgs>, context: Ctx) => {
        const a = PrMergeStateArgs.parse(args);
        const info = await prMergeState(
          fetchCaller(context.globalArgs, context.signal),
          a,
        );
        context.logger.info("{repo}#{index}: {state}, merged {merged}", {
          repo: info.repo,
          index: info.index,
          state: info.state,
          merged: info.merged,
        });
        const handle = await context.writeResource(
          "prMergeState",
          safeName(`${info.repo}#${info.index}:merge`),
          info,
        );
        return { dataHandles: [handle] };
      },
    },
  }],
};
