# Audit consumes commands and integration events, nothing else

*Part of [the design decisions](README.md).*

## Context

Every event from every context goes to Audit, the map says. Stack keeps domain events inside a module and publishes only integration events, so a subscribing Audit sees a fraction of the board; seeing everything would mean publishing domain events, which Stack warns against, or making Audit the event store, which is event sourcing for every context. [The provider as a tenant](provider-tenant.md) sharpens it: an Audit sits in the account of the organisation whose record it keeps, the provider's or the installation's, and receives what each organisation's account exports to it. And the regulations require that everything *done* is logged with a name behind it; what is done is a command, which carries the actor, not an event, which carries none.

## Decision

- Audit consumes every command and every integration event that is published on an exported subject, and nothing else. Domain events internal to an aggregate are not audited. Anything that must be auditable is a command or an integration event; every context follows that rule.
- **A record is append-only, enforced by the installation, which runs the platform.** A party's acts are recorded by the party it is accountable to: an organisation's acts within an agreement by that agreement's provider, the installation among them, since an organisation's own lifecycle is its agreement with the installation; a provider's own acts by the installation. The party an act concerns receives every entry about it into its own account as it happens and may keep it anywhere. The installation's record of its own acts is checked by no one inside the installation; that is a stated limit, and an outside witness is parked with federation in [what is parked](../../open.md#seen-and-left-outside-the-story).
- Audit pins the tenant of the organisation whose record it keeps; every organisation has two records, each a provider's, the installation's one of them, which also holds the front desk's commands and every provider's own acts.
- **An entry is the envelope and the outcome, never the payload.** Audit stores CADF's five fields, initiator as the actor admission established and, under a delegation, the user it acts for, action, target as an id, outcome, observer, and nothing a command or event carried as its payload: a login in *onboard user* or an organisation's rules in *set policy* never reach the store. Every command sent inside an organisation's account, a human's included, has its envelope exported to the Audit of the agreement its lifecycle belongs to; the front desk's commands go to the installation's.
- Every such message carries the organisation it concerns and the actor, in the envelope, neither written by the sender: the crossing tells the one and admission bound the other. So an entry can be filed per organisation without Audit understanding the payload. A message claiming another actor than its connection's, or a delegation naming another, is refused where it is received and is an entry like any other, outcome refused, initiator the connection's actor. A fact about several organisations arrives once per organisation.
- Audit does not depend on event sourcing. Whether a context sources its aggregates from events is that context's persistence choice, and Audit works the same either way.

## Precedent

AWS CloudTrail and Kubernetes audit logging record every API call with the principal and never internal state changes; Google Cloud's audit logs add "system events" for changes the provider made on its own, which is our integration events from the provider's contexts. CADF, the DMTF's Cloud Auditing Data Federation standard that OpenStack's audit middleware emits, gives the entry its shape: initiator, action, target, outcome, observer. Borrow that vocabulary when Audit is designed. The rejected shape, audit as the event store, is what Zitadel does; it works when one system owns all events and is the wrong dependency for a dozen contexts.

## Consequences

- The crossing tables in [the map](../map/README.md) are the audited events; the commands between contexts, such as a product's *announce* to Catalogue, are the audited commands. [The integration contract](integration-contract.md) names both.
- What an organisation receives is an entry delivered into its account as it happens, under the rule above, not a chained copy; a provider sits in an account it does not operate and cannot alter or drop an entry held above it. An entry never written is seen against the original in the organisation's own account, so such an act can be hidden only by not being done; what never goes through the control plane is outside the record. A provider's own acts cross to the installation's Audit as one more declared export, listed in [the integration contract](integration-contract.md) and [Tenancy's boundary](../design/tenancy/boundary.md). The rules are in [Audit](../map/audit.md).
- Audit is a projection: one consumer, one append-only store, no aggregate of its own to start.
