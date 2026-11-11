---
audience: contributor, agent
last-verified: 2026-09-18 @ 345ea64
---

# Operations

One entry each for the parts that get no design page. **Protected** paths are listed in [trust.md](trust.md).

## Extensions (custom model types and methods)

TypeScript in `extensions/models/`, one file per concern, each with a `_test.ts` next to it. Run the tests with
`~/.swamp/deno/deno test -A extensions/models/` (swamp ships its own Deno).

| File | Type or extends | Methods | Used by |
|---|---|---|---|
| `dev_environment.ts` | `@dataverket/dev-environment` | `up`, `down`, `reset`, `check`, `verify`: the Taskfile's tasks, results pinned to the worktree's HEAD, full log recorded. | `fabrikk-verify` |
| `attestation.ts` | `@dataverket/attestation` | `tag`: refuses unless verification, review, approval, and digest all concern `headSha`; signs `attestation/<headSha>`. | `fabrikk-attest` |
| `git_paths_digest.ts` | extends `@swamp/git` | `paths_digest`: sha256 over protected paths at a commit; exports the shell recipe CI reruns. | `fabrikk-attest`, `validate-attestation.yaml` |
| `git_commit_messages.ts` | extends `@swamp/git` | `commit_messages`: the commits in `base..head` with full messages. | `fabrikk-verify` |
| `source_standards.ts` | `@dataverket/source-standards` | `commits`: no AI attribution in commit messages. Holds the pattern and the shell recipe CI copies literally; records the check before failing. | `fabrikk-verify`, `validate-attestation.yaml` |
| `release_artifact.ts` | `@dataverket/release-artifact` | `verify`: signature (cosign), provenance, `release.json`, digest-pinned images, `:candidate` equals this digest. | `fabrikk-release` |
| `reference_repos.ts` | `@dataverket/reference-repos` | `sync`: clones or refreshes each listed repository into `_reference/`, records the commit. | humans and agents |
| `forgejo_actions.ts` | extends `@dataverket/forgejo` | `tag_protection_ensure` (who may push `attestation/*`), `pr_merge_state` (the merge commit for `merge` evidence). | attester setup, `pull-request` stage |
| `_lib/task.ts` | shared | Runs `task -x <name>` with a timeout and captures the result. An aborted task gets SIGTERM, then SIGKILL after two seconds, because task does not exit on SIGTERM while a command runs. | `dev_environment.ts` |
| `upstream_extensions.json` | manifest | The pulled extensions and their pinned versions (swamp-managed). | swamp |

## Model instances

One YAML per instance under `models/`. Credentials are vault references, resolved at run time. Every instance is
inside the loop boundary ([factory.md](factory.md)); models that reach the cluster, the Talos fleet, or the registry's
push side live in fabrikk-infra's swamp.

| Instance | Definition | Points at | Credential |
|---|---|---|---|
| `fabrikk` | `models/@swamp/software-factory/fabrikk.yaml` | the factory itself | none |
| `forgejo` | `models/@dataverket/forgejo/forgejo.yaml` | `https://git.dataverket.org` | `forgejo/api_token` |
| `references` | `models/@dataverket/reference-repos/references.yaml` | the reference-repository list | none |
| `source-standards` | `models/@dataverket/source-standards/source-standards.yaml` | nothing external: checks over data | none |

Workflows create their own per-commit instances (`git-<sha>`, `dev-env-<sha>`, `attest-<sha>`, `release-<sha>`); they
are not in `models/`.

## Secrets

The `fabrikk` vault is `@dataverket/sops`: one SOPS-encrypted file per secret under `vaults/fabrikk/`, encrypted to
the factory host's age key (decrypts unattended) and each attester's YubiKey. `.sops.yaml` carries the same recipients
for the `sops` CLI.

| Key | Used by |
|---|---|
| `forgejo/api_token` | the `forgejo` model; scoped to `dataverket/fabrikk` |

## CI

| Path | Role |
|---|---|
| `.forgejo/workflows/validate-attestation.yaml` | On every PR push: the attestation checks plus AI attribution in commits and PR text, bash only. |
| `.forgejo/attesters` | SSH allowed signers who may sign `attestation/*`; read from the base branch by CI. |
| `.forgejo/workflows/release.yaml` | On merge to `main`: `scripts/tools`, then `task release` per product on the `fabrikk-release` runner. |

## Tasks and scripts

