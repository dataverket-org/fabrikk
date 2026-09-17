# Implementation conventions

Input to the implementing stage. The plan is the contract; this file says how the implementer turns it into a commit
the factory can verify, review, and attest. What reviewers attack is in `adversarial-dimensions.md`; the skills say
what good code looks like. This file does not repeat either.

## Where the work happens

- One work item, one worktree, one branch. From the main checkout: `git worktree add ../fabrikk-<workItem> -b <workItem>`.
  Nothing is implemented on `main` or in the main checkout. Work-item worktrees have no `_reference/`; read reference
  repositories from the main checkout (`git worktree list`, first entry) and cite them as `<name>@<commit>`.
- The worktree is what `fabrikk-verify` and `fabrikk-attest` run in: they refuse a dirty tree or a HEAD that is not the
  recorded `headSha`. Commit everything before recording `change` evidence; leave scratch files out of the tree.
- Product code lives in `<product>/`, its own Go module in the root `go.work`; downstream fragments in `deploy/dev/<system>/`;
  manifests in `<product>/deploy/base/`. The first work item of a product brings the module, `go.work`, `make check`,
  `make verify`, and `compose.yaml` with it (dev-environment skill).

## Implement the plan, not around it

- The plan's file breakdown is the work list. A file the plan did not name, or an estimate exceeded by more than a
  third, is a deviation: implement it if it is what the plan needs, and name it in the change summary with one
  sentence of reason. Reviewers compare actual LOC with the plan; unexplained growth is a simplicity finding.
- A plan that turns out wrong is not fixed silently. Small: implement, record the deviation. Large (a different bounded
  context, a new dependency, a new port, anything on the ADR-required list): stop, and take the work item back to
  planning through the human rather than through the code.
- Every design choice not the default in a skill was justified in the plan. Do not add new ones during implementation.
- Read, never copy, from `_reference/`. Reusing upstream code is a dependency with an ADR, or a reimplementation.

## Tests are part of the change

- The plan's testing strategy by tier is implemented with the code, in the same commit series. Tier 0 (`make check`)
  is green in the worktree before `change` evidence is recorded; `fabrikk-verify` runs tiers 0 and 2, it does not debug them.
- Security-relevant behavior gets a black-box test at the tier the plan names. Fakes run through the contract suite.
- For a bug: reproduce first, as a failing test at the lowest tier that shows it; then fix; the test stays.
- No sleeps, no tests that reach the network or the long-lived dev Zitadel, no server-configuring tests on the shared stack.

## Commits

- Conventional commits scoped to the bounded context, SPDX header on every new Go file, no secrets, digests not tags
  (source-standards skill). One logical change per commit; the series reads as the plan's steps.
- Commits are SSH-signed and each signature needs the attester's YubiKey touch. Batch work into few commits and make
  the signing commands one at a time, telling the human when to touch.
- Never amend or rebase after `fabrikk-attest` has signed `attestation/<headSha>`: the tag is on that exact commit.
  Anything pushed after attesting goes back through implementing, verifying, review, and a new attestation.

## What to record

- `change-summary`: one paragraph on what changed and why, every file with its actual LOC, the total, the ADRs added
  or changed, and the deviations from the plan (in `summary`, each in one sentence).
- `change` evidence: `worktree` (absolute path), `branch`, and `headSha` from `git rev-parse HEAD` of the worktree,
  copied, not typed. Record it last, after the final commit; a stale `headSha` fails verification at preflight.
