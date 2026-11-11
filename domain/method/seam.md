# The seam

Where a product meets the control plane. Each row is a published language in one direction or the other, and the control plane knows a product only by its answers here. A product's discovery ends when every row has an answer; a product's `README.md` carries its answers.

## At a glance

- **Four rows, and the terms before them.** A product is taken by an organisation accepting its terms, which the provider publishes beside it; a product's acceptance refuses an organisation whose terms for it have expired. Three rows are the agreement's: quota, suspension and offboarding. One is what the product reports to a control-plane context: catalogue. Every row is written in the control plane's language: a product reports with the control plane's commands and is told in its words, see [the seam decision](../control-plane/decisions/seam-languages.md).
- **Rules every product inherits** without asking: tenancy, the integration contract, audit, roles and organisation policy, being told of everything.
- **The seam is a hypothesis until a real product confirms it.** The example product answers every row with what the control plane can see of any product; [taking the example product](../control-plane/story/stories/taking.md) confirmed from the control plane's side that a product's acceptance reads the agreement entry and nothing else.
- **The control plane is itself a product,** the installation's, and answers the rows trivially: a name and terms, no quota, no suspension, and offboarding answered by Organisation itself.

## The rows

| Seam | The product must say | The example product |
|---|---|---|
| **Catalogue** | What it announces into the installation's catalogue with *announce*, and announces again whenever it changes: its items, each with where it is offered, and what of it can be had now, the names of its quota counts with their defaults and the classes of its commands; what a visitor, an owner and an editor read. Its terms are the provider's to publish beside it | One item, the example item; one quota count with its default; the command classes *ask*, *give back* and *read*. *Product announced*, and *Terms published* by the provider beside it |
| **Quota** | What the quota given per product counts, one count or several, named in its announcement with the default each starts from, so that *set quota* can be validated against the catalogue and a product taken can be asked for something before any quota is set, or nothing until then where the default is zero; and what it counts as a resource held and what as a reservation. The quota is the agreement's commercial count; a product's own technical limits are its inside | Its one count: the resources held, plus a reservation per resource asked for and accepted but not yet delivered |
| **Suspension** | A hotspot: no reason for a suspension exists in the minimal control plane. When a reason returns, a product withholds what it provides and refuses *ask*, *operate* and *give back*, never *read* | Nothing yet |
| **Offboarding** | What "holds nothing of it" means, answered as *Organisation cleared* to an *Offboarding requested* that names the product or the agreement, as soon as it holds nothing; and what it ends at the end of the terms' notice, which every request carries, whoever sent it | *Organisation cleared* once no resource is held and none reserved; at the notice's end it ends what is still held and answers then |

## What every product inherits

- **Terms per product.** The provider publishes the product's terms into the catalogue, an owner accepts them to take the product, the provider replaces them with notice, and the organisation re-accepts or lets them expire; its acceptance reads the organisation's terms for it from the agreement entry. See [products and the catalogue](../control-plane/language/products.md).
- **Tenancy and the pin rule.** Its organisation-side contexts pin the organisation's tenant, its provider-side contexts pin the provider's, and what crosses between them is a declared export, wired when the organisation accepts the product's terms. See [the provider as a tenant](../control-plane/decisions/provider-tenant.md) and [Tenancy](../control-plane/design/tenancy/README.md).
- **The integration contract.** Its commands, integration events and published state are rows in [the contract](../control-plane/decisions/integration-contract.md), named, versioned and shaped by its three rules; a fact about several organisations is published once per organisation.
- **Audit.** Every command and integration event's envelope is an entry, never the payload; the organisation sees every entry about what it holds.
- **Roles, duties, command classes and organisation policy.** Owner, editor and viewer, the operator duty, the four command classes, *ask*, *operate*, *give back* and *read*, and what a rule may say, are the control plane's; the product sorts each of its commands into a class in its announcement, says which of its provider-side commands fall under the operator duty, and authorises a command by its class against the organisation policy. A rule never names a product's command, so a new product adds no word to any organisation's policy.
- **Reads are projections keyed by identity,** made safe by [the rules on reads](../control-plane/decisions/reads.md).
- **Being told of everything.** No informing events; the audit view and notifications carry every fact about what the organisation holds.
