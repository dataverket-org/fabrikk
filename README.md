# fabrikk

Dataverket's software factory.

fabrikk takes an outcome someone wants and carries it through planning, adversarial review, implementation,
verification, attestation, a pull request and a release, recording every step as data. It is built on
[swamp](https://github.com/swamp-club/swamp) and follows one idea: **the factory is a program; skills are its
context.** An agent does the work. The factory decides what the next step is, and a human approves the plan and the
merge.

It builds Dataverket, a sovereign open source datacenter automation system: Sentral first, then Maskin, Plattform,
Identitet, Tjeneste, Objekt and Nett ([design/products.md](design/products.md)). The factory and the products share
this repository, so one commit pins both the code and the steering it was built under.

## Getting started

[Set up a workstation](contributing/workstation.md) first. Then:

```sh
swamp model search --json | jq '.results[].name'                       # the model instances
task fabrikk.test                                                      # fabrikk itself: extensions, factory, workflows
swamp behavior run @swamp/stagecraft/work-item status <key>            # what a work item needs next
```

Start your coding agent in the repository and give it an outcome, not an implementation:

- _"A visitor at the front desk creates an organisation and is answered with its id."_
- _"A message delivered twice leaves an organisation's users as the first delivery left them."_

The agent plans it with you, the factory has the plan attacked, and you approve it. From there
[contributing/driving.md](contributing/driving.md) says what each stage needs.

## Learn more

[design/factory.md](design/factory.md) is the best place to start: the actors, the loop, what each stage does and
where its code is. [design/README.md](design/README.md) indexes the rest and says where each kind of knowledge lives.

## Core concepts

- **Work item**: an outcome, taken through the factory under one key. Its state is swamp data, never the agent's
  memory.
- **Stage**: a step of the loop with a `work` block: the agent does it, a reviewer is dispatched, or a swamp workflow
  runs. The definition is `models/@swamp/stagecraft/factory/slice.yaml`.
- **Gate**: a fact the factory checks before a work item may advance: an artifact exists, a review has no blocking
  finding, evidence was recorded, a human approved.
- **Skills**: what good looks like. The `architecture` skill is the tactical DDD pattern, and the one a reviewer
  works from; the `stagecraft` skill says how a work item is driven.
- **Design pages**: what is decided about the stack and how the factory works. The skills point at them.
- **The domain model**: what is being built, in the domain's own words. It lives in `domain/` and is the only home
  of domain rules.
- **Attestation**: a signed tag on the verified commit. CI validates it; CI never runs the loop.
- **Workbench**: the one machine that holds the agent, the code, the session stack and swamp.

## Test tiers

Where a test runs. The factory's `verifying` stage runs tiers 0 and 2 and pins the result to the commit.

| Tier | Run with | What runs | When |
|---|---|---|---|
| 0 | `task check` | SPDX headers, gofmt, `go vet`, the linter, and the unit tests of every module: in-process, no stack | Every edit |
| 1 | `task run`, with the first product | The services as plain processes on the session stack | By hand |
| 2 | `task verify` | The system tests: the images built from the commit, with their real dependencies in a private stack, driven from outside | Before the pull request |
| UAT | Not built | The released artifact on a real environment | After the merge |

## Layout

| Path | Holds |
|---|---|
| `design/` | How the factory works, and what is decided about messaging, persistence, identity and the products |
| `domain/` | The domain model: the glossary, the context map, the domain's decisions, the designs of the contexts, and the stories behind them |
| `contributing/` | How a person sets up a workbench, drives a work item, and operates the forge |
| `.agents/skills/` | The skills, one directory each; `.claude/skills/` symlinks to them |
| `agent-constraints/` | Per-stage conventions: what fabrikk asks of a plan, and how a change is handed over |
| `models/` | The factory definition and the other model instances, the reference list among them |
| `workflows/`, `extensions/` | The verify, attest and release workflows and the model types they use |
| `Taskfile.yml`, `scripts/` | The tasks a person and the factory both run (`task check`, `task verify`), and the scripts that do the work |
| `.forgejo/` | CI: attestation validation on every pull request, the release build after merge |
| `<product>/` | One Go module per product, joined by `go.work`. `sentral/` is the first |
| `_reference/` | Read-only clones of upstream code (ignored; `references sync`) |
| `_bin/` | Pinned tool binaries (ignored; `task tools`) |

Environment overlays live in [`miljo`](https://git.dataverket.org/dataverket/miljo), a separate repository with its
own owner. Every path that steers an agent or produces what ships is protected: a change needs a human in Forgejo,
and the attestation checksums it ([design/trust.md](design/trust.md)).

## Using fabrikk with AI agents

Any coding agent enrolled in `.swamp.yaml` can drive a run. The rules are in `AGENTS.md`, which `CLAUDE.md` imports;
the skills are in `.agents/skills/`. Enrol another tool with `swamp repo upgrade --tool <tool>`.

## Follow-up work

The loop is built through `pull-request`: a work item is done when its pull request is merged. No product code has
gone through it yet.

1. **Drive one small slice to a merge.** The first product code brings the module and its fragments, which makes
   `verify` real, and is the first run of `validate-attestation` and `release.yaml` on the real runners. Nothing
   else in the factory changes until this has happened.
2. **Close the design questions the slice needs.** Each stack page lists its own under **Open**: the subject
   taxonomy ([messaging](design/messaging.md)), how a person's data is erased and multi-fact saves
   ([persistence](design/persistence.md)), and most of the machine path ([identity](design/identity.md)).
3. **Make `validate-attestation` a required check** on `main` after its first run on a real pull request
   ([contributing/forge.md](contributing/forge.md)).
4. **The signing key, UAT and promotion** are designed and not built ([design/release.md](design/release.md)). UAT
   needs a real environment, and none exists. Before building them, compare with what the registry now holds:
   `@dataverket/signed-images` has workflows for a signed release, verifying one and promoting one, which may
   replace `extensions/models/release_artifact.ts` and the unwritten `fabrikk-promote`.

Smaller, in no order:

- Release, UAT and promotion as stages of the factory, once a UAT environment exists; `fabrikk-release` is written
  and no stage calls it.
- A tracker for Forgejo issues, as its own extension behind stagecraft's publisher; work items are tickets on the
  built-in tracker until then. It is planned in the swamp-extensions repository
  (`forgejo-stagecraft-tracker/PLAN.md` there), and this repository's token already reaches its issues.
- Archive the old `domain-model` repository read-only: the model moved to `domain/` without its history, and that
  repository holds the history and the tag `v0.5.0-parked`.
- A line of its own for model and steering changes, once `validate-attestation` is a required check on `main`:
  until then a change to `domain/`, `design/` or a skill is a pull request a person reviews.
- A fast lane for a fix with a reproduction and no protected-path change. Every work item takes the full loop today.
- Move the Zitadel reference to the pinned Zitadel image once one is chosen.
- A timed-out task is killed, but the script it started and that script's children keep running.
- Lint `scripts/` with shellcheck in `task fabrikk.test`; today it is run by hand.
- Share fabrikk's swamp store with CI, so it can check the run records and not only the attestation's summary.
- An LLM review of changes to protected steering files, like swamp's review-integrity check.
