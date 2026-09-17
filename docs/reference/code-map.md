---
title: "Code map"
type: reference
project: fabrikk
audience: contributor, agent
last-verified: 2026-09-17 @ 7b38cae
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
| `skills/architecture/SKILL.md` | The one architecture skill: Go, tactical DDD, event-driven messaging over NATS with CloudEvents. | yes |
| `skills/adversary-security/SKILL.md` | Tenancy, auth callout, tokens, secrets, supply chain. | yes |
| `skills/adversary-testing/SKILL.md` | Testing strategy and tiers 0, 1, 2, UAT. | yes |
| `skills/adversary-simplicity/SKILL.md` | LOC, dependency, and abstraction budgets. | yes |
| `skills/adversary-observability/SKILL.md` | Logs, traces, health, what never gets logged. | yes |
| `skills/adversary-source-standards/SKILL.md` | Licensing, commits, ADRs, protected paths. | yes |
| `skills/dev-environment/SKILL.md` | Session stack, compose profiles, fragment contract, make targets, reference repos. | yes |
| `skills/delivery/SKILL.md` | Artifacts, config layers, the join, promotion, UAT. | yes |
| `.claude/skills/` | Symlinks to `skills/*` plus the pulled `software-factory` skill, so Claude Code loads them by name. | yes |
| `CLAUDE.md` | Repository rules for the agent: search before build, use swamp, "workflow" means a swamp workflow. | yes |

## Extensions (custom model types and methods)

All in `extensions/models/`, TypeScript, one file per concern, each with a `_test.ts` next to it. Run the tests with
`~/.swamp/deno/deno test -A extensions/models/` (swamp ships its own Deno).

| File | Type or extends | Methods | Used by |
|---|---|---|---|
| `dev_environment.ts` | `@dataverket/dev-environment` | `up`, `down`, `reset`, `check`, `verify`: the make targets, results pinned to the worktree's HEAD, full log recorded. | `fabrikk-verify` |
| `attestation.ts` | `@dataverket/attestation` | `tag`: refuses unless verification, review, approval, and digest all concern `headSha`; signs `attestation/<headSha>`. | `fabrikk-attest` |
| `git_paths_digest.ts` | extends `@swamp/git` | `paths_digest`: sha256 over protected paths at a commit; exports the shell recipe CI reruns. | `fabrikk-attest`, `validate-attestation.yaml` |
| `release_artifact.ts` | `@dataverket/release-artifact` | `verify`: signature (cosign), provenance, `release.json`, digest-pinned images, `:candidate` equals this digest. | `fabrikk-release` |
| `reference_repos.ts` | `@dataverket/reference-repos` | `sync`: clones or refreshes each listed repository into `_reference/`, records the commit. | humans and agents |
| `forgejo_actions.ts` | extends `@thomas/forgejo` | `runner_list`, `tag_protection_ensure`, `actions_secret_put` (write-only), `runner_registration_token` (to the vault), `repo_rename`, `pr_merge_state`. | forge setup, `pull-request` stage |
| `flux_reset.ts` | extends `@ginger_pappa/flux/helmrelease` | `reset`: reconcile with `--reset` for a release stuck at `RetriesExceeded`. | cluster operations |
| `_lib/make.ts` | shared | Runs a make target with a timeout and captures the result. | `dev_environment.ts` |
| `upstream_extensions.json` | manifest | The pulled extensions and their pinned versions (swamp-managed). | swamp |

## Model instances

Model definitions in `models/`, one YAML per instance. Credentials are vault references, resolved at run time.

| Instance | Type | Points at | Credential |
|---|---|---|---|
| `fabrikk` | `@swamp/software-factory` | the factory itself | none |
| `forgejo` | `@thomas/forgejo` | `https://git.dataverket.org` | `forgejo/api_token` |
| `omni` | `@mccormick/omni/inventory` | the Sidero Omni account (Talos fleet, read-only `discover`) | `omni/service_account_key` |
| `runner-pods` | `@swamp/kubernetes/pod` | namespace `forgejo-runners` in `dataverket-prod`, kubeconfig context `fabrikk-readers` | kubeconfig |
| `dataverket-prod-rbac` | `@swamp/kubernetes/rbac` | same namespace, context `dataverket-prod-admin` | kubeconfig |
| `dataverket-prod-helm` | `@ginger_pappa/flux/helmrelease` | Flux HelmReleases in `dataverket-prod`, context `dataverket-prod-admin`; needs `_tools/bin` on `PATH` for `flux` | kubeconfig |
| `references` | `@dataverket/reference-repos` | the list in `models/@dataverket/reference-repos/references.yaml` | none |

Workflows create their own per-commit instances on the fly (`git-<sha>`, `dev-env-<sha>`, `attest-<sha>`,
`release-<sha>`); they are not in `models/`.

## Secrets

`vaults/fabrikk.enc.json` is the `fabrikk` vault (`@zocc/sops-age`): SOPS, encrypted to the factory host's age key
(decrypts unattended) and each attester's YubiKey. `.sops.yaml` carries the same recipients for the `sops` CLI.

| Key | Used by |
|---|---|
| `forgejo/api_token` | the `forgejo` model |
| `omni/service_account_key` | the `omni` model |
| `registry/ci_username`, `registry/ci_password` | copied to Actions secrets `REGISTRY_USERNAME`, `REGISTRY_PASSWORD` for `release.yaml`; owned by the cluster repository |

## CI and release

| Path | Role | Protected |
|---|---|---|
| `.forgejo/workflows/validate-attestation.yaml` | On every PR push: the four attestation checks, bash only. | yes |
| `.forgejo/attesters` | SSH allowed signers who may sign `attestation/*`; read from the base branch by CI. | yes |
| `.forgejo/workflows/release.yaml` | On merge to `main`: `make release` per product on the `fabrikk-release` runner. | yes |
| `Makefile` | `make tools` (pinned ko, cosign, kustomize, crane, flux into `_tools/bin`) and `make release`. Dev targets arrive with the first product. | yes |
| `cosign.pub` | Release signing public key. Does not exist yet. | yes |

## Products and their deployment config

| Path | Role |
|---|---|
| `<product>/` | One Go module per product (Sentral, Maskin, Plattform, Identitet, Tjeneste, Objekt, Nett), joined by the root `go.work`. None has code yet. |
| `<product>/deploy/base/` | L1: environment-agnostic manifests whose images are `ko://` references. |
| `deploy/dev/<system>/` | Dev-environment compose fragments per downstream system, shared by every product. Protected. |
| `compose.yaml` | The session stack. Arrives with the first product. Protected. |
| `docs/decisions/` | ADRs. Protected. |
| `../miljo` (separate repository) | L2: `environments/<env>/<product>/` overlays, owned by the environment line. |

## Local, ignored

| Path | Role |
|---|---|
| `.swamp/` | swamp's run data, catalog, outputs, and pulled extensions. Never committed. Query it with `swamp data query`, not `grep`. |
| `_reference/` | Read-only clones of the reference repositories. Rebuild with `swamp model method run references sync`. |
| `_tools/bin/` | Pinned release tools from `make tools`. |
| `vaults/*.plain.tmp` | Scratch file the vault provider writes during `put`. |
