# Open: where the model stands

Where the modelling stands, what is next, what is open, where words still rub, and what is parked.
[The working rules](method/working-rules.md) say how the modelling is continued.

## Where it stands

- **The control plane is a minimal one of five contexts:** Person, Organisation, Catalogue and Audit on [the map](control-plane/map/README.md), Tenancy beneath it. The designs of [Organisation](control-plane/design/organisation/README.md), [Tenancy](control-plane/design/tenancy/README.md) and [Catalogue](control-plane/design/catalogue/README.md) stand, and [the security review](method/security-review.md)'s rules with them.
- **Nine stories are told,** six from a person's side and three from the provider's, listed in [the story](control-plane/story/README.md); each is applied across the model, and each says what it decided.
- **The example product** stands in the story for any product, by its catalogue entry and its answers at [the seam](method/seam.md), and nothing more.
- **Maskin, Nett, Money, Response and the Verifier are parked** at the tag `v0.5.0-parked`; [what is parked](#parked-at-the-tag-v050-parked) lists each piece.
- **Nothing is implemented.** Systems, subjects and code come next, in fabrikk.

## Next, in order

1. **The money story,** which brings Money back from the tag, taking only what it needs: a billing entity as the second condition for activation a provider may name, and the resource's billing as the example product's money row at the seam.
2. **Abuse and hardware** come back the same way, each with a story of its own.

## Open questions

- **Does an agreement need suspension yet?** No reason for one exists in the minimal control plane; [the seam](method/seam.md) keeps a suspension row that says so.
- **Where the notice's length is written.** The catalogue entry carries the terms as text and no notice period as a fact, so Organisation knows the notice only as the words say it. A Catalogue question for the story that next meets it.
- **The installation's new terms.** [The new terms story](control-plane/story/stories/new-terms.md) applies to the control plane, but an expiry there refuses no ask, so only offboarding bites; told again for the installation when it is stormed.
- *Instance* is also Zitadel's word for the whole; the model keeps it for now.
- The mechanics of authorisation wait for authorisation's design.

## Things the work made visible

- **The crossings are the commands and integration events.** Each boundary page lists what crosses; that list is the integration contract.
- **Whose language a seam row is written in decides what a product costs the control plane.** A row the control plane publishes costs nothing per product; one the product publishes costs a translation per product.
- **A context beneath the map can publish state and no events,** as Tenancy does; the first message of a new tenant is a command that waits for its account.
- **The wiring can do the gate's work.** A product's exports exist only while the organisation's terms for it stand.
- **The owner's reply simplifies.** The provider's offboarding, products and services, the installation as a provider, the record kept by who runs the transport, a login spanning organisations, an invitee covered by the agreement, a held role instead of a revoked one, activation as conditions the provider names, one notice for every offboarding: each came from the domain owner, and each was simpler than what was proposed.
- **The installation is an organisation, and a provider.** Two standings of one kind, the providing and the holding, with the installation the one that owns the installation's account; every organisation holds its agreement from birth, and closing is offboarding from it.
- **The black box is who runs the transport.** A provider cannot alter or drop a record held above it; what remains unchecked is the installation's own record, a stated limit.

## Known tensions

The places where the model's words and fabrikk's, or two decisions, still rub. Raise each when design reaches it.

### Tenant, on the identity provider's side

The model treats tenant as system-internal, one per organisation, with the tenant id the organisation id. Fabrikk's earlier object storage deployment mapped *customer = Zitadel organisation, tenant = Zitadel project*, with one NATS account per project; the domain owner's own description maps one NATS account per Zitadel organisation. Whether the identity provider's organisation or its project is the tenant is resolved when design reaches identity.

### Account

The glossary avoids *account* for a login because it means a NATS account. Keep it that way.

### Adapter, not port

Fabrikk's architecture skill uses *port* for the hexagonal port an adapter sits behind; the model says *adapter* where it needs the engineering sense, a word a reader whose first language is not English takes at once. Resolved; kept here so the engineering sense of *port* is not reintroduced.

### Landing zone

Fabrikk builds seven services as Go modules, with event types named `no.dataverket.<context>.<aggregate>.<verb-ed>`. Each context on the map will need a service and a short id. The model has deliberately not assigned them; a slice's plan does, and `design/products.md` holds the result.

### Instance

Zitadel's word for the whole as well as the model's word for a running copy of a context. Kept for now.

## Parked at the tag `v0.5.0-parked`

The model as it stood before the control plane was cut to a minimal one. The tag is in the archived `domain-model` repository, where the model was developed until it moved here at its commit `a628a38`; that repository also holds the model's history before the move. Each piece below is readable there with `git show v0.5.0-parked:<path>`, and comes back only when a story needs it, taking only what it needs.
- **Maskin**, the dedicated machine, with its machine identity design: `products/maskin/`.
- **Nett**, the organisation's place on the network, and products depending on products: `products/nett/`, `method/seam.md`.
- **Money**, the billing entity, prices, invoices, payment terms, billing and usage, service credits, and the agreement's activation on a billing entity: `control-plane/map/money.md`, `control-plane/design/money/`, `control-plane/language/money.md`.
- **Response**, *isolate*, *restore* and *report*, incidents, abuse, vulnerabilities, lawful access and physical access logs: `control-plane/map/response.md`.
- **The Verifier**, with the trust anchor and its intermediates, machine identity, a machine as an actor, *enrol*, *unenrol* and *verify*: `control-plane/map/verifier.md`, `control-plane/design/verifier/`, `control-plane/language/trust.md`.
- **Bars on a person,** *suspend* and *reinstate*, and the agreement's suspension with its three reasons: `control-plane/language/who.md`, `control-plane/design/organisation/`.
- **The provider duties** finance, security and compliance, and on-site technician: `control-plane/language/who.md`.
- **Offboarding for non-payment, for abuse and on a lawful order,** with the outside parties they bring, EHF network, payment provider, collection agency, business register, regulators and law enforcement: `control-plane/language/who.md`, `control-plane/language/outside-parties.md`.
- **The stories** *not paying* and *abuse*, and the timeline's money chapter: `control-plane/story/stories/not-paying.md`, `control-plane/story/stories/abuse.md`, `control-plane/story/timeline/04-money.md`.
- **Bars across providers and installations,** recognised at validation by a cooperative registry, never distributed into organisations: `for-facilitators/parked.md`.
- **A recovery root** registered beside the trust anchor, to rotate away from a compromised root: `for-facilitators/parked.md`.
- **Per-organisation delegation of verification** to the provider, for an organisation that does not care: `for-facilitators/parked.md`.
- **Appointing an owner** by provider command, for a suspended organisation whose owners are all barred: `for-facilitators/parked.md`.

## Seen and left, outside the story

What was seen and deliberately not widened into.

### The control plane sold on its own

The control plane is the installation's product, held by every organisation under the installation's terms, which is the "FEIDE for infrastructure" framing made concrete and why the control plane is a subdomain of its own. What stays parked is selling it as a product on its own, Sentral and Identitet, the control plane with identity, policy and the catalogue, to providers who bring their own products, and the cooperative's money for it: what the installation charges, whom, and how that reaches the money story.
### Several providers

The domain owner intends a cooperative of several providers, with an organisation able to hold things from N of them. This story keeps one provider beside the installation, and the shape holds N: Organisation is designed with the provider relationship as its own lifecycle, [the note on two lifecycles](control-plane/decisions/two-lifecycles.md), the agreement is born when terms are accepted with a named provider, and the account is wired per agreement. The organisation that runs the identity provider and the messaging system is the installation's organisation, a provider like any other, told apart only by its account.
### Federation

The shared audit stream across installations is a federation question, as the catalogue across installations is. A custodian of a provider's full audit record is unnecessary for the record's integrity, since the installation enforces append-only above the provider; a custodian would be about keeping the content available, and needs a legal role and an agreement of a kind the model does not have.
### A provider's record kept by another

A provider keeps its own record and runs what keeps it: what an organisation does with a provider's products is recorded by that provider. Keeping a record could one day be something another organisation offers a provider, the installation's among them. The rule that a party's acts are recorded by the party it is accountable to would stand; who runs what keeps the record would then be for that offer to say. Nothing in the model depends on which it is.
### An outside witness for the installation's record

The installation's Audit records its own acts, as the provider of the control plane and of anything else it provides, and inside the installation no one checks that record: the party that runs the platform is the party it would be checked against. An organisation outside the installation holding the installation's record, by agreement, is the answer, under federation. An organisation holding a record for another is a relationship between two organisations that is not customer and provider, the first sign that the agreement may one day have kinds; named here and left.
