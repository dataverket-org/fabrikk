# A stranger at the front desk

*Part of [the story](../README.md).* The first story stormed from a person's side: **a person with no organisation logs in at the installation, accepts its terms, reads the catalogue, validates, and creates an organisation; they are its owner, and the organisation holds an agreement with the installation from its first moment.** Terms follow [the glossary](../../language/README.md); what the story added to the model is listed at the end.

## At a glance

- **It starts** when someone with a login and no organisation arrives at the installation's front desk, and **ends** when they stand in a new organisation as its owner, admitted to its account.
- **Two steps at the desk, and they are different.** Logging in is open: any identity provider the installation allows, FEIDE, Entra ID or Google among them, gives a login and nothing more. Validating is the step that produces the installation-wide person id, by a means that proves a real human uniquely, BankID or Vipps today; it is required before creating an organisation. The owner's decision.
- **The installation's terms are accepted before validating or creating an organisation, and recorded.** *Installation terms accepted*, sent at the front desk or from an organisation, is the first fact the control plane keeps about a human who comes to the desk: an entry in the installation's record with the terms' identity, before validation; *validate* and *create organisation* are refused without current terms accepted. The owner's decision.
- **The installation is a provider, and its product is the control plane.** Every organisation, customer or provider, holds an agreement with the installation from *Organisation created*, under the terms the visitor accepted at the desk, active at once; it is the one agreement an owner cannot give back alone, since giving it back is closing the organisation. The owner's decision, which removed "an organisation with no agreement" and every special case written for it.
- **Only the account tells the installation apart from a provider.** The installation's organisation is whichever owns the installation's account and the front desk; it provides the control plane, and may provide other products too, since *provider* is a role. The owner's decision.
- **One pivotal event,** *Organisation created*: before it a visitor the installation owes nothing but a login and its terms; after it an owner answerable for an organisation, with an account, an agreement and a record.

## The events

The story as it would run at the installation's desk today, with a form and an identity check.

1. Website visited *(the opening; the public site shows the catalogue to anyone, aggregated from the installation)*
2. Logged in *(with a login from any identity provider the installation allows; not a fact of the control plane's, since the login is the identity provider's; the person is now a visitor)*
3. Installation terms accepted *(at the front desk, before the login validates or creates an organisation; naming the installation's current terms as the catalogue lists them; the first entry the installation's record holds about this human. Presented again, and accepted again, when the installation publishes new terms, which is the new terms story applied to the installation)*
4. Catalogue listed, Product viewed *(reads; nothing is recorded)*
5. Login validated *(the visitor's login is validated: the visitor proves who they are by a means the installation's policy names; Person mints a person id from the external ID, or recognises one it has seen, which is the next story's matter, the same human again)*
6. **[P] Organisation created** *(the visitor names the organisation and is its owner, carried by the same login, the same person; the agreement with the installation is born and active at once, under the terms accepted in step 3, which the command carries as it carries the person id; the account is wired for it as for any agreement)*
7. The owner enters the new organisation *(not an event: they are admitted to its account, and that is how they learn it is ready)*

Side paths: a visitor who logs in and never validates, or validates and never creates an organisation, is offboarded by the installation's dormancy period for visitors, the login and, if it was the person's last validated login, the person with it; a validation that fails or is abandoned is a refused command and an entry, no event; a visitor past the installation's limit on organisations per person is refused at step 6 and told why.

## People and parties

The visitor throughout, who becomes the owner at step 6. The installation's organisation, which publishes its terms and sets the front desk's policy under its operator duty, and whose users appear nowhere in the story's run. Outside parties: the identity providers a visitor may log in through, and the means of validation, BankID and Vipps, which reveal the external ID; they are two different kinds of party, and the glossary says so.

## Hotspots

### Is logging in on the board?

No. A login is the identity provider's; what the control plane first records about a human is its terms accepted, then its validation. *The facilitator's resolution.*

### Under what terms does the installation keep a person's data?

Its own, published in the catalogue beside its product and accepted before the login validates or creates an organisation, at the front desk or from an organisation, as a recorded fact. The alternatives, acceptance inside the identity provider's sign-up with nothing recorded, and acceptance folded into validation, were not chosen: the first leaves the record silent on the terms the installation keeps data under, the second has no step of its own and no command the record would show. A visitor who only browses accepts nothing, since nothing of them is kept but a login, which is the identity provider's; what [the colleague story](colleague.md) found of an invitee, covered by the organisation's agreement, is the same rule. *Decided by the owner.*

### Which means validate?

Only a means that reveals a national identity number, so that the person id rests on one kind of external ID: BankID or Vipps today. FEIDE, Entra ID and Google are logins, not validation, since they reveal no such number. *Decided by the owner.*

### Is the installation a provider?

Yes, of the control plane, and every organisation holds an agreement with it from birth: both provider organisations and customer organisations are agreeing to use the control plane for what that means. The facilitator had proposed keeping the installation a third standing with the terms as the front desk's own fact, to spare the first message and the record's neutrality; the owner's shape removed more than it added, see what the story added. *Decided by the owner.*

### Where is the line between the installation and the first provider?

The account: the installation's organisation is whichever owns the installation's account and the front desk, and nothing else distinguishes it; it may provide other products. Its own product acts are then recorded by itself, which is the stated limit of the installation's record, no wider than before. *Decided by the owner.*

### How long is a visitor kept who never creates an organisation?

The installation's dormancy period for visitors, in its own policy, after which the login is deleted and the person with it if that was their last validated login; the same word as an organisation's dormancy, one policy, two periods. *The facilitator's resolution.*

### Must an organisation's name be unique?

No; the id is minted, the name is the organisation's own. *The facilitator's resolution.*

### What does the installation's listing announce?

Its name, the control plane, and no items and no quota counts; its terms are published beside it as any product's. Whether it ever needs items or counts is a later story. *The facilitator's resolution.*

### *delete organisation*

Folded into *request offboarding* of the installation's agreement, by an owner: no *Organisation cleared* crosses, since the installation's product holds nothing for the organisation but the organisation itself: Organisation ends the terms at once, the agreement ends, and the organisation is deleted as after any last agreement. *The facilitator's resolution.*

## What the story added

The rules this story found live in these pages; its hotspots above say why.

- [Who's who](../../language/who.md), [Outside parties](../../language/outside-parties.md), [Products and the catalogue](../../language/products.md), [Words beneath the story](../../language/system-words.md)
- [The timeline's discovering and onboarding chapters](../timeline/01-discovering.md), [gates](../timeline/gates.md), [dropped events](../timeline/dropped-events.md), [people](../people.md), [the edges](../scope.md)
- [Person and Organisation](../../map/person-and-organisation.md), [Catalogue](../../map/catalogue.md), [Audit](../../map/audit.md), [the whole map](../../map/README.md)
- [The provider as a tenant](../../decisions/provider-tenant.md), [audit](../../decisions/audit.md), [two lifecycles](../../decisions/two-lifecycles.md), [the integration contract](../../decisions/integration-contract.md)
- [Organisation's design](../../design/organisation/README.md), [Tenancy's design](../../design/tenancy/README.md), [Catalogue's design](../../design/catalogue/README.md)
