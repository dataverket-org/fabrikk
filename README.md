# fabrikk

**fabrikk** is Dataverket's software factory, built on [swamp](https://github.com/swamp-club/swamp). It builds
Dataverket's seven products, Sentral first, then Objekt and Maskin. It follows the model Adam Jacob presented: **the
factory is a program; skills are its context.** Process lives in swamp models and workflows; the skills and constraint
files say what good looks like, not how to run the loop.

The manual is in [`docs/`](docs/README.md): start with [how fabrikk works](docs/explanation/how-fabrikk-works.md),
find code with the [code map](docs/reference/code-map.md), and drive a run with the
[guides](docs/guides/drive-a-work-item.md). This README is the front door and the status board.

## Products

Dataverket is a sovereign open source datacenter automation system. Its products, as named in ADR 001 (service naming):

| Product | Purpose | Directory |
|---|---|---|
| **Sentral** | Control plane, orchestration, billing | `sentral/` |
| **Maskin** | Compute: VMs and bare metal | `maskin/` |
| **Plattform** | Kubernetes platform | `plattform/` |
| **Identitet** | Identity and access management (Zitadel) | `identitet/` |
| **Tjeneste** | Application and service deployment (SaaS layer) | `tjeneste/` |
| **Objekt** | Object storage (S3-compatible) | `objekt/` |
| **Nett** | Datacenter network automation and tenant network products | `nett/` |

Each product is its own Go module in its own directory, joined by the root `go.work`, and is released as its own
artifacts. None of them has code yet.

## Repositories

- **This repository is the monorepo.** fabrikk (skills, constraints, definition, workflows, extensions) and the products it
  builds (the seven products above) live here, so one commit pins both the code and the steering it was built under.
- **Environment overlays (L2) live in `miljo`**, outside the monorepo: different owner (the environment line), versioned
  independently, and never read by a cluster.

## Factory shape

```
outcome → plan → adversarial plan review (rework ≤5) → HUMAN APPROVES PLAN
→ implement + tests (rework until green, ≤5)
→ code review vs architecture + all adversaries (rework ≤5, prior findings fed forward)
→ attestation (signed tag) → PR → HUMAN APPROVES MERGE
→ artifact (ko, digest) → config join → signed OCI release
→ UAT against the release artifact (post-merge; the artifact is the only input)
→ promotion (channel tag)
```

Humans approve the plan and the merge. Nowhere else. The loop runs on one machine; CI validates the attestation on
every pull request and builds the release after merge, and never runs the loop. `fabrikk-verify`, `fabrikk-attest`,
and `fabrikk-release` exist; `fabrikk-uat` and `fabrikk-promote` wait for a UAT environment, so a run stops at `uat`.

## Getting going

```sh
swamp model search --json | jq '.results[].name'                       # the model instances
swamp model method run fabrikk describe                                # the machine, as Mermaid and a table
swamp model method run fabrikk status --input workItem=<ref>           # what a run needs next
```

[Set up a workstation](docs/guides/set-up-a-workstation.md) first. Every protected path (skills, constraints, the agent
instructions, the definition, workflows, extensions, `tools/`, `.forgejo/`, `Makefile`, `docs/decisions/`, `docs/schema.yaml`) needs a human in
Forgejo, and the attestation checksums them. Any coding agent enrolled in `.swamp.yaml` can drive it (Claude Code
and Codex today): the rules are in `AGENTS.md`, the skills in `.agents/skills/`, symlinked into `.claude/skills/`.

## Deliberately not in this set (not settled yet)

Ring/wave promotion and the fleet ledger; the environment factory's full adversary set; the concrete subject-naming
standard (lives in an ADR); domain content for products other than Sentral beyond the downstream-port pattern.

## Follow-up work

Paused before UAT (2026-09-17): UAT must run end to end against a real environment, and none exists yet. A factory run
currently gets through `releasing` and stops at `uat`.

### Next steps (2026-09-17)

Compared with swamp's own factory (`_reference/swamp`, `.github/workflows/ci.yml`), the pre-merge half matches, and
after the changes of 2026-09-17 the forge is wired in: CI validates the attestation tag and the `pull-request` stage
reads the forge's API. What swamp has that fabrikk still lacks is CI-side LLM review (an adversarial review of core
source, a security review of `.forgejo/` changes, a review-integrity check on trust-root changes) and auto-merge;
fabrikk keeps the human merge by design and the other three are listed below. Since 2026-09-18 the repository is
also laid out for more than one agent the way swamp's is: `AGENTS.md` carries the rules, `CLAUDE.md` imports it,
and `.agents/skills/` and `.claude/skills/` point at the same skills. In order:

