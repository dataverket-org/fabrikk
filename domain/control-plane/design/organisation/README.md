# Organisation: design

The first context designed: Organisation is the root every other context reads from, and its claim is that an organisation policy means the same at every provider. The design follows Stack's order inside a context: commands, policies, read models, aggregates, then events split into domain and integration. Terms follow the [glossary](../../language/README.md); the boundary is [Person and Organisation](../../map/person-and-organisation.md); the constraints are [the provider as a tenant](../../decisions/provider-tenant.md), [reads](../../decisions/reads.md), [the integration contract](../../decisions/integration-contract.md) and the design notes on [two lifecycles](../../decisions/two-lifecycles.md) and [products](../../decisions/products.md).

## At a glance

- **Two lifecycles,** the organisation itself and its agreements, one per provider; every command, policy and event is sorted by which it belongs to. An organisation always holds the installation's agreement, born with it, and inside every agreement one entity per product taken.
- **Commands:** seven for the organisation, five for the agreement. *create organisation* makes the organisation, its first owner and the installation's agreement together; *accept terms* takes a product and accepts its new terms; *approve agreement* meets the one condition for activation; *set quota* is the operator's ceiling; *request offboarding* carries the terms' notice whoever sends it and, for the installation's agreement, closes the organisation under its policy's closing rule; *withdraw offboarding* takes back a pending request.
- **Policies:** activation as one condition over the provider's list, re-evaluated and never going backwards; terms replaced and expired on Catalogue's; a product's terms ending on its *Organisation cleared*, the control plane's by Organisation's own hand; the installation's dormancy notice lapsing on a provider's terms accepted; deletion after the last agreement.
- **Read models:** three views for humans, one published entry per agreement, and one projection, validation per login from Person.
- **Aggregates:** Organisation, with users as entities, and Agreement, with products as entities; the installation's agreement is an Agreement like any other, and the only one that holds a request not yet an offboarding.
- **Events:** six domain events stay inside, fifteen integration events cross.
- **Two hotspots** stay open: suspension, for which the minimal control plane has no reason, and the new terms story told again for the installation.

## Contents

- [Commands](commands.md)
- [Policies](policies.md)
- [Read models](read-models.md)
- [Aggregates](aggregates.md)
- [Events](events.md)

## References

- Stack, *Event-Driven Architecture in Golang*, 2022, chapters 3 and 4, for the order inside a context. *(domain owner's reference)*
