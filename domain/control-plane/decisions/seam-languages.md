# At the seam, the control plane publishes the language

*Part of [the design decisions](README.md).*

## Context

[The seam](../../method/seam.md) has four rows, and each is a published language in one direction or the other. Whose language a row is written in decides what a new product costs the control plane. Where the control plane publishes, as Catalogue does with *announce* and *publish terms* and Organisation does with the agreement entry and *Organisation cleared*, a product conforms and the control plane changes nothing. Where the product publishes and the control plane imports, the control plane carries a translation per product: a control-plane context that imports each product's own facts and mints its own from them gains events and an import for every product, and at ten products is a conformist downstream of ten upstreams. Evans's open host is the shape for a context many parties report to, and Stack's rule that the emitting context owns an event's name says a product's event can never be the control plane's contract.

## Decision

Three rules.

1. **Where a product reports to a control-plane context, it sends that context's command.** The control-plane context owns the name and the shape; the product conforms, and says in its seam answer which of its own facts send it. Catalogue's is *announce*, sent by the service that runs the product, beside the provider's own *publish terms*; Audit's is the envelope, which every message carries. A control-plane context imports no product's event.
2. **Where the control plane tells a product, it does so in its own language,** the agreement entry and its events. A command is answered by a *reply* in the commander's shape, done or refused with the ids, and the receiver's own event about the same moment stays the receiver's. Both words are [beneath the story](../language/system-words.md).
3. **A resource is named in the control plane by its product and the product's own id for it,** and by nothing else, and a reservation the same way; see [products and the catalogue](../language/products.md). No control-plane context models what it is. The one generic word is a reference, not a box; the method's rule that the control plane never models what a product delivers stands.

## The test that keeps this DDD

Every command is a sentence the people whose context it is say: the operator says "announce it in the catalogue" and "publish the new terms", not "capacity was reported". A context's commands are the verbs of the people whose context it is.

## Rejected

Translating at the receiver, an import adapter per product inside a control-plane context: it grows with every product and puts the product's language inside the control plane. Translating at an anti-corruption layer between every product and the control plane: a layer per product, owned by no one. A resource the control plane models: the method forbids it; the word names a reference, the product and its own id, and nothing more.

## Consequences

- The control plane's rows in [the integration contract](integration-contract.md) do not change when a product is added; a product's rows list which of its facts send which control-plane command, and which control-plane commands it takes.
- Catalogue and Audit are open hosts on [the map](../map/README.md); every product conforms to them. The customer-and-supplier line where Organisation tells a product stays as it is.
- The same holds for any context a product reports to that joins the control plane later: it is an open host, it owns its commands, its own domain events behind them name no product, and a product's seam answer says which of its facts send them, so that a new product changes no control-plane row.
