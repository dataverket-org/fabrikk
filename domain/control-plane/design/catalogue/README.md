# Catalogue: design

The third context designed, and the first the first slice meets after Organisation: *accept terms* is validated against the catalogue entry. Catalogue is the installation's product catalogue, pinned to the installation organisation's tenant: the instance a provider runs for each product announces it, the provider's operator publishes terms beside it and withdraws it, and everyone reads it. The installation's own product, the control plane, is listed under the installation's organisation as a given. It is thin, one aggregate and three commands, and a published language first. Terms follow the [glossary](../../language/README.md); the boundary is [Catalogue](../../map/catalogue.md); the constraints are [the provider as a tenant](../../decisions/provider-tenant.md), [the seam decision](../../decisions/seam-languages.md), [reads](../../decisions/reads.md) and [the integration contract](../../decisions/integration-contract.md).

## At a glance

- **Three commands,** *announce* from the instance a provider runs for a product, carrying the announcement whole and again whenever it changes, availability included; *publish terms* and *withdraw product* from the provider's operator. The provider is the account a command arrived from, never written by the sender; for the control plane that account is the installation's own.
- **One policy:** pending terms become current at their effective date, Catalogue's one reaction to the clock.
- **One published entry,** the catalogue entry, one key per product under its provider, a full snapshot, imported into the front desk and every account; two views for humans, the catalogue and the product; no projection.
- **One aggregate,** Listing, one per product under its provider: its announcement, its terms, current and pending, and whether it is withdrawn. Its invariants are the rules the stories found: one pending terms at a time, replaced and never withdrawn; a date after the day of publication; counts and classes added and never dropped. The control plane's listing is a given of the left edge, with no items and no counts.
- **Three domain events** stay inside, **two integration events** cross, *New terms published* and *Product withdrawn*, each published once and read by every Organisation.
- **Catalogue's design is complete** for this story. Every choice in it is the owner's, listed in [status](../../../open.md).

## Contents

- [Commands and policies](commands-and-policies.md)
- [Read models](read-models.md)
- [Aggregates and events](aggregates-and-events.md)

## References

- [The new terms story](../../story/stories/new-terms.md), [the withdrawn story](../../story/stories/withdrawn.md) and [the front desk story](../../story/stories/front-desk.md): where the listing's rules, and the installation's listing, were found. *(this design)*
- [Organisation's commands](../organisation/commands.md), *accept terms*, *set quota* and *set policy*: what is validated against the entry. *(this design)*
