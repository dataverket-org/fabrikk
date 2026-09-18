---
title: "Code map"
type: reference
project: fabrikk
audience: contributor, agent
last-verified: 2026-09-18 @ a44c475
description: "Every path in the repository and its role, including model instances and vault keys."
weight: 10
---

# Code map

Every path in the repository and what it is for. **Protected** means a change needs a human review in Forgejo and the
attestation checksums it ([explanation/attestation-and-trust.md](../explanation/attestation-and-trust.md)).

## The factory

| Path | Role | Protected |
|---|---|---|
| `models/@swamp/software-factory/fabrikk.yaml` | The factory definition: stages, artifact and evidence schemas, gates, review prompts. Contract in [factory-definition.md](factory-definition.md). | yes |
| `workflows/workflow-fabrikk-verify.yaml` | Verifying stage: clean worktree at `headSha`, session stack up, `make check` (tier 0), `make verify` (tier 2). | yes |
| `workflows/workflow-fabrikk-attest.yaml` | Attesting stage: protected-paths digest and change list, record checks, signed tag `attestation/<headSha>`. | yes |
| `workflows/workflow-fabrikk-release.yaml` | Releasing stage: waits for CI's candidate for the merge commit and verifies it. | yes |
| `agent-constraints/planning-conventions.md` | What a plan must contain. `constraints` of `planning`. | yes |
| `agent-constraints/implementation-conventions.md` | Worktree, plan fidelity, tests, commits, what to record. `constraints` of `implementing`. | yes |
| `agent-constraints/adversarial-dimensions.md` | What reviewers attack, with severities. `constraints` of both review stages. | yes |
| `.agents/skills/architecture/SKILL.md` | The one architecture skill: Go, tactical DDD, event-driven messaging over NATS with CloudEvents. | yes |
| `.agents/skills/adversary-security/SKILL.md` | Tenancy, auth callout, tokens, secrets, supply chain. | yes |
| `.agents/skills/adversary-testing/SKILL.md` | Testing strategy and tiers 0, 1, 2, UAT. | yes |
| `.agents/skills/adversary-simplicity/SKILL.md` | LOC, dependency, and abstraction budgets. | yes |
| `.agents/skills/adversary-observability/SKILL.md` | Logs, traces, health, what never gets logged. | yes |
| `.agents/skills/adversary-source-standards/SKILL.md` | Licensing, commits, ADRs, protected paths. | yes |
| `.agents/skills/dev-environment/SKILL.md` | Session stack, compose profiles, fragment contract, make targets, reference repos. | yes |
| `.agents/skills/delivery/SKILL.md` | Artifacts, config layers, the join, promotion, UAT. | yes |
| `.agents/skills/software-factory/SKILL.md` | The pulled `@swamp/software-factory` skill: how any agent drives a run. `.agents/skills/software-factory/references/driving.md` is the loop and the dispatch guard, `.agents/skills/software-factory/references/authoring.md` the definition format. | yes |
| `.agents/skills/software-factory/references/examples/minimal.yaml`, `.agents/skills/software-factory/references/examples/feature-factory.yaml`, `.agents/skills/software-factory/references/examples/sdlc-classic.yaml`, `.agents/skills/software-factory/references/examples/retry-feedback.yaml` | Example definitions shipped with the pulled skill; `fabrikk.yaml` was seeded from them. | yes |
| `.agents/skills/` | The skills directory, read by Codex, OpenCode, Copilot, Amp, Pi, and Antigravity: the rows above, one real copy each. | yes |
| `.claude/skills/` | Claude Code's skills directory: one symlink per entry of `.agents/skills/`. | yes |
| `AGENTS.md` | Repository rules for every agent: swamp's managed section (search before build, use swamp, "workflow" means a swamp workflow), the documentation pointer, skills and enrolled agents. | yes |
| `CLAUDE.md` | `@AGENTS.md` plus what only Claude Code needs: its skills path, the generated local settings, how `dispatch` maps to subagents. | yes |
| `.swamp.yaml` | swamp's repository marker: version, repo id, and the enrolled agent tools (`claude`, `codex`). Changed only by `swamp repo upgrade`. | no |
| `LICENSE` | AGPL-3.0. Every Go file carries the SPDX header (source-standards skill). | no |

## Local tools

