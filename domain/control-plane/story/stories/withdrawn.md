# Withdrawn

*Part of [the story](../README.md).* The third story of the control plane's own: **a provider stops offering a product while organisations still hold resources from it; no organisation can take it any more, those that hold it keep what they hold under the terms they accepted, and the provider ends the last of it under those terms, with notice.** Terms follow [the glossary](../../language/README.md); what the story added to the model is listed at the end.

## At a glance

- **It starts** when the provider's operator withdraws a product from the catalogue, and **ends** when the last organisation's terms for it have ended and the product's service announces nothing.
- **One pivotal event,** *Product withdrawn*: before it anyone may take the product; after it only those who hold it keep it. Nothing of theirs changes on the day: their terms stand, their quota stands, their asks are accepted.
- **Withdrawal is a catalogue fact and an ending is an agreement fact.** The catalogue says the product is no longer offered; each organisation's tenure of it ends by *Offboarding requested* for the product, reason product withdrawn, under the terms it accepted and with their notice, one organisation at a time, when the operator chooses. A withdrawal starts no clock, as an expiry does not.
- **The provider's tools are the ones it has.** To stop an organisation adding more of a withdrawn product it sets the quota to what is held; to end the tenure it requests the offboarding; to change the terms of the ending it publishes new terms, which are accepted or expire like any. Nothing new is needed to close a product, only the operator's patience.

## The events

1. Product withdrawn *(by the operator, with *withdraw product* into the catalogue: the listing is marked withdrawn, stays readable for the organisations that hold the product, and is read by no owner's *accept terms* again; published once, into every account as the entry is, so that every organisation that holds the product is told)*
2. Terms accepted refused *(for any organisation that tries to take the withdrawn product, or to take it again after ending it; an organisation that holds it and accepts new terms for it is not refused, since that is not taking)*
3. Quota set *(by the operator, for each organisation that holds the product, to what it holds, if the provider wants no more of it taken; or not, if it is content to serve what is asked until the end)*
4. Asks accepted *(from the organisations that hold the product, within quota, under their terms, as before)*
5. New terms published *(if the provider wants the ending in the words: an effective date, the conditions of the end; accepted again by the organisations, or expired, like any new terms, and the expiry is the operator's reason to request offboarding sooner)*
6. Offboarding requested *(by the operator, for the product, reason product withdrawn, for one organisation, under the terms it accepted and with their notice; repeated for each organisation that holds the product, when the operator chooses: at once, by cohort, or as each is ready)*
7. The product ends what the organisation holds of it at the end of notice *(as for any offboarding, whoever requested it)*, or the editors give back before
8. Organisation cleared, Terms ended, once per organisation *(the agreement stands with its other products; an organisation that held only this product keeps its agreement, with nothing in it, until it takes something else or the operator requests its offboarding for dormancy)*
9. Nothing announced *(the product's service stops announcing; the listing stays withdrawn in the catalogue for as long as the provider likes, and is listed again if the service announces again, with the terms it then publishes)*

Side paths: a withdrawn product's listing is what *set quota* and *set policy* are still validated against for the organisations that hold it, as [the catalogue](../../map/catalogue.md) already says; a provider that withdraws by mistake announces again, and nothing of the organisations that hold the product has changed in between.

## People and parties

The operator withdraws, sets quotas, publishes the ending's terms if any, and requests each offboarding; the owner may accept the ending's terms or let them expire, and may leave the product first; the editors give back. No outside party.

## Hotspots, resolved

### May those who hold a withdrawn product ask for more?

Yes, within their quota and under their terms; the provider that wants otherwise sets the quota to what is held. Refusing asks by withdrawal alone would make withdrawal a sanction, and it is a commercial fact. *The facilitator's resolution, confirmed by the owner.*

### Does withdrawal end anything by itself?

No: each tenure ends by the provider's *request offboarding* for the product, reason product withdrawn, with the terms' notice. The owner's decision on new terms, that nothing but a request for offboarding starts the notice, applied again. *The facilitator's resolution, confirmed by the owner.*

### How does an organisation that held only the withdrawn product end?

It keeps its agreement with nothing in it, as one that gave its last product back does, and takes something else or is offboarded for dormancy, at the operator's request, after the period the provider sets. *As the model already says.*

### Who is told?

Every organisation that holds the product, by the catalogue's fact reaching every account; those that never took it read the catalogue and find it gone. *The facilitator's resolution, confirmed by the owner; the same shape as new terms.*

## What the story added

The rules this story found live in these pages; its hotspots above say why.

- [Catalogue's boundary](../../map/catalogue.md)
- [Organisation's commands](../../design/organisation/commands.md)
- [Who's who](../../language/who.md), [the glossary's product](../../language/products.md)
- [The timeline's gates](../timeline/gates.md), [dropped events](../timeline/dropped-events.md), [people](../people.md), [the leaving chapter](../timeline/04-leaving.md)
