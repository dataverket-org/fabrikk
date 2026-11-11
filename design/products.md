---
audience: everyone, agent
---

# Products

What Dataverket's services are called, and how fabrikk reads the domain model that says what they do.

## The services

Each service has one Norwegian noun as its authoritative name. The name is also its brand.

| Service | Purpose | Directory |
|---|---|---|
| **Sentral** | Control plane, orchestration, billing | `sentral/` |
| **Maskin** | Compute: VMs and bare metal | `maskin/` |
| **Plattform** | Kubernetes platform | `plattform/` |
| **Identitet** | Identity and access management | `identitet/` |
| **Tjeneste** | Application and service deployment (SaaS layer) | `tjeneste/` |
| **Objekt** | Object storage (S3-compatible) | `objekt/` |
| **Nett** | Datacenter network automation and tenant network products | `nett/` |

- The names are the stable identifiers across documentation, CLI tooling, subjects and code. The lower-cased name is
  the `<service>` value wherever a subject, an identity-provider project, or a policy names a service.
- Each service is its own Go module in its own directory, joined by the root `go.work`, and is released as its own
  artifacts. None has code yet; Sentral is first.
- A new service follows the pattern and is added by changing this table.

**Why.** Norwegian institutional naming, in the tradition of "Vegvesenet" and "Jernbaneverket", was chosen for the
parent organisation; a single descriptive noun per service is consistent with it and may become a subdomain under
`dataverket.org`. The names were decided on 2026-03-08, before this repository existed.

## The domain model

What the services do is the **Dataverket domain model**: a repository of its own
(`git.dataverket.org/dataverket/domain-model`), read here as the `domain-model` reference under
`_reference/domain-model`. It holds the ubiquitous language, the context map, the domain's decisions and the designs
of the bounded contexts. It names no technology. It is authoritative over every skill and page here where they differ.

| Question | Page in the model |
|---|---|
| What does a word mean? | `control-plane/language/README.md` and its sections |
| Which contexts exist and what crosses between them? | `control-plane/map/README.md`; one page per boundary |
| What does a context do? | `control-plane/design/<context>/`: commands, policies, read models, aggregates, events |
| What does every slice have to keep? | `for-implementors/README.md`: the binding rules, one clause and a link each |
| What crosses an account? | `control-plane/decisions/integration-contract.md` |
| Why is a rule what it is? | The story that found it, `control-plane/story/stories/` |
| What did the model's reviews find about mechanism? | `for-implementors/implementation-notes.md`: findings, not decisions |

Rules for reading it:

- **Cite, never restate.** A plan, a skill and a page here link a rule by page and heading. The model's decisions
  stay in the model; they are not copied into this directory.
- **Pinned by commit.** `models/@dataverket/reference-repos/references.yaml` names the commit. Moving the pin is a
  change to a protected path, reviewed like any other.
- **The model learns from the code.** A slice that needs a word, a rule or a boundary the model lacks, or finds one
  that does not hold up in code, proposes the change in its plan (`modelChanges`). The human decides with the plan
  approval, the change is made in the model's repository, and the slice's branch moves the pin. Code never invents a
  domain word, and a model change never arrives unreviewed.

## What the model leaves to fabrikk

- **The landing zone:** which service holds which context. The model's contexts are not services. Sentral is the
  first service, and a slice's plan says which context it brings up as an `internal/<context>/` package of the
  `sentral` module.
- **The stack:** how messages are shaped ([messaging.md](messaging.md)), where state lives
  ([persistence.md](persistence.md)), and how a connection is identified ([identity.md](identity.md)).

## Two words the model and fabrikk agree on

- **Worker**, never *agent*, for a Dataverket process adjacent to the infrastructure it manages. In fabrikk *agent*
  names the session that drives the factory.
- **Admission**, for the auth callout's act: it identifies a connection's actor, places the connection in exactly one
  account, and writes the permissions that bind the actor to it. The callout is the mechanism; admission is the word.