The repository's own programs, as opposed to the external tools `make tools` pins (ko, cosign, kustomize, crane,
flux). One target installs both kinds into `_bin/`: external ones by pinned version, local ones built from HEAD. A
make target that needs a local tool depends on its binary, so it rebuilds when the module changes. Verification code runs from the branch
under review, so `tools/` is a protected path. Layout follows the architecture skill: `cmd/<name>/main.go` is wiring
only, logic lives under `internal/`, tests sit next to the code.

| Path | Role | Protected |
|---|---|---|
| `go.work` | Every Go module in the monorepo: `tools/` now, one module per product as they arrive. | no |
| `tools/go.mod`, `tools/go.sum` | The `tools` module (`git.dataverket.org/dataverket/fabrikk/tools`), Go 1.25, one dependency: `gopkg.in/yaml.v3`, to read human-managed YAML such as `docs/schema.yaml` with unknown keys rejected. Factory machinery needs no ADR for a dependency (source-standards skill). | yes |
| `tools/cmd/docs-check/main.go` | `docs-check`: flags, output, exit code. Run through `make docs-check`. | yes |
| `tools/internal/docscheck/config.go` | `docs/schema.yaml` as a typed config; unknown keys and bad patterns are errors. | yes |
| `tools/internal/docscheck/frontmatter.go` | Frontmatter parsing: dates become ISO strings, lists become `[]string`, `a, b` scalars split. | yes |
| `tools/internal/docscheck/check.go` | The rules: folders, files, fields, types by folder, allowlists, formats, ADR filename, sections and `related`, one overview per product, index links, code-map coverage (`git ls-files`). | yes |

## Extensions (custom model types and methods)

TypeScript, one file per concern, each with a `_test.ts` next to it. Run the tests with
`~/.swamp/deno/deno test -A extensions/models/` (swamp ships its own Deno).

| File | Type or extends | Methods | Used by |
|---|---|---|---|
| `extensions/models/dev_environment.ts` | `@dataverket/dev-environment` | `up`, `down`, `reset`, `check`, `verify`: the make targets, results pinned to the worktree's HEAD, full log recorded. | `fabrikk-verify` |
| `extensions/models/attestation.ts` | `@dataverket/attestation` | `tag`: refuses unless verification, review, approval, and digest all concern `headSha`; signs `attestation/<headSha>`. | `fabrikk-attest` |
| `extensions/models/git_paths_digest.ts` | extends `@swamp/git` | `paths_digest`: sha256 over protected paths at a commit; exports the shell recipe CI reruns. | `fabrikk-attest`, `validate-attestation.yaml` |
| `extensions/models/release_artifact.ts` | `@dataverket/release-artifact` | `verify`: signature (cosign), provenance, `release.json`, digest-pinned images, `:candidate` equals this digest. | `fabrikk-release` |
| `extensions/models/reference_repos.ts` | `@dataverket/reference-repos` | `sync`: clones or refreshes each listed repository into `_reference/`, records the commit. | humans and agents |
| `extensions/models/forgejo_actions.ts` | extends `@thomas/forgejo` | `runner_list`, `tag_protection_ensure`, `actions_secret_put` (write-only), `runner_registration_token` (to the vault), `repo_rename`, `pr_merge_state`. | forge setup, `pull-request` stage |
| `extensions/models/flux_reset.ts` | extends `@ginger_pappa/flux/helmrelease` | `reset`: reconcile with `--reset` for a release stuck at `RetriesExceeded`. | cluster operations |
| `extensions/models/registry_mirror.ts` | `@dataverket/registry-mirror` | `copy`: mirror an upstream image pinned by digest into `<registry>/mirror/<name>:<tag>` with the pinned `crane`; credential on stdin from the vault; unchanged if the digest is already there. | dev fragments, manifests |
| `extensions/models/_lib/make.ts` | shared | Runs a make target with a timeout and captures the result. | `dev_environment.ts` |
| `extensions/models/upstream_extensions.json` | manifest | The pulled extensions and their pinned versions (swamp-managed). | swamp |

## Model instances

Model definitions in `models/`, one YAML per instance. Credentials are vault references, resolved at run time.

