# Design note: two lifecycles

*Part of [the design decisions](README.md).* Not a decision; a constraint on Organisation's design.

## Context

The board sorts what Organisation holds into two kinds of fact. One kind is the organisation's own and holds at every provider. The other is about the organisation's agreement with one provider and holds there alone; the agreement with the installation is one such agreement, held from the organisation's creation.

| The organisation's own | Per agreement, the installation's one of them |
|---|---|
| Users, roles | Terms accepted, per product; Terms expired, Terms ended |
| Organisation policy | Quota set, per product |
| Organisation deleted, data deleted | Agreement activated, Offboarding requested, Agreement ended |

An agreement is born when an owner accepts the terms of one of a provider's products, so *Terms accepted* is its first fact and names the provider and the product; a further product's terms are accepted into the same agreement, and each product's terms end on their own. The installation's agreement is born with the organisation, its *Terms accepted* naming the installation and the control plane under the installation's terms the visitor accepted, and is the one agreement an owner cannot give back alone, since giving it back is closing the organisation. Two facts give the seam away. A product's terms are its provider's, published beside it, and what an owner accepts holds at that provider only, so it belongs to the agreement. And *Agreement ended* and *Organisation deleted* are adjacent steps on the board, which coincide for the installation's agreement alone, the last an organisation holds.

## Constraint

Organisation is designed around two lifecycles, the organisation and its agreements, with the right-hand column on the agreement. The organisation's own facts are no agreement's; the installation's agreement is one among its agreements, and the one it is never without. *Agreement activated* is the pivotal event, following the first *Terms accepted* once every condition for activation the provider's policy names is met, so activation is the agreement's own and knows no product. The contexts on the map are unchanged; the split is inside Organisation.

## Why now

Today it costs one more aggregate and a name. Later it would move the pivotal event and every projection a product keeps of organisation state.

## Named

The relationship is the *agreement*, Norwegian *kundeforhold*. Azure's subscription and AWS's account were considered and are both taken by NATS; tenancy is a context of its own.
