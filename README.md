# fabrikk — bootstrap skill set

Context inputs for **fabrikk**, Dataverket's Swamp-based software factory. It builds Sentral first, then Objekt and Maskin.
Written to the model Adam Jacob presented: **the factory is a program; skills are its context.**
Process lives in Swamp models and workflows. These files say what good looks like, not how to run the loop.

## Layout

| Path | Role |
|---|---|
| `skills/architecture/SKILL.md` | The one architecture skill: Go, tactical DDD, event-driven messaging. Vocabulary + small examples from an unrelated domain. |
| `skills/adversary-testing/SKILL.md` | Adversary: testing strategy and tiers. |
| `skills/adversary-security/SKILL.md` | Adversary: tenancy, auth, secrets, supply chain. |
| `skills/adversary-simplicity/SKILL.md` | Adversary: LOC, dependencies, abstraction budget. |
| `skills/adversary-observability/SKILL.md` | Adversary: logs, traces, health. |
| `skills/adversary-source-standards/SKILL.md` | Adversary: licensing, commits, ADRs, protected paths. |
| `skills/dev-environment/SKILL.md` | Session stack, compose profiles, downstream fragment contract. |
| `skills/delivery/SKILL.md` | Artifacts, config join, gitless promotion, UAT. |
| `agent-constraints/planning-conventions.md` | What a plan must contain. Input to the planning stage. |
| `agent-constraints/adversarial-dimensions.md` | What reviewers attack, with severities. Input to both review stages. |
| `models/@swamp/software-factory/fabrikk.yaml` | The factory definition: stages, gates, review prompts. |
| `workflows/workflow-fabrikk-verify.yaml` | Verifying stage: clean worktree at `headSha`, then `make check` (tier 0) and `make verify` (tier 2). |
| `extensions/models/dev_environment.ts` | `@dataverket/dev-environment`: the dev-environment make targets as model methods, results pinned to HEAD. |
| `workflows/workflow-fabrikk-attest.yaml` | Attesting stage: commit `.fabrikk/attestation.json` on top of `headSha`. |
| `extensions/models/attestation.ts` | `@dataverket/attestation`: refuses unless verification, review, approval, and digest all concern `headSha`; writes the document. |
| `extensions/models/git_paths_digest.ts` | Adds `paths_digest` to `@swamp/git`: sha256 over protected paths at a commit, with a shell recipe CI can rerun. |
| `models/@dataverket/reference-repos/references.yaml` | Reference repositories agents read: name, URL, pinned ref, and why each is there. |
| `extensions/models/reference_repos.ts` | `@dataverket/reference-repos`: shallow-clones or refreshes every listed repo into `_reference/` and records the commit. |

Every adversary is used twice: to refine the plan before approval, and to review the output before the PR.

## Repositories

- **This repository is the monorepo.** fabrikk (skills, constraints, definition, workflows, extensions) and the products it
  builds (Sentral, then Objekt and Maskin) live here, so one commit pins both the code and the steering it was built under.
- **Environment overlays (L2) live in `miljo`**, outside the monorepo: different owner (the environment line), versioned
  independently, and never read by a cluster.

## Factory shape these files assume

```
outcome → plan → adversarial plan review (rework ≤5) → HUMAN APPROVES PLAN
→ implement + tests (rework until green, ≤5)
→ code review vs architecture + all adversaries (rework ≤5, prior findings fed forward)
→ attestation → PR → HUMAN APPROVES MERGE
→ artifact (ko, digest) → config join → signed OCI release
→ UAT against the release artifact (post-merge; the artifact is the only input)
→ promotion (channel tag)
```

Humans approve the plan and the merge. Nowhere else.

## Wiring

- `skills/*` are symlinked into `.claude/skills/` so Claude Code loads them. Stage work specs reference them by name.
- Drive a work item with `swamp model method run fabrikk status --input workItem=<ref>` (see the `software-factory` skill).
- `agent-constraints/` is consumed by `@swamp/issue-lifecycle` as-is, and by fabrikk's planning, implementing, and review stages as `constraints`.
- Reviews run in a separate agent with no shared context (`dispatch` mode: one reviewer per skill).
- Deterministic stages call swamp workflows. `fabrikk-verify` and `fabrikk-attest` exist; `fabrikk-release`, `fabrikk-uat`, `fabrikk-promote` do not yet, so a run stops at `releasing`.
- The implementer records `change` evidence with `worktree`, `branch`, and `headSha`; `fabrikk-verify` runs in that worktree and leaves the session stack up.
- Protected paths in Forgejo (human review required): `skills/`, `agent-constraints/`, `CLAUDE.md`, the `fabrikk` definition, review prompts, `docs/adr/`, `Makefile`, `compose.yaml`. The attestation checksums them.

## Reference repositories

External code and documentation agents read. `_reference/<name>/` is a read-only cache (gitignored, never built or
imported): full clones with every branch and tag, the listed `ref` checked out detached. The list in
`models/@dataverket/reference-repos/references.yaml` is tracked and protected; the cache is not, and
`rm -rf _reference && swamp model method run references sync` rebuilds it.

```
swamp model method run references sync                                  # all
swamp model method run references sync --input 'names=["zitadel"]'      # one
swamp data query 'modelName == "references"' --select '{"name": attributes.name, "commit": attributes.commit}'
```

- Look up any version without checking it out: `git -C _reference/zitadel show v4.10.0:go.mod`,
  `git -C _reference/zitadel grep jwks v4.10.0`, `git -C _reference/zitadel log v4.0.0..v4.17.3 -- <path>`.
- Update with `sync`, not `git pull`: the checkout is detached at the listed ref, so pull refuses. A manual `git fetch` is
  harmless; it adds history without moving the checkout.
- Search the directory explicitly (`rg <pattern> _reference/zitadel`): a search from the repo root skips ignored files.
- Work-item worktrees have no `_reference/`; read it from the main checkout (`git worktree list`, first entry).
- Cite what you relied on as `<name>@<commit>`. Read, never copy: licensing is the source-standards skill's call.
- Go libraries are read from the module cache at the version `go.mod` pins, not from here.

## Attestation

`fabrikk-attest` commits `.fabrikk/attestation.json` (`attestation: fabrikk/v1`) as the only change on top of the
verified commit. CI validates it without re-running the loop:

1. The attestation commit's parent is `headSha`, and it changes only `.fabrikk/attestation.json`.
2. `protectedPaths.sha256` equals `PATHS_DIGEST_RECIPE` (in `extensions/models/git_paths_digest.ts`) run at `headSha`
   over `protectedPaths.paths`.
3. `protectedPaths.changed` equals `git diff --name-only <base>...<headSha> -- <paths>`. Non-empty means the PR needs a
   human on protected paths, whatever else is green.

Verification, review, and approval are summarized from swamp run data that CI cannot read; the attestation says what the
factory recorded, not that a third party checked it.

## Deliberately not in this set (not settled yet)

Ring/wave promotion and the fleet ledger; the environment factory's full adversary set; the concrete subject-naming
standard (lives in an ADR); Objekt/Maskin domain content beyond the downstream-port pattern.
