# Reads between contexts are projections, made safe by rules

*Part of [the design decisions](README.md).*

## Context

The map has reads that are not events: a product's acceptance reads the catalogue to validate what is asked for, reads an organisation's state and terms at acceptance, and checks a quota against what the organisation holds. Under eventual consistency a read is either a synchronous query to the other context, coupling availability and crossing an account on every call, or a local projection fed by the other context's integration events, which Stack calls event-carried state transfer and which is stale by the width of one message. A query is a projection with a lifetime of zero: the staleness problem exists either way and has to be handled by a rule, not by freshness.

## Decision

The rules are the decision; the mechanism is chosen per read when the context is designed. A product's acceptance is the worked example.

### A product's acceptance keeps what it needs to accept, locally

Each organisation's agreement state, its terms for this product and their state, its quota in this product's counts, and the catalogue's entries. Fed by *Agreement activated*, *Terms accepted*, *Terms expired* and *Quota set*, and by the catalogue entry, which carries each product's announcement and its terms. These facts change rarely. Whether a suspension of the agreement cancels open asks, and so bounds the stale window by a cancel, is open with suspension itself, see [the seam](../../method/seam.md).

### The product owns its reservation, as an aggregate

The count a quota is checked against is the resources held plus the reservations, one per resource asked for and accepted but not yet delivered. Held comes from the product's own *Resource delivered* and *Resource given back*; reserved is the acceptance's own state. Both are one aggregate's in the product, identity the organisation id: accepting an ask is its command, and it refuses when the sum would exceed the quota or when a racing acceptance got there first, so racing asks from one organisation are serialised by the aggregate and not by an assumption that one instance runs. No cross-context race exists. The product is the source of truth for which resources exist; its acceptance keeps a copy, as a set of the product's own ids. Organisation keeps no copy: the product answers *Offboarding requested*, naming it or the agreement, with *Organisation cleared* once held and reserved are both empty, which is the product's own fact at its edge, and the race between a late delivery and a cancel is the product's to settle inside.

### A message may arrive twice, and a projection is a set

Delivery between contexts is at least once: a consumer that falls over after reading and before recording sees the same message again. So every projection is keyed by the identity the event carries, never a counter, and a number is derived from the set; and a consumer that sees a message it has already handled changes nothing. Both are rules about what a reader keeps and how it behaves; how a consumer remembers what it has handled, and how an aggregate's record and its published events are kept in step, are the implementation's and are not chosen here. A count would have let one redelivered *Resource delivered* stop an organisation from ever leaving.

Projection is the default. A query, a synchronous ask with a reply, is allowed where a context can't sensibly hold the data, and a first slice may use one where it is better understood; the rules hold either way, so moving a read from query to projection later changes nothing above. Synchronous request and reply is otherwise for a human reading a view, a read model, not a crossing between contexts.

### In NATS terms

The engineering view, admitted because it decides the shape. A projection is a durable JetStream consumer on an imported subject whose handler updates one row in the reading context's own store; on restart the consumer resumes, on loss it replays. A KV bucket is a projection NATS maintains itself, and a bucket can be mirrored across accounts, so Organisation can publish its state into a bucket and a reader can watch a mirror of it without writing a consumer. That is the preferred shape for the rarely changing facts above. Nothing more about persistence is decided here; the mechanisms belong to fabrikk, see [fabrikk's design pages](../../../design/README.md).

## Consequences

- Each product's acceptance design lists each read with its mechanism: consumer, KV mirror or query.
- Organisation and Catalogue publish state as well as events, if the KV shape is used; that is part of their published language under [the integration contract](integration-contract.md).
- What an organisation holds of a product is the product's projection, not a question to the control plane.
