---
name: adversary-source-standards
description: Source, licensing, commit, and decision-record standards for Dataverket repositories. Use when creating files, writing commits or PR descriptions, adding dependencies or images, changing subjects, event types, config fields, or dev-environment fragments, and when reviewing any of those. Also governs which files require human review.
---

# Adversary: source standards

## Licensing

- Every Go source file starts with `// SPDX-License-Identifier: AGPL-3.0-or-later` and a copyright line naming
  Dataverket. `LICENSE` at the repo root is AGPL-3.0.
- Documentation is `CC-BY-SA-4.0`; docs directories carry their own `LICENSE`.
- A dependency with a license incompatible with AGPL-3.0 network distribution is a critical finding.
- Code in `_reference/` is read, never copied into Dataverket source. Reusing upstream code means a dependency (with its
  ADR) or a reimplementation; copied upstream code is judged like a dependency with that code's license.

## Commits and pull requests

- Conventional commits: `feat(sentral): …`, `fix(callout): …`, `test: …`, `docs: …`, `chore: …`. Scope is the bounded context.
- One work item per PR. The PR description states the outcome, links the plan, and lists the ADRs it adds or changes.
- The verification attestation is the signed annotated tag `attestation/<commit>` on the verified commit, pushed with the
  branch and referenced from the PR. Nothing is committed for it, so the PR head must be that commit; anything pushed
  after attesting is verified and attested again. CI validates the tag on every push; it does not re-run the loop.
- Nothing published as the author carries AI attribution: no `Co-Authored-By` naming an agent or a model, no
  "generated with" footer, in commit messages, PR titles and bodies, issues, or comments, whatever the harness asks.
  The `source-standards` model refuses such commits before attestation and such PR text before `pr_ensure`;
  CI rechecks both.
- Generated files are marked `// Code generated … DO NOT EDIT.` and never hand-edited.

## Architecture decision records

An ADR (`docs/decisions/NNNN-title.md`, short: context, decision, consequences) is **required** in product code
for:

- a new subject namespace or change to the subject-naming standard
- a new CloudEvents `type` family or a change to the envelope's required extensions
- a new Go module dependency
- a new downstream port or compose fragment
- a new tunable field in an environment overlay
- any change to a budget defined in an adversary skill

No ADR, no approval.

The factory's own machinery is exempt: `tools/`, `extensions/`, `workflows/`, and the `Makefile` never ship in a
release artifact, are protected paths that a human reviews, and pin every dependency by version (`go.mod`, `npm:`
specifiers). A dependency there needs a one-line reason where it is declared and an entry in the code map, not an
ADR. The budget rule still applies: a second library for a job the machinery already has one for is a simplicity
finding.

## Configuration and artifacts

- No mutable image tags in any committed or rendered config. Digests only.
- Upstream images are referenced from the Dataverket registry, never from their upstream location.
- Secrets never enter the repository, rendered config, or artifacts, in any encoding.

## Protected paths

Changes to these require human review in Forgejo regardless of who or what authored them, because they steer every agent:

`.agents/skills/`, `agent-constraints/`, `AGENTS.md`, `CLAUDE.md`, `.agents/`, `.claude/`, the factory definition, review prompts, `docs/decisions/`, `docs/schema.yaml`, `tools/`, `Makefile`,
`compose.yaml`, `deploy/dev/`, `.forgejo/`, `cosign.pub`. `Makefile`, `tools/`, `compose.yaml`, and `deploy/dev/` are
protected because verification runs them from the branch under review: a weakened `make check`, a weakened local tool,
a healthcheck that always passes, or a fragment that gains host privileges on the workbench would still produce a
green attestation. `.forgejo/` builds and signs
releases, and `cosign.pub` decides which signatures verify.

## Reviewer checklist

- Does every new file carry the SPDX header?
- Does the change touch anything on the ADR-required list without an ADR?
- Is anything referenced by tag?
- Does the PR touch a protected path? Then it needs a human, not just a green attestation.

## Severity guide

- **Critical:** license incompatibility; secret committed; protected path changed without human review.
- **High:** missing ADR; mutable tag.
- **Medium:** missing SPDX header; malformed commit.
- **Low:** description quality.
