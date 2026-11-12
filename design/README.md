# Design

What fabrikk is and how Dataverket code is built, in the present tense. A page belongs here only if it answers one of
two questions:

- **How does this part of the factory work?** The loop, the attestation, the release.
- **What is decided about how product code lands on the stack?** Messaging, persistence, identity, the products.

Anything else is a line in [operations.md](operations.md), a how-to in [`contributing/`](../contributing/), or needs
no page. There are no `decisions/`, `proposals/` or `archive/` folders: a page states the current design with a short
_Why_, and git holds the history. A decision changes by changing its page in a pull request. `design/` is a protected
path, because the skills point here and every plan and review reads it.

## Where each kind of knowledge lives

Everything that steers the work is one of five kinds. Each has one home, and nothing is stated twice.

| Kind | Home | Test for a sentence |
|---|---|---|
| **Program**: what must always happen, and proof that it did | `models/@swamp/stagecraft/factory/fabrikk.yaml`, `workflows/`, `extensions/`, `.forgejo/`, `Taskfile.yml`, `scripts/` | "Did the tests run" is never prose |
| **Pattern**: tactical DDD words and Go shapes | `.agents/skills/architecture/` | Still true for bike rental on another broker |
| **Stack**: how the pattern lands on PostgreSQL, JetStream, CloudEvents, Zitadel and the STS | `design/messaging.md`, `design/persistence.md`, `design/identity.md`; the mechanism is Go code in `internal/platform` | Names a technology and no domain noun |
| **Domain**: words, contexts, aggregates, invariants | The domain model, [`domain/`](../domain/README.md), nowhere else | Names an organisation, an agreement, the front desk |
| **Stage conventions and review technique** | `agent-constraints/`, the review prompts in the factory definition | Says what a plan, a change or a finding must look like |

Three rules follow.

- **Trust comes from the program and only from there.** A skill or a page may refer to a process; the definition
  enforces it. A rule that can be checked is a check in `task check` or a workflow, not a reviewer's job.
- **The skills hold no domain rule.** They point at the model's binding list (`domain/README.md`). A skill
  is clean when it would work unchanged for the next product.
- **The stack is mostly code.** A rule every handler must follow is one function in `internal/platform` that no
  handler can bypass, extracted when a second slice needs it. The page here says what is decided; the code does it.

## A decision changes the page that states it

There is no decision log. A change to how the system is built changes the page that owns it, in the same pull
request, and a change of this kind without its page is not approved.

| Change | Page it changes |
|---|---|
| A new subject namespace, a change to the taxonomy, a new `type` family, a change to the envelope | [messaging](messaging.md) |
| Where state lives, a bucket or mirror layout, what the second copy holds | [persistence](persistence.md) |
| An issuer, a token, an audience, what admission accepts | [identity](identity.md) |
| A new service, or which context a service holds | [products](products.md) |
| How an image is built, a layer of config, a tunable field in an environment overlay | [release](release.md) |
| A word, a rule or a boundary of the domain | `domain/`, in the page that owns it |
| A new downstream system or dev fragment | The dev-environment skill's fragment table |

A new Go module dependency carries a one-line reason where it is declared. The domain model's decisions stay in the
model and are cited, never copied here ([products](products.md)).

## Layout

```
design/
  README.md        this file
  factory.md       the actors, the loop, the stages, the boundary
  trust.md         the signed attestation tag and what CI checks
  release.md       build once after merge, the config join, promotion
  products.md      the seven services, and how fabrikk reads the domain model
  messaging.md     CloudEvents, commands and replies, subjects, the handler shape
  persistence.md   a key-value bucket as the working record, its mirror, PostgreSQL as the second copy
  identity.md      Zitadel for humans, workload identity for machines, admission
  operations.md    one entry each for parts that get no design page
contributing/      how a person sets up a workbench, drives a work item, operates the forge
domain/            the domain model: what is being built, in the domain's own words
```

Every page starts with a header:

```yaml
---
audience: operator | contributor | agent | everyone   # comma list allowed
last-verified: 2026-09-18 @ 5a55161                    # a person checked the page against the code at that commit
---
```

`last-verified` is carried only by pages that make claims about code. A pull request that changes what a page
describes bumps it. The stack pages carry none until the code they describe exists.

## Writing style

- Plain English, one idea per sentence, present tense. Say what is decided, not when or what it replaced.
- Say each thing once, in the page that owns it. Link to the model by page and heading; never restate it.
- A page that has open questions lists them under **Open**, with a recommendation where there is one. An open
  question is closed by the human, in a pull request that moves it into the page's body.
- A page whose design reaches further than any slice has built says so. What a slice is held to stands first;
  the rest goes under **Planned, not built**, each piece with the trigger that makes it due. A decided page is
  something every review enforces, so what is not due yet must not read as decided.
- Diagrams are Mermaid in fenced blocks and show a mechanism. If a table says it better, use the table.
- Commands are real and copy-pasteable. Do not copy flag lists that `swamp help <command>` already gives.
- Documentation under `design/`, `domain/` and `contributing/` is CC-BY-SA-4.0 ([LICENSE](LICENSE)); code is
  AGPL-3.0.

## Index

### The factory

| Page | Notes |
|---|---|
| [factory](factory.md) | Start here |
| [trust](trust.md) | The protected-path list lives here; the attest workflow's default must equal it |
| [release](release.md) | `uat` and `promoting` are not built; the signing key design is not built |
| [operations](operations.md) | Extensions, model instances, the vault, CI files |

### What is built

| Page | Notes |
|---|---|
| [products](products.md) | Service names; the domain model's pin; what the model leaves to fabrikk |
| [messaging](messaging.md) | Subject taxonomy is open |
| [persistence](persistence.md) | A slice builds the bucket only. The mirror, the second copy and the operating rules are planned, each with its trigger |
| [identity](identity.md) | The machine path is decided in outline only; most of it is open |
