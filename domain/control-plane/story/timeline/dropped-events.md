# Dropped events

*Part of [the timeline](README.md).* Kept here so they aren't reintroduced by accident.

| Event | Why it was dropped |
|---|---|
| Trial requested, started, expired, converted | Trials belong to the money story |
| Agreement signed | *Terms accepted* is enough |
| Product subscribed, Subscription cancelled | A product is taken by accepting its terms and given back by offboarding; nothing is subscribed to |
| Product discontinued, End of life announced, Service sunset | *Product withdrawn*, a catalogue fact that ends nothing, and *Offboarding requested* per organisation with reason product withdrawn |
| Pending terms withdrawn | Pending terms are replaced, never withdrawn |
| Terms re-accepted, Terms rejected | Re-acceptance is *Terms accepted* again; rejection is letting the terms expire |
| Organisation verified | Persons are verified, not organisations |
| User offboarded | *User disabled* or *User deleted*, as organisation policy decides |
| User account registered, Person registered, Person validated | *Login validated*: validation belongs to a login, and a person is what it links across organisations |
| User validated | *Login validated*: validation is the login's, once, and every user of the login is validated by it |
| Person recognised, as an integration event | Person's domain event: no organisation is told of a recognition |
| A login naming its organisation | A login spans organisations; admission places a connection in the organisation the person is entering, or at the front desk |
| Organisation owner assigned, Owner transferred | The validated visitor who creates the organisation is its owner; ownership is one to N users, granted and revoked as roles |
| Organisation informed of a delivery, a resource given back, new terms | Being told is a property of every event, not an event of its own |
| Organisation closed, Organisation expired, Organisation activated, offboarded | Facts about the agreement, not the organisation: the organisation lives on until deleted, which follows the installation's *Agreement ended* |
| *delete organisation*, as a command | Every organisation holds the installation's agreement; closing is *request offboarding* for it |
| Closing with notice for the owners | The notice is an upper bound, never a wait, and the control plane holds nothing to wait for |
| An owner's offboarding naming a day | Every offboarding carries the terms' notice; a day of the owner's would be a second shape of one command, and no end at all would leave an organisation holding for ever |
| The operator withdrawing a dormancy offboarding | The reason either holds at the end of notice or has stopped holding, on which the offboarding lapses of itself |
| Logged in, User invited | Not facts of the control plane's: the login is the identity provider's, and *User onboarded* names it |
| Role held, Role suspended, Role revoked by policy | A tightened policy holds a role without its effect; nothing is revoked, and no event |
| Visitor expired, Login deleted | *Visitor dropped*, Person's; the login itself goes with the identity provider |
| Accept customer, Customer approved | Approval is a condition for activation the provider's policy names, met by *approve agreement*; the fact is *Agreement activated* |
| *decline agreement*, as a command | *request offboarding* with reason declined, while a condition for activation is unmet |
