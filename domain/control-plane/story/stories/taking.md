# Taking the example product

*Part of [the story](../README.md).* The fifth story from a person's side, and the first with a provider in it: **an owner accepts the example product's terms under a provider; the agreement with the provider is born and activates at once, or once the provider's operator has approved it, as the provider's policy says; the quota is the announcement's default; an editor asks for the first resource and gets it.** Terms follow [the glossary](../../language/README.md); what the story added to the model is listed at the end.

## At a glance

- **It starts** when an owner reads a provider's listing of the example product, and **ends** when the organisation holds its first resource.
- **The agreement is born on *Terms accepted* and activates when every condition for activation the provider's policy names is met.** The conditions are a closed list the system defines, and a provider names in its organisation policy which apply: today one exists, the operator's approval, *approve agreement*; a provider that names none auto-activates, *Agreement activated* following *Terms accepted* at once. The money story adds a billing entity as a second condition and changes nothing else. The owner's decision, which answers the hotspot on activation for every agreement, the installation's included.
- **A held customer is declined by offboarding.** The operator's *request offboarding* for the agreement, reason declined, allowed only while a condition for activation is unmet: the agreement ends at once, since nothing was held and nothing was ever active. The owner's decision.
- **The quota is the provider's ceiling,** one number per count, starting from the announcement's default and set by the operator alone; a provider that wants to look at each customer before it holds anything announces a default of zero, or names approval.
- **The product's acceptance reads the agreement entry and nothing else of the control plane:** active, the terms current, and the quota against held plus reserved, in one snapshot. The control plane learns of the resource only as the product's own fact, which is the seam holding.
- **Two pivotal events,** *Agreement activated* at the provider, and, for the product's own story, *Resource delivered*.

## The events

The story as it would run in a provider's business today: a new customer signs up for one service, is or is not checked first, and orders.

1. Catalogue listed, Product viewed *(by an owner, in the organisation; the listing under the provider: the example item, the count with its default, the terms, and the command classes)*
2. Terms accepted *(by an owner, naming the provider, the example product and the terms' identity; refused unless the catalogue lists them so; the first at this provider, so the agreement with it is born, and the account is wired to the provider's and for the product)*
3. Agreement held for approval, or **[P] Agreement activated** *(as the provider's organisation policy names: with no condition, active at once; with approval named, held, the operator told, and active on *approve agreement*. The quota is the default from the announcement from the moment the product is held)*
4. Resource asked for *(by an editor, an *ask* naming the example item; the product's acceptance reads the agreement entry, active, the terms current, the quota against held plus reserved, and accepts: a reservation; or refuses, naming why, the editor told)*
5. **[P] Resource delivered** *(the product's own fact: the resource is held, named by the product and its own id, and the reservation released)*
6. Quota set *(later, by the provider's operator, raising or lowering the ceiling; with no approval named, the first command the provider sends onto the organisation)*

Side paths: an ask past the quota is refused, and the editor asks again once the operator has raised it; a provider that announced a default of zero refuses every ask until it sets a quota, which is the hold without approval; the operator declines a held agreement, *request offboarding* with reason declined, and the agreement ends at once, the terms with it, the organisation told; an owner accepts terms for a withdrawn product and is refused; an editor asks before the agreement is active and is refused.

## People and parties

The owner, who reads and accepts; the editor, who asks; the provider's operator, who approves or declines, and sets the quota; the example product's acceptance, at the seam. No outside party.

## Hotspots

### When is an agreement active?

When every condition for activation the provider's policy names is met, one condition, re-evaluated as each is met, the same shape as the closing rule. Today's one condition is approval; a provider that names none activates at once; the money story adds the billing entity. The alternatives, the agreement born active with *Agreement activated* dropped until the money story brings it back, and the two events kept with nothing between them, were not chosen: the first renames later, the second leaves a state nobody can observe. *Decided by the owner.* The closed list, the policy as the place, and approval as the first row are the facilitator's.

### How is a held customer declined?

By the operator's *request offboarding*, reason declined, while a condition is unmet; the agreement ends at once. The alternatives, a *decline agreement* command and leaving the agreement held, were not chosen: the first duplicates offboarding, the second leaves a customer waiting without a no. *Decided by the owner.*

### Does activation apply to the installation's agreement?

Yes, by the same rule: the installation's policy names its conditions, and today it names none, so an organisation's agreement with the installation is active at its creation as before. *The facilitator's resolution.*

### Is a resource the control plane's fact?

No. The control plane sees *Resource asked for*, *delivered* and *given back* only as the product's own facts at the seam, never imports them, and holds the quota as a number the product reads. Nothing in this story needed a word beyond *resource* and *reservation*, which is the test the method set. *The facilitator's resolution.*

## What the story added

The rules this story found live in these pages; its hotspots above say why.

- [Who's who](../../language/who.md), [Words beneath the story](../../language/system-words.md)
- [The timeline's onboarding chapter](../timeline/02-onboarding.md), [gates](../timeline/gates.md), [dropped events](../timeline/dropped-events.md), [people](../people.md)
- [Person and Organisation](../../map/person-and-organisation.md), [the whole map](../../map/README.md), [the integration contract](../../decisions/integration-contract.md), [two lifecycles](../../decisions/two-lifecycles.md)
- [Organisation's design](../../design/organisation/README.md), [Tenancy's design](../../design/tenancy/README.md)
- [Status](../../../open.md)
