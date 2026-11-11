# Events

*Part of [Tenancy's design](README.md).* A domain event is a fact an aggregate records for its own context; an integration event is the published contract, audited.

| Aggregate | Domain events, inside | Integration events, published |
|---|---|---|
| **Tenant** | Tenant created, Tenant wired, Wiring withdrawn, Tenant deleted | None. Tenancy publishes state, the tenants entry, and no events |

## Rules

### Tenancy is a published language with no events

The same shape as Catalogue: what others need is the current state, read as the tenants entry, and no one reacts to a tenancy change by being told. Admission watches the entry.

### Nothing is lost to Audit

The fact that a tenant was made, and wired for the installation's agreement, is the command *create organisation*, audited in the installation's account with the actor on it; the fact that one was wired to another provider or for a product is *Terms accepted*, Organisation's audited integration event, and that such a wiring was withdrawn is *Terms ended* or *Agreement ended*, likewise; the fact that one was deleted, its installation wiring with it, is *Organisation deleted*, an audited integration event, and *Record closed* marks the record complete. Tenancy's own events add no actor and no fact the record needs beyond those.

### *Tenant wired* and *Wiring withdrawn* make the order explicit

The policy on *Tenant created* makes the installation agreement's wiring, and the aggregate records that as a fact of its own, so the topology has something to read and the command is forwarded on *Tenant wired*, not on *Tenant created*. Each agreement's wiring and each product's is a *Tenant wired* of its own, naming the provider and, for a product, the product, and each withdrawal a *Wiring withdrawn*, the installation's on *Record closed*.

### A row in the integration contract

For Tenancy the installation's account imports *create organisation*, *Terms accepted*, *Terms ended* and *Agreement ended* and exports nothing; the row keeps the contract's list the export list that [the provider as a tenant](../../decisions/provider-tenant.md) relies on.

