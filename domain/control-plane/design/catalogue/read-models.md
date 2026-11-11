# Read models

*Part of [Catalogue's design](README.md).* Catalogue is a published language first: the entry is what everyone reads, and the views are the entry shown to a human.

## Read by humans through the API

| Read model | Holds | Who reads it |
|---|---|---|
| The catalogue | Every listed product under its provider, with what it offers, where, what can be had now, and whether it has terms to accept; withdrawn products left out. The control plane among them, under the installation's organisation, with its name and its terms and nothing offered | A visitor at the front desk, and anyone in any organisation; the website and aggregators, one level up |
| The product | One listing whole: the announcement, each item with its availability; the terms, current and pending with the effective date, text included; whether withdrawn | An owner, when accepting the terms, who must read what is accepted; an editor, when choosing what to ask for; a visitor, who at the front desk reads the control plane's terms before accepting them |

A withdrawn product is left out of the catalogue and still shown as the product to anyone who asks for it by name, since the organisations that hold it read it through their overview, in [Organisation's read models](../organisation/read-models.md), which says the product is withdrawn.

## Published for other contexts

The shape [reads](../../decisions/reads.md) prefers for rarely changing facts: state in a KV bucket, mirrored into the accounts that read it. **One entry per product under its provider, a full snapshot.**

| Entry | Holds | Who reads it |
|---|---|---|
| The catalogue entry | The provider and the product; whether withdrawn; the announcement whole, the items with where each is offered and what of it can be had now, the counts with their defaults, the command classes; the current terms, their identity, label and text, and the pending terms with theirs and the effective date. The control plane's entry holds its name and its terms, and no items, counts or classes | The front desk, for the visitor, who accepts the control plane's terms from it; every organisation's Organisation, to refuse *accept terms* for terms not listed, *set quota* for a count the product does not name and *set policy* for a product not listed; the instance a provider runs for each product, to validate an item, where it is offered and its availability; the website and aggregators |

Rules:

- **The entry is the listing aggregate's own,** written from it alone.
- **The text of the terms is in the entry.** An owner accepts terms by their identity and must read what is accepted, in the account the owner stands in; the entry carries the text so that nothing is fetched from the installation at acceptance, and Audit records the identity, never the text. The alternative, an identity and a digest in the entry with the text read from Catalogue by query, was not chosen: it adds a query to the one read every organisation makes before anything else. The owner's decision. The same holds for a visitor at the front desk, who accepts the installation's terms from the entry imported there.
- **Each integration event carries the entry,** the integration contract's payload rule, so a reader rebuilds its projection from the latest one.
- **One entry for every reader.** A visitor, an owner, an editor, Organisation and a product read the same snapshot and each takes what it needs; nothing in it is any organisation's, so least privilege has nothing to narrow. What each reader validates against it is listed in [the boundary](../../map/catalogue.md).
- **A listing is never deleted in this story,** so an entry is never removed; a withdrawn listing stays readable, and what becomes of a provider's listings when the provider organisation itself is gone is outside this story, with how an organisation becomes a provider.

## Kept from another context

Nothing. Catalogue does not read the agreement entry, Person or Tenancy: it knows the provider by the account a command arrived from and nothing else about anyone.
