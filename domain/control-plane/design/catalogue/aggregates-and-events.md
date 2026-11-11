# Aggregates and events

*Part of [Catalogue's design](README.md).* An aggregate is the consistency boundary: the facts one command changes together under one set of invariants. Catalogue gives one.

| Aggregate | Identity | Holds | Invariants |
|---|---|---|---|
| **Listing** | The provider organisation's id and the product's name, as the announcement names it | The announcement whole, as last announced: the items, each with where it is offered and what of it can be had now; the counts with their defaults; the command classes; the rest as the product's own words. The current terms, with their identity, label, text and the day they took effect, and the pending terms with theirs and the effective date. Whether withdrawn | One listing per product under a provider, and a product's terms are published and the product withdrawn only by its provider. One pending terms at a time, replaced by a later publication and never withdrawn; an effective date after the day of publication; the first terms current at once. A count or a command class once announced is never dropped; a count's default is never below zero. A withdrawn listing is listed again only by its service announcing |

## Rules

### Per product under its provider, not per provider

A provider's products have nothing true of all of them at once: terms are a product's, a withdrawal is a product's, an announcement is a product's. Two providers may each list a product of the same name, and the identity keeps them apart; an organisation accepting names both. The installation's organisation is one provider among them, and the control plane one listing under it, keyed like any other.

### The announcement is replaced whole

Replaced whole, not patched, so that the listing is always what one service last said and two instances of a product's service cannot leave it half of each. Availability is part of it: a product that reports what of it can be had now announces again when it changes, and the audit cost is one entry per change in the installation's record of the provider's acts. The alternatives, a command of its own for availability and availability left out of the catalogue as a fact the product's own views show, were not chosen: the first adds a command to carry the same words, the second takes from the visitor the one thing a product catalogue is read for. The owner's decision.

### The terms' text is in the aggregate

The text is in the aggregate because the invariants on terms are about which terms are listed, and a publication is one command that carries the text and the date together; nothing else holds the text.

### The control plane's listing is a given of the left edge

It is listed with the installation, under the installation's organisation, with its name and no items, no counts and no command classes, and what moves it is its terms, published by the installation's operator with *publish terms* as for any product. Whether it ever needs items or counts is a later story's matter.

## State machine

### Listing

Listed, on the first *announce*, the control plane's with the installation; withdrawn, on *withdraw product*; listed again, on *announce*. **Its terms,** beside the state: none, until the first *publish terms*; current, on it; current with pending, on a later *publish terms*, which replaces any pending; current alone again when the effective date passes, *Terms took effect*, the pending having become the current. A withdrawal does not move the terms, and a re-listing does not touch them: a product withdrawn and listed again is offered on the terms then current, which is what [the withdrawn story](../../story/stories/withdrawn.md) says.

## Events

| Aggregate | Domain events, inside | Integration events, published |
|---|---|---|
| **Listing** | Product announced, Terms published, Terms took effect | New terms published, Product withdrawn |

### Two integration events, published once and read by all

Published once and read by all, since a catalogue fact concerns no one organisation: *New terms published* names the provider, the product, the new terms' identity and their effective date, and *Product withdrawn* the provider and the product; each carries the entry. Every Organisation reacts for the agreements that hold the product, as [its policies](../organisation/policies.md) say: replaced terms with a date for the one, the product marked withdrawn for the other; those that hold none read the entry when they take it. New terms for the control plane reach every organisation this way, since every agreement with the installation holds it.

### *Product announced* and *Terms published* stay inside

Nothing on the map reacts to a product being listed or to its first terms: an owner reads the entry and accepts. The facts that must be audited are the commands, which carry the actor and cross into the installation's record; a later announcement that changes an item's availability or adds a count is the same domain event, and readers watch the entry.

### *Terms took effect* stays inside

The date was in *New terms published*, and Organisation holds it on the product's entry and reacts to the same day on its own; nothing is told twice.

### A row in the integration contract

Catalogue receives *announce*, *publish terms* and *withdraw product* across each provider's export, and the installation's own inside its account, and publishes the entry and the two events; the row stands as [the contract](../../decisions/integration-contract.md) has it, availability part of the announcement.