`Taskfile.yml` is the menu; `scripts/` does the work. A task is one line that calls its script, so `task check` and
`scripts/check` are the same thing. A `NAME=value` argument to `task` reaches the script as an environment variable.
The scripts follow one style: an executable per action, shared functions in `scripts/functions.sh`, every failure
returned to the caller, and `shellcheck -s bash -e SC2034,SC2154,SC1090,SC1091,SC2242 scripts/*` clean.

| Task | Script | Does |
|---|---|---|
| `task tools` | `scripts/tools` | Installs pinned task, ko, cosign, kustomize, crane, golangci-lint and flux into `_bin/`. Run the script directly on a machine that has no task yet. |
| `task check` | `scripts/check` | Tier 0: SPDX header on every Go file, gofmt, `go vet`, golangci-lint with `.golangci.yml` (every `switch` over a closed set covers every case), `go test` per module in `go.work`. |
| `task verify` | `scripts/verify` | Tier 2: ko images for the commit, the private verify stack, contract and black-box suites, teardown. |
| `task dev.up`, `dev.down`, `dev.reset` | `scripts/dev-up`, `dev-down`, `dev-reset` | The shared session stack. They refuse to run until `compose.yaml` exists. |
| `task release PRODUCT=<p>` | `scripts/release` | CI only: build, join, push, sign, tag `candidate`. |

`_bin/` holds the pinned binaries: ignored by git, skipped by `go ./...` because of the underscore, and first on
`PATH` inside every script. There is one, in the main checkout, and every worktree uses it; the scripts find the
main checkout through git. `scripts/tools` leaves a stamp, `_bin/.pins`, of the pins it installed from. `task check`
(when there is a module to check), `task verify` and `task release` stop when the stamp is not the pins of the
checkout they run in, so a branch that moves a pin is never judged by tools another branch installed. The fix is
`task tools`, which relinks from Go's build cache. The verify extension runs `task` from the workbench's own `PATH`.

## Updates

Three things move the versions this repository pins. Renovate runs on the forge from its own repository
(`dataverket/renovate`), once an hour, and acts here because `renovate.json` exists. It opens pull requests in one
weekly window, as `chore(deps): …`, and never merges: every file it touches is a protected path, so a person does.

| Moved by | What | Where the pin is |
|---|---|---|
| Renovate | task, ko, cosign, kustomize, crane | `scripts/tools`, a `# renovate:` comment above each version. A major version changes the module path and is done by hand. |
| Renovate | flux | `scripts/tools`, the image by tag and digest, moved together. |
| Renovate | Reference repositories pinned to a tag (Zitadel, the CloudEvents spec) | The reference list, a `# renovate:` comment between `url` and `ref`. |
| Renovate | `jsr:` and `npm:` versions in extension import specifiers | `extensions/models/*.ts`, every file in one pull request. zod is left alone: swamp supplies it. |
| Renovate, when they arrive | Go modules, compose images (pinned by digest), kustomize, CI actions | Their own files; Renovate's built-in managers need no rule here. |
| `swamp` | Pulled extensions, model type versions, the pulled `software-factory` skill, the swamp version | `swamp extension` and `swamp repo upgrade`. A version bump alone is not an update there: swamp rewrites files. |
| `references sync` | Reference repositories that follow a branch (the NATS ADRs, swamp) | They move to the branch's tip at every sync. |

To see what Renovate would propose without changing anything, run `task local -- fabrikk` in the Renovate
repository. It lists files through git, so a new file must be added to the index before it is seen.

A Renovate pull request carries no attestation tag, so `validate-attestation` is red on it. That is harmless until
the check is required on `main` ([trust.md](trust.md)).

## Agent files

| Path | Role |
|---|---|
| `AGENTS.md` | Repository rules for every agent: swamp's managed section, where knowledge lives, skills and enrolled agents. |
| `CLAUDE.md` | `@AGENTS.md` plus what only Claude Code needs. |
| `.claude/skills/` | One symlink per entry of `.agents/skills/`. Edit the target. |
| `.claude/settings.json` | Turns the harness's AI attribution off at the source; the source-standards check remains the trust. |
| `.swamp.yaml` | swamp's repository marker and the enrolled agent tools. Changed only by `swamp repo upgrade`. |

## Local, ignored

| Path | Role |
|---|---|
| `.swamp/` | swamp's run data, catalog, outputs, and pulled extensions. Query it with `swamp data query`, not `grep`. |
| `_reference/` | Read-only clones of the reference repositories. Rebuild with `swamp model method run references sync`. |
| `_bin/` | Tool binaries from `task tools`. |
| `vaults/*.plain.tmp` | Scratch file the vault provider writes during `put`. |
