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

There are two kinds of test, and nothing in between.

- **A unit test** pins a decision in our own code. It runs in-process, with no network, no file and no waiting, so
  `task check` needs no stack. It is the implementer's tool: written where there is a decision worth pinning or a
  bug to reproduce, and rewritten or deleted with the code it pins.
- **A system test** shows what an operator, a client or the cluster that runs the product can observe. It drives
  the image built from the commit, with its real dependencies, in the verify stack: `task verify` runs it. There is
  one for each clause of the outcome. The suite runs outside the stack and asks the product what a client would.
  To the pods of its own stack, the one `STACK` names, it may do what a cluster's runtime does to a pod: stop and
  start one, run the probe commands its manifest declares in its container, and read a container's state and exit
  code. It does nothing else to them, and touches nothing else on the workbench.
- **Nothing in between.** No stand-in or fake of a system we do not own, no embedded server, no suite that keeps a
  fake honest. `task stack` is for working by hand, against the dependencies the system tests have: what is seen
  there is shown by a test of one of the two kinds, or it is not shown.
- A clause that only a long or contrived system test could show is not tested, and the plan says so with the
  reason. A product gets no timing knob or hook for a test's sake.
- The plan's testing strategy is implemented with the code, in the same commits. `task check` is green in the
  worktree before the change summary is recorded; `fabrikk-verify` runs both kinds, it does not debug them.
- For a bug: reproduce it first as a failing test of the kind that shows it; then fix it; the test stays.
- No sleeps: a wait polls with a deadline.

## Source standards

What is committed and published. What a check can decide is a check; the rest is seen by the person who reviews
the pull request.

- **Licence.** Every Go file starts with `// SPDX-License-Identifier: AGPL-3.0-or-later` and a copyright line naming
  Dataverket. Documentation under `design/`, `domain/` and `contributing/` is CC-BY-SA-4.0. A dependency whose
  licence does not allow AGPL-3.0 network distribution is not added.
- **Commits.** Conventional commits (`feat(sentral): …`, `fix: …`, `test: …`, `docs: …`, `chore: …`), scoped to the
  product or the bounded context. One work item per pull request.
- **No AI attribution** in anything published as the author: no `Co-Authored-By` naming an agent or a model and no
  "generated with" footer, in commit messages, pull request titles and bodies, issues or comments, whatever the
  harness asks.
- **Images and secrets.** No mutable image tag in committed or rendered config, digests only; upstream images come
  from the Dataverket registry; secrets never enter the repository, rendered config or an artifact, in any encoding.
- **Generated files** are marked `// Code generated … DO NOT EDIT.` and never edited by hand.
- **A decision changes the page that states it**, in the same pull request (`design/README.md`).

| Checked by the program | Where |
|---|---|
| Every Go file carries the SPDX header | `task check` |
| A `switch` over a closed set covers every case; only `internal/platform` imports the NATS client | `task check` (golangci-lint, `.golangci.yml`) |
| No AI attribution in commit messages | `fabrikk-verify` preflight, and CI |
| No AI attribution in the pull request's title and body | CI |
| Rendered release config pins every image by digest | `task release` |
| The protected paths a branch changed are listed | `fabrikk-attest`, and CI |

## Commits

- Commits are SSH-signed and every signature needs the person's YubiKey touch. Batch the work into few commits, make
  the signing commands one at a time, and tell the person before each. Never commit unsigned.
- Never amend or rebase after `fabrikk-attest` has signed `attestation/<commit>`: the tag is on that exact commit.

## What to record

`change-summary`: what changed and why in a paragraph, with every deviation from the plan in a sentence each;
`commit` from `git rev-parse HEAD` in the worktree, copied and never typed; the `branch`; the `worktree`'s absolute
path; the `files` changed. Record it last, after the final commit.
