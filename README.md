# fabrikk — bootstrap skill set

Context inputs for **fabrikk**, Dataverket's Swamp-based software factory. It builds Dataverket's seven products,
Sentral first, then Objekt and Maskin.
Written to the model Adam Jacob presented: **the factory is a program; skills are its context.**
Process lives in Swamp models and workflows. These files say what good looks like, not how to run the loop.

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
| `workflows/workflow-fabrikk-attest.yaml` | Attesting stage: sign the attestation as tag `attestation/<headSha>` on the verified commit. |
| `extensions/models/attestation.ts` | `@dataverket/attestation`: refuses unless verification, review, approval, and digest all concern `headSha`; writes the document. |
| `extensions/models/git_paths_digest.ts` | Adds `paths_digest` to `@swamp/git`: sha256 over protected paths at a commit, with a shell recipe CI can rerun. |
| `models/@dataverket/reference-repos/references.yaml` | Reference repositories agents read: name, URL, pinned ref, and why each is there. |
| `Makefile` | `make tools` (pinned ko, cosign, kustomize, crane, flux into `_tools/bin`) and `make release`. |
| `.forgejo/workflows/release.yaml` | CI on merge to main: `make release` for each product on shared infrastructure. |
| `workflows/workflow-fabrikk-release.yaml` | Releasing stage: waits for CI's candidate for the merge commit and verifies it. |
| `extensions/models/release_artifact.ts` | `@dataverket/release-artifact`: signature, provenance, `release.json`, digest-pinned images, `:candidate`. |
| `extensions/models/reference_repos.ts` | `@dataverket/reference-repos`: shallow-clones or refreshes every listed repo into `_reference/` and records the commit. |
| `models/@thomas/forgejo/forgejo.yaml` | `forgejo`: the forge at `git.dataverket.org` (repos, branch protection, PRs), token from the `fabrikk` vault. |
| `models/@mccormick/omni/inventory/omni.yaml` | `omni`: the Talos fleet as Sidero Omni sees it (read-only `discover`), service-account key from the `fabrikk` vault. |
| `models/@ginger_pappa/flux/helmrelease/dataverket-prod-helm.yaml` | `dataverket-prod-helm`: Flux HelmReleases in `dataverket-prod` (list, reconcile, suspend, resume), context `dataverket-prod-admin`; wraps the pinned `flux` CLI, so run with `_tools/bin` on PATH. |
| `extensions/models/flux_reset.ts` | Adds `reset` to `@ginger_pappa/flux/helmrelease`: reconcile with `--reset`, for a release stuck at `RetriesExceeded` whose workloads are healthy. |
| `models/@swamp/kubernetes/pod/runner-pods.yaml` | `runner-pods`: the `forgejo-runners` namespace in `dataverket-prod`, context `fabrikk-readers` from the developer's kubeconfig. |
| `extensions/models/forgejo_actions.ts` | Adds to `@thomas/forgejo`: `runner_list`, `tag_protection_ensure`, `actions_secret_put` (write-only), `runner_registration_token` (token to the vault). |
| `vaults/fabrikk.enc.json`, `.sops.yaml` | Secrets the factory reads unattended (`fabrikk` vault): SOPS, encrypted to the factory's age key and each attester's YubiKey. Nothing in the repo names a home directory: the factory identity lives in the host's default sops keys file, and kubeconfig contexts are named, not pathed. |

Every adversary is used twice: to refine the plan before approval, and to review the output before the PR.

## Repositories

- **This repository is the monorepo.** fabrikk (skills, constraints, definition, workflows, extensions) and the products it
  builds (the seven products above) live here, so one commit pins both the code and the steering it was built under.
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
- Protected paths in Forgejo (human review required): `skills/`, `agent-constraints/`, `CLAUDE.md`, the `fabrikk` definition, review prompts, `docs/adr/`, `Makefile`, `compose.yaml`, `deploy/dev/`, `.forgejo/`, `cosign.pub`. The attestation checksums them.

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

`fabrikk-attest` signs the attestation (`attestation: fabrikk/v1`) as the annotated tag `attestation/<headSha>` on the
verified commit, with the attester's git signing key. Nothing is committed, so the verified commit, the attested commit,
and the PR head are one commit, as in swamp's own factory (`_reference/swamp`, `validate-attestation` in
`.github/workflows/ci.yml`). The branch and the tag are pushed together; the `pull-request` stage records the PR head and
sends the work item back to `implementing` if it is not the attested commit.

CI validates it on every push to the PR, without re-running the loop:

1. The tag `attestation/<PR head>` exists, points at the PR head, and `git tag -v` verifies it against the allowed
   attesters.
2. The JSON in the tag (`git for-each-ref refs/tags/attestation/<sha> --format='%(contents:body)'`) has
   `headSha` equal to the PR head.
3. `protectedPaths.sha256` equals `PATHS_DIGEST_RECIPE` (in `extensions/models/git_paths_digest.ts`) run at the PR head
   over `protectedPaths.paths`.
4. `protectedPaths.changed` equals `git diff --name-only <base>...<PR head> -- <paths>`. Non-empty means the PR needs a
   human on protected paths, whatever else is green.

The signature says who attested. Verification, review, and approval are summarized from swamp run data that CI cannot
read; the attestation says what the factory recorded, not that a third party checked it.

## Deliberately not in this set (not settled yet)

