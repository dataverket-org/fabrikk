# Design note: products

*Part of [the design decisions](README.md).* Not a decision; a constraint on how the agreement's rules are written, in the same spirit as [the note on two lifecycles](two-lifecycles.md).

## Context

A provider has several products: the left edge says each is announced into the catalogue with its terms beside it, and the glossary reserves *product* for what a provider sells. Reading the agreement with that in mind, its facts sort into two kinds.

| The relationship's own, knowing no product | Per product |
|---|---|
| State: held, active, offboarding, ended | Terms accepted: a product's terms, accepted for that product, current, replaced or expired |
| — | Quota: in counts its announcement names, starting from the defaults it names until a quota is set; the example product's is one count |
| — | The answer to *Offboarding requested*: *Organisation cleared*, once the organisation holds nothing of the product; and *Terms ended* on it |
| — | What the catalogue lists, by construction |

## Constraint

A product meets the agreement in exactly four places: the terms accepted for it, the quota it is given, the suspension it enforces on what it provides, should the agreement need one, and its answer to offboarding. Those four are written per product, keyed by the product the catalogue lists, and the agreement holds them as one entry per product taken. Everything else on the agreement is the relationship's and knows no product; the agreement itself is born with the first product's terms and ends with the last product's. Organisation learns nothing of any product's inside, only the four facts at its edge, and what it validates about a product, the counts a quota may name, the terms an owner may accept, it reads from the product's own announcement in the catalogue. The four places, with what a product reports to Catalogue and Audit in their words, are [the seam](../../method/seam.md).

## The test that keeps this DDD

Every sentence here is one the provider's own people would say: an organisation has accepted a product's terms and has a quota of it; an organisation can give one product back and keep another; an organisation can leave once it holds nothing with any of our products. A *resource* is a reference and nothing more, no control-plane context models one, and no product gains a box in the control plane.

## Where it stands

The example product answers three of the four: its terms, its one quota count, and *Organisation cleared*; suspension is an open hotspot. The control plane meets the agreement in the same four places, trivially: terms, no quota, no suspension, and offboarding answered by Organisation itself, since it holds nothing but the organisation. The seam is a hypothesis until a real product confirms it.
