# Catalogue

*Part of [the map](README.md).*

The catalogue is a product catalogue, and it is the installation's: each provider's products are announced into it by the service that runs them, with their items, the counts their quota is written in and the command classes their commands fall into, and beside each the provider publishes the product's terms, the standing offer an organisation accepts. Announcing into it is what makes an organisation a provider; the installation's own listing, the control plane, is a given, and Catalogue knows the installation as it knows any provider, by the account a command arrived from. Three things read it: the visitor at the front desk, the owner accepting terms and the editor choosing what to ask for, and an aggregation across installations, which a website may present.

| Side | Holds | Events |
|---|---|---|
| **Catalogue** | What is available: products and what each announces, as announced, each naming its provider, with its counts and its command classes; each product's terms, current and, until their effective date, pending; and which products are withdrawn, listed still for those that hold them | Product announced, Terms published, New terms published, Product withdrawn; *Catalogue listed* and *Product viewed* are reads by a visitor, not facts the context records |

*Product announced* and *Terms published* are givens on the left edge of the story, the installation's listing and its terms among them: they have happened before the story starts and keep happening. They are the only inbound facts Catalogue has that do not come from a context on this map; the announcement comes from the service that runs each product and the terms from the provider's operator, both across the provider's export to the installation's account. *Website visited* stays as the story's opening and belongs to no context. The domain owner notes the announcements will travel over the messaging system; that is recorded as a statement, not as a decision taken here.

The set of subject patterns that authorisation decides over is the *taxonomy*, not the catalogue; see [words beneath the story](../language/system-words.md).

## Rules

### Terms are a product's

A provider publishes terms per product, and an organisation accepts them per product; there are no terms of the provider's as a whole. The installation's terms are the control plane's, accepted by a login at the front desk and by the organisation at its creation.

### New terms replace old ones with notice

*publish terms* for a product that has terms carries an effective date; until it passes both are listed. Pending terms are replaced by a later publication, never withdrawn. *New terms published* is published once, into every account, and each Organisation reacts for the agreements that hold the product; for the control plane that is every organisation.

### A product withdrawn is no longer accepted

No longer accepted, and nothing else changes: terms already accepted stand until they end, what is held stays held and may be added to within quota, its entry stays readable for the organisations that took it, so quota, policy and new terms for it still work, and the provider ends each tenure by requesting offboarding of the product, reason product withdrawn, under the terms and with their notice, one organisation at a time. The offboarding gate does not read the catalogue. *Product withdrawn* is published once, into every account as the entry is, so that every organisation holding the product is told; the service announcing again lists the product again. Found by [the withdrawn story](../story/stories/withdrawn.md).

### The entry is the product's own word about itself

What the control plane validates against the entry is the product's own word: the counts a quota may name and the default each starts from, the terms an owner may accept, the command classes an organisation policy may name for the product. Nothing in the control plane knows a product's counts or commands by any other means.

## Crossings

| Crossing | Kind | Direction | What the receiving side does with it |
|---|---|---|---|
| *announce* | Command | Each provider's service to Catalogue, for the product it runs, the first time and again whenever anything it says changes, availability among it | Listed as available, with its items, each with where it is offered and what of it can be had now, the names of its quota counts with a default for each, and the classes of its commands, under that provider; the provider is the account the command arrived from, told by the import and never written by the sender, and an announcement naming another is refused and audited. *Product announced* is the fact that results |
| *publish terms* | Command | The provider's operator duty to Catalogue, for one of its products, the installation's for the control plane, with an effective date when the product has terms already | Listed as the product's terms, current or pending; *Terms published* the first time, *New terms published* when they replace earlier ones. A product's terms can be published only by its provider, told by the import; the installation's organisation is told apart by nothing but its account |
| *withdraw product* | Command | The provider's operator duty to Catalogue, for one of its products | Marks the listing withdrawn: read by no *accept terms* that takes the product, readable still by those that hold it; *Product withdrawn* is the fact that results |
| New terms published | Event | Catalogue to Organisation, naming the provider, the product, the new terms and the effective date | For each agreement with that provider holding the product: the accepted terms are replaced, the owner is told, and at the effective date without re-acceptance *Terms expired* |
| Product withdrawn | Event | Catalogue to Organisation, naming the provider and the product, published once | Every organisation holding the product is told; nothing of its agreement changes, and the overview shows the product withdrawn |

A product's acceptance reads the catalogue to validate what is asked for, through the entry imported into its account; Organisation reads it to validate *accept terms* and *set quota*. *New terms published* and *Product withdrawn* are Catalogue's two integration events; everything else it has to say is the entry.

Catalogue has one aggregate, the listing, one per product under its provider: what the product announced, its current terms and its pending terms with their date. Its invariants are the rules above: one pending terms at a time, replaced by a later publication and never withdrawn; an effective date after the day of publication; a product's terms published and the product withdrawn only by its provider; a withdrawn listing listed again only by its service announcing; a count or a command class once announced never dropped. *announce*, *publish terms* and *withdraw product* are its commands. Found by [the new terms story](../story/stories/new-terms.md) and designed in [Catalogue's design](../design/catalogue/README.md).