Ring/wave promotion and the fleet ledger; the environment factory's full adversary set; the concrete subject-naming
standard (lives in an ADR); domain content for products other than Sentral beyond the downstream-port pattern.

## Follow-up work

Paused before UAT (2026-09-17): UAT must run end to end against a real environment, and none exists yet. A factory run
currently gets through `releasing` and stops at `uat`.

### Next steps (2026-09-17)

Everything after `code-review` assumes a Forgejo that is not on the network yet: the pull-request stage has no tool to
open a PR or read a merge, no CI validates the attestation tag, and this checkout has no remote. Compared with swamp's
own factory (`_reference/swamp`, `.github/workflows/ci.yml`), that is the whole gap; the pre-merge half matches. In
order:

1. **Stand up the forge and put the repos on it.** Done on `git.dataverket.org` through the `forgejo` model
   (`@thomas/forgejo` plus `extensions/models/forgejo_actions.ts`, token in the `fabrikk` vault): `dataverket/fabrikk`
   and `dataverket/miljo` exist, `main` is pull-request only, and only `beddari` may push `attestation/*` tags.
   The org runner `dataverket-runner` (labels `ubuntu-latest`, `kata`; a Kata VM pod in `dataverket-prod`, see `runner_list`)
   is not the release runner: that is a second deployment in flux-bootstrap with the label `fabrikk-release` and the
   cosign key seeded into memory over FIDO SSH, never on disk (design in Follow-up work). The registry exists:
   zot at `registry.dataverket.org` (flux-bootstrap `artifacts/zot`, delivered gitless; anonymous pull, push for
   `fabrikk-ci`, whose credential the cluster repo owns and this vault copies as `registry/ci_username` and
   `registry/ci_password`). Left: that deployment, and the cosign key pair and registry credentials as Actions
   secrets (`actions_secret_put` from the vault).
2. **Add PR validation to CI.** A `.forgejo/workflows/` job on pull request that runs the four checks under
   Attestation, plus a protected `.forgejo/attesters` file for `git tag -v`. Bash only: no LLM, no swamp on the runner.
   Make it a required status check on `main`. This is fabrikk's `validate-attestation`; the review-integrity check
   comes later.
3. **Wire Forgejo into the `pull-request` stage with an existing extension.** Pull `@thomas/forgejo` (opens PRs, reads
   mergeability and head CI state, guarded merge) rather than build one, so `pull-request` and `merge` evidence come
   from the API, not from memory. The human still merges in Forgejo. `@shrug/forgejo` covers issues if work items
   become issue URLs.
4. **Run Sentral's first work item through the whole loop.** It brings `go.work`, the first module, `make check`,
   `make verify`, and `compose.yaml`, which makes `verifying` real, and is the first run of `release.yaml` on the real
   runner. Write `agent-constraints/implementation-conventions.md` first (swamp needed one).

Steps 1 and 2 are small and on the critical path. Step 4 can start in parallel up to `code-review`, but a work item
that stalls at `pull-request` wastes the loop, so Forgejo first.

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

- **The runner.** `dataverket-runner` is a pod in `dataverket-prod` (flux-bootstrap, `apps/forgejo-runners`): the
  forgejo-runner chart under the `kata` RuntimeClass, so a VM, with docker-in-docker and a Cinder volume for images.
  Jobs run as containers inside that VM. The release runner is a second deployment of the same chart with the label
  `fabrikk-release`; the PR runner never carries the key.
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

- `git.dataverket.org` hosts this monorepo, `miljo`, and `flux-bootstrap`, and is the source of record; Codeberg is a
  push mirror. Flux in `dataverket-prod` reads `flux-bootstrap` from the forge (since `ed79b27`, 2026-09-17). Lesson
  from that switch: `flux bootstrap` owns fields on the live `GitRepository` through server-side apply, so removing a
  field in git alone does nothing; rerun `bootstrap.sh` or patch the live object. Still needed: a runner labelled
  `fabrikk-release` (see Release signing key), the Dataverket registry, a cosign key pair (`cosign.pub` committed).
- The factory reaches `dataverket-prod` through Omni-issued kubeconfig contexts in the developer's default kubeconfig: context
  `fabrikk-readers` (default, `view` in `forgejo-runners` only) for observation, `dataverket-prod-admin`
  (cluster-admin, 30-day token) for setup work through models named after the cluster, e.g. `dataverket-prod-rbac`.
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
- The `releasing` stage defaults to `sentral`/`uat`; the work item's product should come from the plan or `change`
  evidence.
- Reference repositories: move the Zitadel ref to the pinned Zitadel image once one is chosen.
- CI attestation validation: a `.forgejo/workflows/` job on PR open and every push that runs the four checks in
  Attestation, plus an allowed-attesters file for `git tag -v` (`.forgejo/attesters`, protected) and a Forgejo tag
  protection rule for `attestation/*`. None of this exists yet.
- Shared swamp store: once Forgejo, the runner, and the registry exist, share fabrikk's swamp data through a remote
  datastore or `swamp serve` (swamp-club is swamp's own equivalent). Attestations are already swamp data, and CI could
  then check the verification, review, and approval records themselves instead of only the attestation's summary of
  them. The signed tag stays as the anchor in git.
- Review integrity: an LLM review, like swamp's, of changes to protected steering files (skills, constraints, review
  prompts, verification workflows) looking for weakened criteria, hidden content, and bypasses.
