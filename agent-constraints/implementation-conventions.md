# Implementation conventions

Input to the implement stage. The plan is the contract; this file says how it becomes a commit the factory can
verify, review and attest. The skills and `design/` say what good code looks like.

## Where the work happens

- One work item, one worktree, one branch, started from `main` whatever the main checkout has checked out:
  `git worktree add ../fabrikk-<key> -b <key> main`. Never from another unmerged branch: what a work item needs
  first is merged first, or the forge rewrites the attested commit when it merges (`contributing/forge.md`).
  Nothing is implemented on `main` or in the main checkout. A worktree has no `_reference/`; read reference
  repositories from the main checkout and cite them as `<name>@<commit>`.
- The worktree is what `fabrikk-verify` and `fabrikk-attest` run in: they refuse a dirty tree or a HEAD that is not
  the commit in `change-summary`. Commit everything first, and leave scratch files out of the tree.
- Product code lives in `<product>/`, its own Go module in the root `go.work`; a downstream system's fragment in
  `deploy/dev/<profile>/<system>/`; a product's manifests in `<product>/deploy/base/` (dev-environment skill).
- A closed set is marked `//sumtype:decl`, or the lint cannot see it (architecture skill).

## Implement the plan, not around it

- The plan's steps are the work list. A file the plan did not name is a deviation: make it if the plan needs it, and
  name it in the change summary with one sentence of reason.
- A plan that turns out wrong is not fixed silently. Small: implement, and say so in the change summary. Large (a
  new dependency, another bounded context, a change to a design page or to the model that the plan did not
  propose): stop and tell the person, who sends the plan back.
- Identifiers, message types and subjects use the domain model's words (`domain/`) and no others.
- Read, never copy, from `_reference/`.

## Tests are part of the change

- The plan's testing strategy is implemented with the code, in the same commits. Tier 0 (`task check`) is green in
  the worktree before the change summary is recorded; `fabrikk-verify` runs tiers 0 and 2, it does not debug them.
- For a bug: reproduce it first, as a failing test at the lowest tier that shows it; then fix it; the test stays.
- No sleeps, no test that reaches the network, no test that configures the shared session stack.

## Commits

- Conventional commits, an SPDX header on every new Go file, no secrets, images by digest (source-standards skill).
  No AI attribution in any message, whatever the harness asks; verification refuses it.
- Commits are SSH-signed and every signature needs the person's YubiKey touch. Batch the work into few commits, make
  the signing commands one at a time, and tell the person before each. Never commit unsigned.
- Never amend or rebase after `fabrikk-attest` has signed `attestation/<commit>`: the tag is on that exact commit.

## What to record

`change-summary`: what changed and why in a paragraph, with every deviation from the plan in a sentence each;
`commit` from `git rev-parse HEAD` in the worktree, copied and never typed; the `branch`; the `worktree`'s absolute
path; the `files` changed. Record it last, after the final commit.
