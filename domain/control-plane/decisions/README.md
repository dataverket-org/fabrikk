# Design decisions

The decisions every context depends on, taken before any context was designed. Each is written in the short form fabrikk's ADRs use, context, decision, consequences, so it can become an ADR there. A decision is recorded here only once agreed with the domain owner.

## At a glance

- **The provider is a tenant of its own,** and the installation's organisation is a provider among them, the one that owns the installation's account and provides the control plane to every organisation; a provider's Audit and a product's provider-side contexts pin the one, Person, Catalogue and the installation's Audit the other. Crossings between an organisation's account and a provider's or the installation's are declared exports.
- **Audit consumes every command and every integration event,** and nothing else; an entry is the envelope and the outcome, never the payload.
- **Reads between contexts are projections by default,** made safe by rules; the mechanism is chosen per read.
- **The integration contract:** three rules for naming, versioning and payload, and the list of commands, integration events and published state per context. It is the export list.
- **At the seam, the control plane publishes the language:** a product reports to Catalogue with its commands, and is told in the control plane's words; a resource is named by its product and the product's own id and modelled by no one but the product.
- **Two design notes.** The organisation and its agreements are two lifecycles, the agreement with the installation the one every organisation holds from its creation, so that several providers is an addition. And a product meets the agreement in four places, its terms, its quota, its suspension and its answer to offboarding, written per product, the control plane answering them trivially, so that a further product is an addition too.
- **The engineering view maps cleanly:** a service is a Go module holding several contexts, and a product is what one or more services sell.

## Contents

- [The provider is a tenant of its own](provider-tenant.md)
- [Audit consumes commands and integration events, nothing else](audit.md)
- [Reads between contexts are projections, made safe by rules](reads.md)
- [The integration contract: events, commands and published state per context](integration-contract.md)
- [At the seam, the control plane publishes the language](seam-languages.md)
- [Design note: two lifecycles](two-lifecycles.md)
- [Design note: products](products.md)
