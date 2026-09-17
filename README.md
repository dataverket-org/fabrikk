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
| `Makefile` | `make tools` (pinned ko, cosign, kustomize, crane, flux into `_tools/bin`) and `make release`. |
| `.forgejo/workflows/release.yaml` | CI on merge to main: `make release` for each product on shared infrastructure. |
| `workflows/workflow-fabrikk-release.yaml` | Releasing stage: waits for CI's candidate for the merge commit and verifies it. |
| `extensions/models/release_artifact.ts` | `@dataverket/release-artifact`: signature, provenance, `release.json`, digest-pinned images, `:candidate`. |
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
- Deterministic stages call swamp workflows. `fabrikk-verify`, `fabrikk-attest`, and `fabrikk-release` exist; `fabrikk-uat` and `fabrikk-promote` wait for a UAT environment (see Follow-up work), so a run stops at `uat`.
- The implementer records `change` evidence with `worktree`, `branch`, and `headSha`; `fabrikk-verify` runs in that worktree and leaves the session stack up.
- Protected paths in Forgejo (human review required): `skills/`, `agent-constraints/`, `CLAUDE.md`, the `fabrikk` definition, review prompts, `docs/adr/`, `Makefile`, `compose.yaml`, `.forgejo/`, `cosign.pub`. The attestation checksums them.

## Release

The candidate is built once, by CI on shared infrastructure, after merge; UAT tests that digest and promotion retags
it. Nothing after UAT rebuilds, and a workbench never builds what ships.

- `make release PRODUCT=<p>` builds `<p>/cmd/*` with ko (digest-pinned, tagged with the commit), renders
  `<p>/deploy/base` joined with every `miljo/environments/<env>/<p>` overlay (`resources: [../base]`), and pushes one Flux
  artifact per environment to `<registry>/<p>/config-<env>:<commit>` with `release.json`
  (`product`, `environment`, `app_commit`, `env_config_version`, `images`). It signs each with cosign (key-based, no
  public transparency log) and tags it `candidate`. Pushes are reproducible: re-running a commit gives the same digest.
- `.forgejo/workflows/release.yaml` runs that on merge, on a runner labelled `fabrikk-release` with Go, git, bash,
  curl, tar, and registry access, and secrets `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`, `COSIGN_PRIVATE_KEY`,
  `COSIGN_PASSWORD`. The public key is `cosign.pub` at the repository root.
- `fabrikk-release` verifies; `swamp data query 'modelName == "release-<sha>"'` holds what the factory records as
  `release` evidence.

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

## Follow-up work

Paused before UAT (2026-09-17): UAT must run end to end against a real environment, and none exists yet. A factory run
currently gets through `releasing` and stops at `uat`.

### UAT, promotion, and customer releases

- **UAT environment.** A cluster whose Flux `OCIRepository` watches `<registry>/<product>/config-uat:candidate` with cosign
  verification against `cosign.pub`.
- **`fabrikk-uat`.** Takes the release artifact recorded in `release` evidence and nothing else. Gates on the applied
  revision equalling the candidate digest, then runs the black-box suite from outside: functional tests always,
  environmental tests where the overlay declares them.
- **`fabrikk-promote`.** Retags the UAT-passed digest from `candidate` to `current`; rollback retags the previous digest.
- **Customer release line** (separate from this factory). Publishes digests that passed UAT (tag, annotation, extra
  signature, registry copy) and never rebuilds; anything customer-specific happens before UAT.

### Release infrastructure

- Self-hosted Forgejo hosting this monorepo and `miljo`, a runner labelled `fabrikk-release`, the Dataverket registry,
  a cosign key pair (`cosign.pub` committed, private key and registry credentials as Actions secrets).
- `.forgejo/workflows/release.yaml` is tested only as an extracted script against a local registry; run it on the real
  runner.
- Tag scheme for the environment line: a `miljo` change re-released for the same app commit reuses
  `config-<env>:<commit>` with a new digest. Releases triggered by `miljo` changes are not wired yet.
- Not yet in `make release`: the L2 tunable-field linter, SBOMs (`--sbom=none`), signatures on individual images, and a
  mirrored, digest-pinned base image per product (`<product>/.ko.yaml`). Every environment, `prod` included, is tagged
  `candidate` until the customer release line exists.

### Factory and dev environment

- `make dev.up`, `check`, `verify`, and `compose.yaml` arrive with Sentral's first work item, scoped per product
  (`PRODUCT=`) to keep the 60 s tier-0 budget. Open: host-port collisions between parallel worktrees, and a timed-out
  `make` leaving its child processes running.
- The `pull-request` stage should record the attestation commit as the PR head, not `headSha`.
- The `releasing` stage defaults to `sentral`/`uat`; the work item's product should come from the plan or `change`
  evidence.
- Reference repositories: tell agents in a skill (dev-environment or architecture) and add a `name@commit` citation to
  the plan's `portsAndDownstreams`. Move the Zitadel ref to the pinned Zitadel image once one is chosen.
- Decide whether `deploy/dev/` (compose fragments with healthcheck, seed, and reset scripts) is a protected path.
- List all seven products from ADR 001 (Sentral, Maskin, Plattform, Identitet, Tjeneste, Objekt, Nett) where this README
  names only Sentral, Objekt, and Maskin.
- Attestation provenance: the verification, review, and approval sections are the factory's own record; commit signing
  is the only independent signal today.
