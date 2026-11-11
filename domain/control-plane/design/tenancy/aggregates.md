# Aggregates

*Part of [Tenancy's design](README.md).* An aggregate is the consistency boundary: the facts one command changes together under one set of invariants. Tenancy gives one.

| Aggregate | Identity | Holds | Invariants |
|---|---|---|---|
| **Tenant** | The organisation id, which is the tenant id | Its account; its lifetime, created to deleted; and its wiring, as entities inside it: one per provider it has an agreement with, the installation's first and the same for every tenant, each holding the agreement's exports and imports and, as entities inside it, one wiring per product taken, with the product's exports to that provider's account and the imports back | One tenant per organisation. A tenant's wiring runs to the accounts of the providers it has an agreement with, the installation's always among them, nowhere else; a product's wiring exists only inside an agreement's and only while the organisation's terms for the product stand; and the whole holds exactly the integration contract's list. Deleted only on *Record closed*, after *Organisation deleted* has crossed |

## Rules

### A provider wiring is an entity inside Tenant, keyed by provider id

An entity, not an aggregate of its own. It mirrors the Agreement of [Organisation's design](../organisation/aggregates.md), whose identity is organisation id plus provider id, because it is the agreement's consequence: it is made when *Terms accepted* first names the provider and withdrawn on *Agreement ended*. Every tenant has the installation's; a further provider is a further entity under the same tenant, and the invariant "only to a provider it has an agreement with" already says so.

### A product wiring is an entity inside the provider wiring, keyed by product

An entity, mirroring the product entity inside the Agreement: made when *Terms accepted* first names the product, withdrawn on its *Terms ended*. A product the provider announces after the agreement was made gains its wiring when, and only when, the organisation accepts its terms; nothing is re-wired. The control plane has no commands and no product rows, so the installation's wiring holds no product wiring.

### The installation agreement's wiring is a provider wiring like the others

A provider wiring like the others, keyed by the installation's id, with the agreement's own timing: made at *Tenant created*, ahead of the agreement's first fact, so that the forwarded command and the first *Terms accepted* can cross; withdrawn last, on *Record closed* with the account, since *User deleted* and *Organisation deleted* still cross on it after the installation's *Agreement ended*.

### The topology is not an aggregate

It is the union of every tenant's wiring, read-only, the second read model.

### The installation's account and the front desk are not aggregates either

They are constants of the installation, the installation organisation's, fixed when the platform is set up.

### The installation organisation's tenant is a Tenant like any other

A Tenant like any other, the installation's first, created with the installation; it holds no agreement with itself, since an agreement is between two organisations, and so no wiring of its own.

## State machine

### Tenant

Created, on *create organisation*; to deleted, on *Record closed* from the installation's Audit, which follows *Organisation deleted* from the tenant's own account. Nothing goes backwards, and an expiry of a product's terms does not touch its wiring, since what is held stays held under them.