| Instance | Definition | Type | Points at | Credential |
|---|---|---|---|---|
| `fabrikk` | `models/@swamp/software-factory/fabrikk.yaml` | `@swamp/software-factory` | the factory itself | none |
| `forgejo` | `models/@thomas/forgejo/forgejo.yaml` | `@thomas/forgejo` | `https://git.dataverket.org` | `forgejo/api_token` |
| `omni` | `models/@mccormick/omni/inventory/omni.yaml` | `@mccormick/omni/inventory` | the Sidero Omni account (Talos fleet, read-only `discover`) | `omni/service_account_key` |
| `runner-pods` | `models/@swamp/kubernetes/pod/runner-pods.yaml` | `@swamp/kubernetes/pod` | namespace `forgejo-runners` in `dataverket-prod`, kubeconfig context `fabrikk-readers` | kubeconfig |
| `dataverket-prod-rbac` | `models/@swamp/kubernetes/rbac/dataverket-prod-rbac.yaml` | `@swamp/kubernetes/rbac` | same namespace, context `dataverket-prod-admin` | kubeconfig |
| `dataverket-prod-helm` | `models/@ginger_pappa/flux/helmrelease/dataverket-prod-helm.yaml` | `@ginger_pappa/flux/helmrelease` | Flux HelmReleases in `dataverket-prod`, context `dataverket-prod-admin`; needs `_bin` on `PATH` for `flux` | kubeconfig |
| `references` | `models/@dataverket/reference-repos/references.yaml` | `@dataverket/reference-repos` | the reference-repository list | none |
| `registry` | `models/@dataverket/registry-mirror/registry.yaml` | `@dataverket/registry-mirror` | `registry.dataverket.org`, namespace `mirror` | `registry/ci_username`, `registry/ci_password` |

Workflows create their own per-commit instances on the fly (`git-<sha>`, `dev-env-<sha>`, `attest-<sha>`,
`release-<sha>`); they are not in `models/`.

## Secrets

`vaults/fabrikk.enc.json` is the `fabrikk` vault (`@zocc/sops-age`): SOPS, encrypted to the factory host's age key
(decrypts unattended) and each attester's YubiKey. `.sops.yaml` carries the same recipients for the `sops` CLI.

| Key | Used by |
|---|---|
| `forgejo/api_token` | the `forgejo` model |
| `omni/service_account_key` | the `omni` model |
| `registry/ci_username`, `registry/ci_password` | the `registry` model (mirroring), and copied to Actions secrets `REGISTRY_USERNAME`, `REGISTRY_PASSWORD` for `release.yaml`; owned by the cluster repository |

## CI and release

| Path | Role | Protected |
|---|---|---|
| `.forgejo/workflows/validate-attestation.yaml` | On every PR push: the four attestation checks, bash only. | yes |
| `.forgejo/attesters` | SSH allowed signers who may sign `attestation/*`; read from the base branch by CI. | yes |
| `.forgejo/workflows/release.yaml` | On merge to `main`: `make release` per product on the `fabrikk-release` runner. | yes |
| `Makefile` | `make tools` (pinned external tools and this repository's own, into `_bin/`), `make docs-check`, `make release`. Dev targets arrive with the first product. | yes |
| `cosign.pub` | Release signing public key. Does not exist yet. | yes |

## Products and their deployment config

| Path | Role |
|---|---|
| `<product>/` | One Go module per product (Sentral, Maskin, Plattform, Identitet, Tjeneste, Objekt, Nett), joined by the root `go.work`. None has code yet. |
| `<product>/deploy/base/` | L1: environment-agnostic manifests whose images are `ko://` references. |
| `deploy/dev/<system>/` | Dev-environment compose fragments per downstream system, shared by every product. Protected. |
| `compose.yaml` | The session stack. Arrives with the first product. Protected. |
| `docs/decisions/` | ADRs. Protected. |
| `docs/schema.yaml` | The page schema and bounding rules `tools/cmd/docs-check` enforces; explained in `docs/README.md`. Protected. |
| `../miljo` (separate repository) | L2: `environments/<env>/<product>/` overlays, owned by the environment line. |

## Local, ignored

| Path | Role |
|---|---|
| `.swamp/` | swamp's run data, catalog, outputs, and pulled extensions. Never committed. Query it with `swamp data query`, not `grep`. |
| `_reference/` | Read-only clones of the reference repositories. Rebuild with `swamp model method run references sync`. |
| `_bin/` | Every tool binary, external and local, from `make tools`. |
| `vaults/*.plain.tmp` | Scratch file the vault provider writes during `put`. |
