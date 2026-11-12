---
audience: contributor, agent
last-verified: 2026-09-18 @ 345ea64
---

# Operations

One entry each for the parts that get no design page. **Protected** paths are listed in [trust.md](trust.md).

## Extensions (custom model types and methods)

TypeScript in `extensions/models/`, one file per concern, each with a `_test.ts` next to it. `task fabrikk.test`
runs the tests, on the Deno swamp ships (`~/.swamp/deno/deno`).

| File | Type or extends | Methods | Used by |
|---|---|---|---|
| `dev_environment.ts` | `@dataverket/dev-environment` | `up`, `down`, `reset`, `check`, `verify`: the Taskfile's tasks, results pinned to the worktree's HEAD, full log recorded. | `fabrikk-verify` |
| `attestation.ts` | `@dataverket/attestation` | `tag`: refuses unless verification, review, approval, and digest all concern `headSha`; signs `attestation/<headSha>`. | `fabrikk-attest` |
| `git_paths_digest.ts` | extends `@swamp/git` | `paths_digest`: sha256 over protected paths at a commit; exports the shell recipe CI reruns. | `fabrikk-attest`, `validate-attestation.yaml` |
| `git_commit_messages.ts` | extends `@swamp/git` | `commit_messages`: the commits in `base..head` with full messages. | `fabrikk-verify` |
| `source_standards.ts` | `@dataverket/source-standards` | `commits`: no AI attribution in commit messages. Holds the pattern and the shell recipe CI copies literally; records the check before failing. | `fabrikk-verify`, `validate-attestation.yaml` |
| `release_artifact.ts` | `@dataverket/release-artifact` | `verify`: signature (cosign), provenance, `release.json`, digest-pinned images, `:candidate` equals this digest. | `fabrikk-release` |
| `reference_repos.ts` | `@dataverket/reference-repos` | `sync`: clones or refreshes each listed repository into `_reference/`, records the commit. | humans and agents |
| `forgejo_actions.ts` | extends `@dataverket/forgejo` | `tag_protection_ensure` (who may push `attestation/*`). Everything else on the forge model, `pr_ensure` and `pr_merge_state` among it, is upstream's. | attester setup |
| `_lib/task.ts` | shared | Runs `task -x <name>` with a timeout and captures the result. An aborted task gets SIGTERM, then SIGKILL after two seconds, because task does not exit on SIGTERM while a command runs. | `dev_environment.ts` |
| `upstream_extensions.json` | manifest | The pulled extensions and their pinned versions (swamp-managed). | swamp |

### Pulled extensions

`@swamp/stagecraft`, `@swamp/git`, `@dataverket/sops` and `@dataverket/forgejo` are pulled from the swamp
registry and pinned in `upstream_extensions.json`. Renovate does not move them; `swamp extension outdated` lists
what is behind and `swamp extension update` moves it. After an update, check two things an update can change
without failing any validation:

- **A local method that upstream now ships.** Swamp prints a `swamp-warning` on every call and keeps the local one.
  Remove the local copy, so there is one implementation.
- **The names of the records a stage reads.** The pull-request stage's prompt in the definition and
  `contributing/driving.md` name the forge model's records (`pull-<owner>-<repo>-<n>`,
  `pr-merge-state-<owner>-<repo>-<n>`). An extension that renames its records leaves those reading old data.

## Model instances

One YAML per instance under `models/`. Credentials are vault references, resolved at run time. Every instance is
inside the loop boundary ([factory.md](factory.md)); models that reach the cluster, the Talos fleet, or the registry's
push side live in fabrikk-infra's swamp.

| Instance | Definition | Points at | Credential |
|---|---|---|---|
| `slice` | `models/@swamp/stagecraft/factory/slice.yaml` | the factory itself: its definition and saved scenarios | none |
| `board` | `models/@swamp/stagecraft/tracker/board.yaml` | the built-in tracker: work items' tickets, kept in swamp data | none |
| `forgejo` | `models/@dataverket/forgejo/forgejo.yaml` | `https://git.dataverket.org` | `forgejo/api_token` |
| `references` | `models/@dataverket/reference-repos/references.yaml` | the reference-repository list | none |
| `source-standards` | `models/@dataverket/source-standards/source-standards.yaml` | nothing external: checks over data | none |

Workflows create their own per-commit instances (`git-<sha>`, `dev-env-<sha>`, `attest-<sha>`, `release-<sha>`); they
are not in `models/`.

## Secrets

The `fabrikk` vault is `@dataverket/sops`: one SOPS-encrypted file per secret under `vaults/fabrikk/`. Its
recipients are one process key per host that drives the factory (`swamp-fabrikk-<host>`, the file
`swamp-fabrikk.txt` beside sops's `keys.txt`, which the vault config names as `ageKeyName`) and each operator's
YubiKey. A host's key decrypts unattended; it is generated on the host, never copied, and is not fabrikk-infra's
key for the same host. `.sops.yaml` carries the same recipients for the `sops` CLI.
[contributing/workstation.md](../contributing/workstation.md) says how a host gets its key.

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
returned to the caller. The shared functions are in `scripts/functions/`, one file per topic, loaded by
`scripts/functions.sh`. All of it is clean under
`find scripts -type f -exec shellcheck -s bash -e SC2034,SC2154,SC1090,SC1091,SC2242 {} +`.

| Task | Script | Does |
|---|---|---|
| `task tools` | `scripts/tools` | Installs pinned task, ko, cosign, kustomize, crane, golangci-lint and flux into `_bin/`. Run the script directly on a machine that has no task yet. |
| `task check` | `scripts/check` | Tier 0: SPDX header on every Go file, gofmt, `go vet`, golangci-lint with `.golangci.yml` (every `switch` over a closed set covers every case), `go test` per module in `go.work`. |
| `task verify` | `scripts/verify` | Tier 2: ko images for the commit, the private verify stack, contract and black-box suites, teardown. |
| `task dev.up`, `dev.down`, `dev.reset` | `scripts/dev-up`, `dev-down`, `dev-reset` | The shared session stack, played with `podman kube play`. They refuse to run until `deploy/dev/default/` exists. |
| `task release PRODUCT=<p>` | `scripts/release` | CI only: build, join, push, sign, tag `candidate`. |
| `task fabrikk.test` | `scripts/fabrikk-test` | fabrikk itself, not what it builds: the extensions' tests, every factory definition with its saved scenarios, every workflow. No tier: a work item's verification does not run it, because that loads the extensions from the main checkout and not from the work item's worktree. Run in the main checkout before a change to the factory goes into a pull request. |

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
| Renovate | Go modules, CI actions | Their own files; Renovate's built-in managers need no rule here. |
| Nothing yet | Images in pod manifests (`deploy/dev/`, `<product>/deploy/base/`) and the ko base image (`<product>/.ko.yaml`), each written as tag and digest | No Renovate rule follows them: the manifests need a file pattern for Renovate's Kubernetes manager and `.ko.yaml` a rule of its own. Until those are written they are moved by hand. |
| `swamp` | Pulled extensions, model type versions, the pulled `stagecraft` skill, the swamp version | `swamp extension` and `swamp repo upgrade`. A version bump alone is not an update there: swamp rewrites files. |
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
