# The Dataverket domain model

The domain model of Dataverket, written and agreed with the domain owner: one domain, with the control plane as the subdomain every product depends on, and the products as what a provider delivers. Nothing here is implementation and nothing here names a technology. It is authoritative over every skill and design page in this repository where they differ; [`design/products.md`](../design/products.md) says how a slice reads it and how a slice changes it.

Each directory is one kind of page. A rule is stated once, in the page that owns it, and every other page links to it.

## Start here

| If you are | Read |
|---|---|
| Building a slice | The binding rules below, then the design of the context the slice is in |
| Looking up a word | [The glossary](control-plane/language/README.md) |
| Looking for why a rule is what it is | [The stories](control-plane/story/README.md), each with its hotspots |
| Continuing the modelling | [The method](method/README.md), [the working rules](method/working-rules.md) and [where it stands](open.md) |

## What is where

| Directory | Holds | Open with |
|---|---|---|
| `control-plane/story/` | Nine stories, told as a provider's business with no software in it, and the timeline of every event they found | [The story](control-plane/story/README.md) |
| `control-plane/language/` | The glossary: what every word means; the words avoided; the system's own words | [The glossary](control-plane/language/README.md) |
| `control-plane/map/` | The context map, Person, Organisation, Catalogue and Audit with Tenancy beneath, and one page per boundary with what crosses it | [The map](control-plane/map/README.md) |
| `control-plane/decisions/` | What every context depends on: context, decision, consequences | [The decisions](control-plane/decisions/README.md) |
| `control-plane/design/` | Organisation, Catalogue and Tenancy, each in Stack's order: commands, policies, read models, aggregates, events | [Organisation](control-plane/design/organisation/README.md) |
| `method/` | How a subdomain is discovered and its pages written; the seam any product must answer; the working rules; the security review | [The method](method/README.md) |
| `open.md` | Where the modelling stands, what is next, the open questions, the known tensions, what is parked | [Open](open.md) |

| Kind of rule | Home |
|---|---|
| What a word means | Its glossary entry |
| What a context does | That context's design |
| What crosses a boundary | [The integration contract](control-plane/decisions/integration-contract.md) and the boundary page on the map |
| What a product must answer | [The seam](method/seam.md) |
| Why a rule is what it is, and what was rejected | The hotspots of the story that found it |

## Reading it for a slice

- **Read in this order:** [the words beneath the story](control-plane/language/system-words.md), which every design page uses and nothing else may; [the whole map](control-plane/map/README.md) and [the seam](method/seam.md); the five decisions a slice depends on, [the provider as a tenant](control-plane/decisions/provider-tenant.md), [audit](control-plane/decisions/audit.md), [reads](control-plane/decisions/reads.md), [the integration contract](control-plane/decisions/integration-contract.md) and [the seam languages](control-plane/decisions/seam-languages.md); then [Tenancy](control-plane/design/tenancy/README.md) whole, [Organisation's design](control-plane/design/organisation/README.md) and [Catalogue's read models](control-plane/design/catalogue/read-models.md).
- **The line.** A page holds facts and the contract: who publishes what, what a reader keeps, what a message carries. It never holds the mechanism. What is decided about the stack is in fabrikk's `design/`, and a finding about mechanism that a story or a review turns up goes to the **Open** list of the design page it concerns, never into a page here.
- **Deliberately not decided here, and fabrikk's:** which service holds which context, the landing zone; the subject taxonomy and the CloudEvents profile; where state lives; the mechanics of authorisation.
- **The example product, one seam.** No real product is designed yet; the example product is what the control plane can see of any. A product's contexts add rows to the integration contract and answer the seam, and the control plane's rows do not change for them.

## Decided, and binding on the slice

Each line is the rule in one clause; the page linked holds it in full.

- One tenant per organisation, one account per tenant; every instance pins one tenant but admission and Tenancy. [The provider as a tenant](control-plane/decisions/provider-tenant.md).
- The installation's organisation owns the installation's account and the front desk, provides the control plane, and is told apart from a provider by nothing else; *provider* is a role in an agreement. [Who's who](control-plane/language/who.md).
- Every organisation holds an agreement with the installation from *Organisation created* and closes by offboarding it, under its policy's closing rule or the installation's dormancy, with a notice that lapses if a product is taken. [Organisation's commands](control-plane/design/organisation/commands.md).
- The front desk exports *accept installation terms*, *validate* and *create organisation*; an organisation's account exports the first two as well. [The first message](control-plane/design/tenancy/first-message.md).
- A login spans organisations, a user lives in one, validation is the login's once, Person recognises a person by the external ID and tells no one, and the installation's limit counts organisations a person is an owner in. [Person and Organisation](control-plane/map/person-and-organisation.md).
- Owner is granted only to a validated login; every other role to any user, applying only while the organisation policy's requirement is met. [Organisation's commands](control-plane/design/organisation/commands.md).
- An agreement is born on *Terms accepted* and active when every condition for activation the provider's policy names is met; a held one is declined by offboarding. [Organisation's policies](control-plane/design/organisation/policies.md).
- The quota is the operator's ceiling, one number per count, from the announcement's default; a product's acceptance reads the agreement entry and nothing else. [Reads](control-plane/decisions/reads.md).
- Every offboarding carries the terms' notice; the product ends what is still held at its end and answers *Organisation cleared* as soon as it holds nothing, on which the terms end. [The seam](method/seam.md).
- The integration contract's tables are the only things that cross accounts, one copy per organisation a fact concerns. [The integration contract](control-plane/decisions/integration-contract.md).
- Admission binds the actor to its connection and places it; the receiving instance authorises every command by role, duty and command class. [Words beneath the story](control-plane/language/system-words.md).
- An audit entry is the envelope and never the payload; a record is append-only, enforced by the installation; the party an act concerns receives every entry as it happens. [The audit decision](control-plane/decisions/audit.md).
- A message may arrive twice and a projection is a set. [Reads](control-plane/decisions/reads.md).
- A product reports with the control plane's commands and is told in its words; a command is answered by a reply; a resource is named by its product and the product's own id. [The seam languages](control-plane/decisions/seam-languages.md).

## Where it came from

The model was developed in a repository of its own, `domain-model`, and moved here at that repository's commit `a628a38`, without its history. That repository is kept as an archive: it holds the history before the move and the tag `v0.5.0-parked` ([open.md](open.md)).

Further reading the model rests on: Alberto Brandolini, *Introducing EventStorming*; Eric Evans, *Domain-Driven Design*, part IV on strategic design; Vaughn Vernon, *Implementing Domain-Driven Design*, chapters 2 and 3 on subdomains and context maps; Michael Stack, *Event-Driven Architecture in Golang*, 2022, the domain owner's reference for the order inside a context.
