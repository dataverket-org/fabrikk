# Avoided terms

*Part of [the glossary](README.md).*

| Avoid | Use instead | Why |
|---|---|---|
| membership | user | A user already lives in exactly one organisation |
| user *(as a role)* | viewer | Clashed with *user* as an account |
| admin, reader *(as roles)* | editor, viewer | Replaced by Google Cloud's owner, editor and viewer, an established set |
| tenant | organisation | System-internal only: one tenant per organisation |
| account *(for a login)* | person | Clashes with NATS account, which design meets |
| verified *(of a person)* | validated | One word for one state |
| validated person | validated login, a user whose login is validated, person | Validation belongs to a login, once; its users carry it, and a person is what it reveals |
| User validated *(as an event)* | *Login validated* | Validation is the login's: every user of the login, in every organisation, is validated by it |
| a login names its organisation | a login spans organisations | A login is the identity provider's and may have a user in several organisations; admission places a connection in the organisation the person is entering, or at the front desk |
| terms accepted at first login | the installation's terms accepted before validating or creating an organisation | A user is covered by the organisation's agreement with the installation; a login that only has users in organisations accepts nothing |
| non-compliant, revoked by the policy *(of a role)* | a role held and not applying | A policy tightened revokes nothing: the role stays granted and applies again when the login validates or the policy is loosened |
| subscription, account *(for the provider relationship)* | agreement | Azure's and AWS's words for it; both mean something in NATS |
| lapse, lapsed *(of terms)* | expired, *Terms expired* | Too quiet a word for a reader whose first language is not English; *utløpt* is what the Norwegian says. Of an offboarding it is the word, *Offboarding lapsed*, since one stopping of itself is quiet by nature |
| superseded *(of terms)* | replaced, *Terms replaced* | Likewise; the catalogue's own event is *New terms published*, Organisation's record of it on the agreement *Terms replaced* |
| subscription, plan *(for taking one product)* | terms accepted for the product | A product is taken by accepting its terms, and given back by offboarding of the product; nothing else is bought or subscribed to |
| offboarded *(of an organisation)* | agreement ended | The organisation lives on until deleted; it is the agreement that ends |
| organisation activated | agreement activated | A fact about the agreement, not the organisation |
| policy *(bare, for the organisation's rules)* | organisation policy | The bare word is Stack's reaction to an event; the decision point is *authorisation* |
| service *(for what a provider sells)* | product | A service is a unit of software; a product is built from one or more |
| holding, thing *(for what a product delivers, in the control plane)* | resource, reservation | The owner's words, and the industry's. A resource is what a product delivers and an organisation holds, a reservation one asked for and not yet delivered; the control plane names either by the product and the product's own id and models neither |
| lobby | front desk | The account where a visitor stands; the model's word for it, see [words beneath the story](system-words.md) |
| delete organisation *(as a command)* | request offboarding, of the installation's agreement | Closing an organisation is giving back the one agreement every organisation holds |
| decline agreement, accept customer *(as commands)* | request offboarding, reason declined; approve agreement | A held customer is declined by the one offboarding, while a condition for activation is unmet; a provider accepts nothing on *Terms accepted*, and approval is a condition for activation its organisation policy names, met by *approve agreement* |
| an organisation with no agreement | an organisation that holds no agreement but the installation's | Every organisation holds the installation's agreement from birth, so none is without one; dormancy is holding no other |
| no provider *(of the installation's organisation)* | the installation's organisation, a provider of the control plane | Only the account it owns tells it apart from a provider; *provider* is a role in an agreement, and it holds one with every organisation |
