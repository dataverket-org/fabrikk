# Back and again

*Part of [the story](../README.md).* The second story of the control plane's own: **an organisation that holds resources from the example product gives the product back, keeps its agreement with the provider, and later takes the product again on the terms then published, as if for the first time.** Terms follow [the glossary](../../language/README.md); what the story added to the model is listed at the end.

## At a glance

- **It starts** when an owner decides the organisation no longer wants the example product, and **ends** when the organisation holds the product again, under the terms published by then, with a quota from the announcement's defaults, new resources, and nothing of what it held before.
- **A product's lifecycle under an agreement has both ends,** *Terms accepted* and *Terms ended*, and can run again; the agreement is untouched by either, and stands between them with nothing in it.
- **Giving a product back is the organisation's work, within the terms' notice.** An owner's request carries the notice as the provider's does: the editors give the resources back, and the product answers *Organisation cleared* as soon as nothing is left, at once if nothing was held; what is still held at the notice's end the product ends, and answers then. The notice is an upper bound, never a wait. The owner's decision, in [giving the example product back](giving-back.md).
- **Taken again is taken anew.** The old quota, the old resources and the old product entry are gone; the product's entity and wiring start over, the quota starts from the defaults, and the operator sets one if it wants to; what the product kept of the organisation's data ended with the terms, as the product's own rule says.

## The events

1. Offboarding requested *(by an owner, for the example product, with the terms' notice; the product cancels what is open and releases its reservations, its acceptance refuses new asks of the organisation, and the editors are told, and the day the notice ends)*
2. Resource given back, once per resource *(each a *give back* by an editor, within the notice; a resource an editor cannot yet give back is refused with the reason; what is still held at the notice's end the product ends, and the organisation is told of each)*
3. Organisation cleared *(the product's answer, as soon as nothing is held and nothing in flight: before the notice's end when the editors have finished, at its end otherwise)*, then Terms ended *(the organisation's terms for the product end; the account is no longer wired for it; its entry under the agreement is ended)*
4. The product deletes what it kept of the organisation's *(its own rule, under the agreement's terms for it; the audit entries about the product stay in the provider's record until the organisation's own record closes and retention runs out)*
5. Time passes: the agreement stands with nothing in it; the provider publishes new terms for the product, which the organisation is not told of, since it holds none of it
6. Terms accepted *(by an owner, naming the product and the terms then current or pending: the product's entry under the agreement starts over, held, and Tenancy wires the account for the product again)*
7. Quota set *(by the operator, or not: until it is, the quota is the announcement's defaults)*
8. Asks resume: Resource asked for, Resource delivered, new resources and new reservations under the new terms; nothing of the earlier tenure is there to find

Side paths: an owner who requests offboarding of the product and changes their mind cannot accept its terms while it is offboarding, and waits for *Terms ended* to take it again; an owner who wants the product gone sooner than the notice's end has the editors give back sooner, since the terms end on the product's answer and not on the notice; a product given back with nothing held ends at once.

## People and parties

The owner requests and, later, accepts again; the editors give back and, later, ask again; the operator sets the quota again, or lets the defaults stand. No outside party.

## Hotspots

### Who ends what is still held when the owner asked?

The product, at the end of the terms' notice, as for the provider's request, so an organisation leaves a product by the notice's end without chasing every resource, and sooner by giving back. *Decided by the owner* in [giving the example product back](giving-back.md#who-ends-what-is-still-held-when-the-owner-asked), where the alternatives are.

### Is the old quota remembered?

No. The quota is the product entry's, and the entry starts over; the announcement's defaults apply until the operator sets one. Remembering would make the agreement keep a fact about a product the organisation does not hold. *The facilitator's resolution, confirmed by the owner.*

### Is the organisation told of new terms for a product it gave back?

No. It accepted nothing to be replaced; it reads the catalogue when it takes the product again. *The facilitator's resolution, confirmed by the owner.*

## What the story added

The rules this story found live in these pages; its hotspots above say why.

- [The timeline's gates](../timeline/gates.md)
- [Organisation's commands](../../design/organisation/commands.md)
