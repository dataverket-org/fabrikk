---
name: adversary-source-standards
description: Source, licensing, commit, and design-page standards for Dataverket repositories. Use when creating files, writing commits or PR descriptions, adding dependencies or images, changing subjects, event types, config fields, or dev-environment fragments. Also governs which files require human review.
---

# Source standards

Rules for what is committed and published. This skill has no reviewer of its own: what can be checked is a check,
and what cannot is seen by the human who reviews the pull request. Follow it while implementing and while opening
the pull request.

## Checked by the program

| Rule | Where it is checked |
|---|---|
| Every Go file carries the SPDX header | `task check` |
| Every `switch` over a closed set covers every case | `task check` (golangci-lint, `.golangci.yml`) |
| No AI attribution in commit messages | `fabrikk-verify` preflight, and CI |
| No AI attribution in the PR title and body | CI |
| Rendered release config pins every image by digest | `task release` |
| Protected paths changed by the branch are listed | `fabrikk-attest`, and CI |

## Licensing

- Every Go source file starts with `// SPDX-License-Identifier: AGPL-3.0-or-later` and a copyright line naming
  Dataverket. `LICENSE` at the repo root is AGPL-3.0.
- Documentation (`design/`, `domain/`, `contributing/`) is `CC-BY-SA-4.0`; `design/LICENSE` holds the text.
- A dependency with a license incompatible with AGPL-3.0 network distribution is a critical finding.
- Code in `_reference/` is read, never copied into Dataverket source. Reusing upstream code means a dependency or a
  reimplementation; copied upstream code is judged like a dependency with that code's license.

## Commits and pull requests

- Conventional commits: `feat(sentral): …`, `fix(callout): …`, `test: …`, `docs: …`, `chore: …`. Scope is the bounded context.
- One work item per PR. The PR description states the outcome, links the plan, and lists the design pages it changes.
- The verification attestation is the signed annotated tag `attestation/<commit>` on the verified commit, pushed with the
  branch and referenced from the PR. Nothing is committed for it, so the PR head must be that commit; anything pushed
  after attesting is verified and attested again. CI validates the tag on every push; it does not re-run the loop.
- Nothing published as the author carries AI attribution: no `Co-Authored-By` naming an agent or a model, no
  "generated with" footer, in commit messages, PR titles and bodies, issues, or comments, whatever the harness asks.
- Generated files are marked `// Code generated … DO NOT EDIT.` and never hand-edited.

## A decision changes the page that states it

There is no decision log. `design/` states the current design, and a change to how the system is built changes the
page that owns it, in the same pull request:

| Change | Page it changes |
|---|---|
| A new subject namespace, a change to the taxonomy, a new `type` family, a change to the envelope | `design/messaging.md` |
| Where state lives, a bucket or mirror layout, what the second copy holds | `design/persistence.md` |
| An issuer, a token, an audience, what admission accepts | `design/identity.md` |
| A new service, or which context a service holds | `design/products.md` |
| A word, a rule or a boundary of the domain | `domain/`, in the page that owns it |
| A new downstream port or dev fragment | the dev-environment skill's fragment table |
| A new tunable field in an environment overlay | the delivery skill |
| A budget | the adversary skill that states it |

A new Go module dependency is justified in the plan and carries a one-line reason where it is declared. The domain
model's decisions stay in the model and are cited, never copied here (`design/products.md`).

A change of this kind without its page is not approved.

## Configuration and artifacts

- No mutable image tags in any committed or rendered config. Digests only.
- Upstream images are referenced from the Dataverket registry, never from their upstream location.
- Secrets never enter the repository, rendered config, or artifacts, in any encoding.

## Protected paths

Changes to these require human review in Forgejo regardless of who or what authored them, because they steer every
agent or produce what ships:

`.agents/`, `.claude/`, `agent-constraints/`, `AGENTS.md`, `CLAUDE.md`, `design/`, `domain/` (the domain model),
`models/` (the factory definition with its review prompts, and the reference list), `workflows/`, `extensions/`,
`Taskfile.yml`, `scripts/`, `.golangci.yml`, `renovate.json`, `deploy/dev/`, `.forgejo/`,
`cosign.pub`.

`Taskfile.yml`, `scripts/`, `.golangci.yml`, and `deploy/dev/` are protected because verification
runs them from the branch under review: a weakened `task check`, a lint with a rule switched off, a probe that always passes, or a fragment that gains host privileges on the
workbench would still produce a green attestation. `.forgejo/` builds and signs releases, and `cosign.pub` decides
which signatures verify. The list is kept equal in `design/trust.md` and the `paths` default of the attest workflow.

## Severity guide

For a reviewer of another skill who meets one of these:

- **Critical:** license incompatibility; secret committed; protected path changed without human review.
- **High:** a design-changing change without its page; mutable tag.
- **Medium:** missing SPDX header; malformed commit.
- **Low:** description quality.