1. **Stand up the forge and put the repos on it.** Done on `git.dataverket.org` through the `forgejo` model
   (`@thomas/forgejo` plus `extensions/models/forgejo_actions.ts`, token in the `fabrikk` vault): `dataverket/fabrikk`
   and `dataverket/miljo` exist, `main` is pull-request only, and only `beddari` may push `attestation/*` tags.
   The org runner `dataverket-runner` (labels `ubuntu-latest`, `kata`; a Kata VM pod in `dataverket-prod`)
   is not the release runner: that is `fabrikk-release`, a Kata VM pod in the same namespace that Flux does not know,
   defined by the `fabrikk-runner` workflow in fabrikk-infra's swamp (moved there 2026-09-18 with every other model
   that reaches the cluster; see the loop boundary in `docs/explanation/how-fabrikk-works.md`) with the
   cosign key seeded into memory over FIDO SSH, never on disk (design in Follow-up work). The registry exists:
   zot at `registry.dataverket.org` (fabrikk-infra `artifacts/zot`, delivered gitless; anonymous pull, push for
   `fabrikk-ci`, whose credential the cluster repo owns). `REGISTRY_USERNAME` and `REGISTRY_PASSWORD` are Actions
   secrets on `dataverket/fabrikk` (put from fabrikk-infra's swamp, 2026-09-17). Left: the cosign key:
   `release.yaml` still reads `COSIGN_PRIVATE_KEY` from Actions secrets, which the signing-key design below forbids.
   Decide (OpenBao transit or the memory volume), then change `release.yaml` and generate the key pair; `cosign.pub`
   is committed with it.
2. **Add PR validation to CI.** Done: `.forgejo/workflows/validate-attestation.yaml` runs the four checks (six since 2026-09-18: commits and PR text carry no AI attribution) under
   `docs/explanation/attestation-and-trust.md` on every push to a PR, with `.forgejo/attesters` for `git tag -v`. Tested locally against a
   signed-tag fixture (happy path, missing tag, rogue signer, moved head, tampered protected file); not yet run on the
   real runner. Left: after its first run on a real PR, make it a required status check on `main`
   (`branch_protection_ensure`, `enableStatusCheck: true`, `statusCheckContexts` = the context Forgejo reports).
   The review-integrity check comes later.
3. **Wire Forgejo into the `pull-request` stage.** Done with `@thomas/forgejo`: the stage's prompt drives `pr_ensure`
   (open, converge) and `pr_merge_state` (extension: merge commit, time, merger), and `pull-request` evidence now
   carries the PR `index`. `@shrug/forgejo` covers issues if work items become issue URLs.
4. **Run Sentral's first work item through the whole loop.** It brings `go.work`, the first module, `make check`,
   `make verify`, and `compose.yaml`, which makes `verifying` real, and is the first run of `release.yaml` on the real
   runner. `agent-constraints/implementation-conventions.md` exists and is the implementing stage's constraints; the
   first work item will show what it is missing.

Step 4 is next. It stalls at `releasing` until the release runner and the cosign key from step 1 exist, so start
those in parallel; everything up to and including the merge works without them.

### UAT, promotion, and customer releases

- **UAT environment.** A cluster whose Flux `OCIRepository` watches `<registry>/<product>/config-uat:candidate` with cosign
  verification against `cosign.pub`.
- **`fabrikk-uat`.** Takes the release artifact recorded in `release` evidence and nothing else. Gates on the applied
  revision equalling the candidate digest, then runs the black-box suite from outside: functional tests always,
  environmental tests where the overlay declares them.
- **`fabrikk-promote`.** Retags the UAT-passed digest from `candidate` to `current`; rollback retags the previous digest.
- **Customer release line** (separate from this factory). Publishes digests that passed UAT (tag, annotation, extra
  signature, registry copy) and never rebuilds; anything customer-specific happens before UAT.

### Release signing key

The cosign private key is seeded from developer laptops over FIDO SSH into the release runner's memory and is never
on disk: not in Actions secrets, not on a volume, gone on restart until a developer seeds it again.

- **The runner.** `dataverket-runner` is a pod in `dataverket-prod` (fabrikk-infra, `apps/forgejo-runners`): the
  forgejo-runner chart under the `kata` RuntimeClass, so a VM, with docker-in-docker and a Cinder volume for images.
  Jobs run as containers inside that VM. The release runner is the same shape without the chart, defined by the
  `fabrikk-runner` workflow in fabrikk-infra's swamp with the label `fabrikk-release`; the PR runner never carries
  the key. Both need the pod annotation that gives virtiofsd `--xattr`: without it docker cannot pull images whose
  files carry capabilities, which is why every job failed until 2026-09-18 (the fix for the org runner is a
  fabrikk-infra change).
- **Seeding.** An sshd sidecar in the release runner pod, exposed on its own port through the Envoy gateway.
  `authorized_keys` holds each attester's FIDO key with `restrict,verify-required,command="/seed"` (touch and PIN); the
  forced command reads stdin into an `emptyDir` with `medium: Memory`, mode 0600, and does nothing else. From a laptop:
  `age -d cosign.key.age | ssh -p <port> seed@runner.dataverket.org`.
- **Use.** Recommended: the key never enters a job. An OpenBao transit engine with in-memory storage holds it, seeded
  over the same path; `make release` signs with `COSIGN_KEY=hashivault://fabrikk-release` and a sign-only token from
  Actions secrets. Every signature is audit-logged and a job cannot read the key. Fallback: mount the memory volume
  read-only into the release job (`runner.config.container.valid_volumes`) with the passphrase in Actions secrets;
  simpler, but a malicious workflow on that runner can then read the key.
- **Fail fast.** `release.yaml` first checks the key is seeded and fails with the seed command in the message, so a
  restart does not leave `fabrikk-release` waiting out its hour. The job runs in a container image with Go, since the
  runner has no host toolchain.
- **What this does not defend against.** Forgejo cannot restrict which workflows a runner label accepts, so any
  same-repo PR can run a job on the release runner and use the key while it is seeded. `.forgejo/` is a protected
  path and gets a CI security review (step 2); the OpenBao shape turns "steal the key" into "sign once, on the record".

### Release infrastructure

- `git.dataverket.org` hosts this monorepo, `miljo`, and `fabrikk-infra` (the infrastructure that stands up a fabrikk;
  `flux-bootstrap` until 2026-09-17), and is the source of record; Codeberg is a
  push mirror. Flux in `dataverket-prod` reads `fabrikk-infra` from the forge (since `ed79b27`, 2026-09-17). Lesson
  from that switch: `flux bootstrap` owns fields on the live `GitRepository` through server-side apply, so removing a
  field in git alone does nothing; rerun `bootstrap.sh` or patch the live object. Still needed: a cosign key pair
  (`cosign.pub` committed) and the seeding sidecar on the `fabrikk-release` runner (see Release signing key).
- The factory holds no kube context and no credential for what fabrikk-infra deploys. Cluster models (Omni-issued
  contexts `fabrikk-readers` and `dataverket-prod-admin`) live in fabrikk-infra's swamp since 2026-09-18.
- `.forgejo/workflows/release.yaml` is tested only as an extracted script against a local registry; run it on the real
  runner.
- Tag scheme for the environment line: a `miljo` change re-released for the same app commit reuses
  `config-<env>:<commit>` with a new digest. Releases triggered by `miljo` changes are not wired yet.
- Not yet in `make release`: the L2 tunable-field linter, SBOMs (`--sbom=none`), signatures on individual images, and a
  mirrored, digest-pinned base image per product (`<product>/.ko.yaml`). Every environment, `prod` included, is tagged
  `candidate` until the customer release line exists.

### Factory and dev environment

- `make dev.up`, `check`, `verify`, and `compose.yaml` arrive with Sentral's first work item, scoped per product
  (`PRODUCT=`) to keep the 60 s tier-0 budget. `make check` must depend on `docs-check`, which exists as the first
  local tool (`tools/`, Go, on `go.work`). `release.yaml` triggers on product paths only, so nothing runs on the
  release runner until Sentral has code. The dev targets exist (2026-09-18) and refuse to run until `compose.yaml`
  does; they fix the compose project names so parallel worktrees share one tier 0/1 stack and each commit gets its
  own tier 2 stack (dev-environment skill, "Session stack"). Open: a timed-out `make` leaving its child processes
  running.
- A "fast lane" for simple tasks (the talk suggests one): a shorter path that skips plan review for a fix with a
  reproduction and no protected-path change. Not designed; every work item takes the full loop today.
- The `releasing` stage defaults to `sentral`/`uat`; the work item's product should come from the plan or `change`
  evidence.
- Reference repositories: move the Zitadel ref to the pinned Zitadel image once one is chosen.
- CI attestation validation exists (`validate-attestation.yaml`, `.forgejo/attesters`, tag protection for
  `attestation/*`); it is not yet a required status check on `main`, and has not yet run on the real runner.
- Shared swamp store: once Forgejo, the runner, and the registry exist, share fabrikk's swamp data through a remote
  datastore or `swamp serve` (swamp-club is swamp's own equivalent). Attestations are already swamp data, and CI could
  then check the verification, review, and approval records themselves instead of only the attestation's summary of
  them. The signed tag stays as the anchor in git.
- Review integrity: an LLM review, like swamp's, of changes to protected steering files (skills, constraints, review
  prompts, verification workflows) looking for weakened criteria, hidden content, and bypasses.
