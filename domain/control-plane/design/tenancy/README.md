# Tenancy: design

The first context designed beneath the map. Tenancy holds the tenant, the account that is the isolation wall, and the topology of what crosses between accounts. Which service will hold it is the landing zone question and stays unassigned. It was taken because the first slice fabrikk proposed cannot be planned without it: the slice's tenancy decision, its admission of connections and its isolation tests all rest on what a tenant is. Terms follow the [glossary](../../language/README.md); the system words this design needs, tenant, account, export and import, pinned, admission, the installation's account and the front desk, are [the words beneath the story](../../language/system-words.md). The constraints are [the provider as a tenant](../../decisions/provider-tenant.md), [audit](../../decisions/audit.md) and [the integration contract](../../decisions/integration-contract.md).

## At a glance

- **The boundary:** Tenancy holds the tenant, one per organisation under the organisation's id; its account; and the topology, which accounts exist and what each exports to and imports from each provider's account it has an agreement with, the installation's first, per agreement and per product taken.
- **The integration contract's list is the only thing that crosses accounts.** An organisation's account exports its rows to the installation's account and to each other provider's it has an agreement with, and imports their replies. Nothing crosses between two customer accounts.
- **One wiring per agreement, and one per product taken inside it.** An agreement's wiring is made when the organisation first accepts one of that provider's products' terms and withdrawn when the agreement ends; a product's is made when the organisation first accepts that product's terms and withdrawn when they end. The installation agreement's wiring is every organisation's first, the same rows as any agreement's plus what every account carries because it may provide, made at *Tenant created* so that the forwarded command and the agreement's first fact can cross, and withdrawn last, with the account. A further provider is a further wiring, a further product a further wiring inside it, and a product announced later is wired when it is taken; no change here.
- **The first message:** the visitor stands at the front desk, an account of the installation's that is no tenant's, which exports three commands, *accept installation terms*, *validate* and *create organisation*, the first two exported by every organisation's account as well, since a login accepts the installation's terms and validates from the organisation it is in as it does at the desk; *create organisation* goes to Tenancy, which creates the tenant and its account, makes the installation agreement's wiring and forwards the command into it; *Organisation created* is then Organisation's domain event, and the agreement with the installation is born with it. The command names no provider: the installation is the first by construction, and any other is chosen by accepting one of its products' terms.
- **One command,** *create organisation*; **six policies,** the installation agreement's wiring on *Tenant created*, forwarding on *Tenant wired*, wiring to a further provider and for a product on *Terms accepted*, withdrawing on *Terms ended* and *Agreement ended*, deletion with the installation wiring on the installation Audit's *Record closed*.
- **Two read models** of Tenancy's own, the tenants entry that admission reads, holding each tenant's id, account and existence, and the topology for the installation's organisation; no projection. The gate on *create organisation*, the terms, the login's validation and the limit on organisations the person is an owner in, is authorisation in the installation's account, and the person id and the terms' identity the command carries are bound there from Person's facts.
- **One aggregate,** Tenant, under the organisation id, with its wiring inside as one entity per provider it has an agreement with, the installation's first, each holding one per product taken, mirroring the Agreement and its products in Organisation. **Four domain events** and no integration events: Tenancy is a published language like Catalogue.
- **Tenancy's design is complete** for the minimal control plane. What remains is the handover to fabrikk, where the slice's tenancy decision and its language page are rewritten from this design.

## Contents

- [The boundary](boundary.md)
- [The first message](first-message.md)
- [Commands and policies](commands-and-policies.md)
- [Read models](read-models.md)
- [Aggregates](aggregates.md)
- [Events](events.md)

## References

- [Organisation's design](../organisation/README.md), events, how *Organisation created* reaches Tenancy. *(this design)*
- `~/kode/fabrikk/docs/explanation/first-slice-retrospective.md` and `sentral.md`: the proposed slice and the language page it rests on. Read as evidence of what was tried, never as decisions. *(domain owner's factory, outside the model)*
