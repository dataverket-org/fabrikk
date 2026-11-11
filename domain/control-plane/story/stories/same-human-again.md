# The same human again

*Part of [the story](../README.md).* The second story from a person's side: **a person who already owns an organisation comes back with a different login, validates by a different means, is recognised as the same person, and creates a second organisation; the installation's limit on organisations per person applies to the human, not the login.** Terms follow [the glossary](../../language/README.md); what the story added to the model is listed at the end.

## At a glance

- **It starts** when a person with an organisation already arrives at the front desk again, with a login the installation has not seen, and **ends** when a second organisation of theirs exists, or its creation is refused by the installation's limit.
- **A login spans organisations.** A login is the identity provider's and may have a user in several organisations; admission places a connection in the organisation the person is entering, or at the front desk. A user still lives in exactly one organisation. The owner's decision, which lets the owner of one organisation create another with the login they have, and makes the second login of this story a choice and not a need.
- **Validation belongs to the login,** once: *Login validated* ties the login to a person, and every user of that login, in every organisation, is validated by it. The owner's decision. The event is renamed from *User validated* for that reason.
- **Recognition is Person's alone.** A second validation reveals the same national identity number, by whatever means, and Person gives the login the person id it minted before; *Person recognised* stays inside Person, and no one is told: organisations share nothing, and the recognition shows only as one person id in two records.
- **The limit counts organisations in which the person is an owner.** Person knows, for each login, the organisations it has a user in and whether that user holds the owner role, since the owner role's grant and loss cross to it as *User onboarded* does; a person who owns nothing counts nothing, so leaving an organisation, being removed from it or closing it frees a slot, and being onboarded into others as anything but an owner never counts. The owner's decision.
- **No pivotal event of its own.** The story runs chapters 1 and 2 a second time; what it proves is Person.

## The events

The story as it would run at the installation's desk today: a regular comes back with a different ID card.

1. Logged in *(with a login the installation has not seen, say through Entra ID where the first was through Google; not an event. The person could as well have come with the first login: a login spans organisations, and the front desk is where any login goes to create an organisation)*
2. Installation terms accepted *(for this login, before it validates, at the front desk or from an organisation; a login that accepted the current terms before accepts nothing again)*
3. Login validated *(through Vipps where the first login validated through BankID: the means differ, the national identity number is the same, and Person recognises the person, *Person recognised*, and gives this login the same person id. Every user this login has, in any organisation, is validated by it from now on)*
4. **Organisation created** *(the second; the visitor is its owner; its agreement with the installation is born as in [the front desk story](front-desk.md). Refused when the person is already an owner in as many organisations as the installation's policy allows: the limit is read against the person id, which is why the recognition matters)*
5. Two records, one person id *(the audit records of both organisations, each a provider's, name the same person id; the one correlation the installation keeps on purpose, and nothing at another installation can resolve it)*

Side paths: the person closes the first organisation and the slot is free again; a user onboarded into some organisation with any login validates and is recognised, the same step 3 with nothing to create, and that organisation's user becomes validated as its policy may require; the person validates again with the same means, and nothing differs.

## People and parties

The visitor, who is already an owner elsewhere; the installation's organisation, whose policy names the limit and whose users appear nowhere in the run; the means of validation, BankID and Vipps, which reveal the same external ID; the identity providers for login, which reveal nothing and need not be the same twice.

## Hotspots

### Can one login carry a person into several organisations?

Yes: a login is the identity provider's and may have a user in several organisations, admission placing the connection in the organisation the person is entering, or at the front desk; a user still lives in exactly one. The alternatives, one login per organisation, which the model said before, and a spanning login with validation per user, were not chosen: the first makes a person juggle logins and keeps the front desk for logins with no organisation only, the second validates the same human once per organisation. *Decided by the owner.*

### Where does validation belong?

To the login, once; every user of it is validated. *Decided by the owner.* The event is *Login validated*, since *User validated* said the opposite; the facilitator's name.

### How does an organisation learn that a user's login is validated?

Person keeps which organisations a login has users in, and whether the user is an enabled owner there: Organisation tells it with *User onboarded*, *Role granted to user*, *Role revoked from user* and *User disabled*, integration events from this story on, and with *User deleted* as before, and Person answers *Login validated* for that organisation when the login is validated, and publishes it once per organisation the login has a user in when it validates. Organisation keeps nothing of logins but what Person tells it. *The facilitator's resolution.*

### What does the limit count?

Organisations in which the person is an owner, through any of its logins. Person learns the owner role's grant and loss from Organisation, as it learns a user's onboarding and deletion, and counts against the person id. The facilitator had proposed organisations the person created that still exist, which Person could count from creations alone; the owner's count cannot be lost when a person's last login is dropped while its organisations live on, since a person who owns nothing counts nothing, and it needs no reading of *Organisation deleted*. The alternatives, every creation ever and creations per period, were not chosen either. *Decided by the owner.*

### Is anyone told of a recognition?

No. *The facilitator's resolution.*

## What the story added

The rules this story found live in these pages; its hotspots above say why.

- [Who's who](../../language/who.md), [Words beneath the story](../../language/system-words.md)
- [The timeline's onboarding chapter](../timeline/02-onboarding.md), [gates](../timeline/gates.md), [dropped events](../timeline/dropped-events.md), [people](../people.md)
- [Person and Organisation](../../map/person-and-organisation.md), [the whole map](../../map/README.md), [the integration contract](../../decisions/integration-contract.md)
- [Organisation's design](../../design/organisation/README.md), [Tenancy's design](../../design/tenancy/README.md)
- [The front desk story](front-desk.md)
