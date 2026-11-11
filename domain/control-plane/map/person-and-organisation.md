# Person and Organisation

*Part of [the map](README.md).* The boundary between the two, what each holds, and what crosses. What Organisation does with what it holds is [its design](../design/organisation/README.md); Person is not yet designed, and its rules are here.

The organisation has a journey of its own with three pivotal events, *Organisation created*, which is also the birth of its agreement with the installation, *Agreement activated* and *Agreement ended*, and every product reads its facts without owning them. The person is a separate context because its facts span organisations: a login may have a user in several, validation is done by outside parties once per login, and the external ID is kept to recognise the same human across logins and organisations, which an organisation that shares nothing cannot do. Person is the installation's.

| Side | Holds | Events |
|---|---|---|
| **Person** | The logins, each as Organisation or the front desk names it: the installation's terms it accepted, the organisations it has a user in, and its validation; the persons the validations reveal: the external ID, the person id, the logins tied to it, and the organisations in which one of its logins' users is an enabled owner | Installation terms accepted, Person recognised, Visitor dropped, Login validated, Person deleted |
| **Organisation** | The organisation, its users and roles, its policy, its lifetime; and its agreements, one per provider, the installation's from its birth: the products taken, each with its terms and its quota, the state, and for one held the conditions for activation unmet | Organisation created, Terms accepted, Quota set, Agreement activated, User onboarded, Role granted to user, Role revoked from user, Policy set, User disabled, User deleted, Terms replaced, Terms expired, Offboarding requested, Offboarding withdrawn, Offboarding lapsed, Terms ended, Agreement ended, Organisation deleted |

## Person's rules

### A login is the identity provider's and spans organisations

It may have a user in several; a user lives in exactly one. Admission places a connection in the organisation the person is entering, or at the front desk, where any login goes to create an organisation.

### The installation's terms are accepted once per login

Once per login, before it validates or creates an organisation, from the front desk or from an organisation it has a user in; a login that only has users in organisations accepts nothing, covered by their agreements. *validate* and *create organisation* are refused unless the login has accepted the current terms, read from Person's fact; on *create organisation* the terms' identity is bound onto the command from Person's fact, as the person id is.

### Validation belongs to the login, once

Person ties the login to a person by the external ID and publishes *Login validated* once to every organisation the login has a user in, and once to an organisation that later onboards a user of it. A validation that reveals an external ID Person knows gives the login the person id minted before, *Person recognised*, and no one is told; validating again changes nothing.

### Person keeps which organisations each login has a user in

It is told by *User onboarded* and *User deleted*, against the login as named, which need have logged in nowhere yet.

### The installation's limit counts organisations in which the person is an enabled owner

It counts them through any of its logins, told by Organisation of each user's onboarding, roles, disabling and deletion; a person who owns nothing counts nothing. The gate on *create organisation* reads the count against the person id.

### A login with no user in any organisation is dropped

It is dropped after the installation's dormancy period for visitors, *Visitor dropped*: what Person keeps of it goes, and the person with it if that was its last validated login. *Person deleted* follows when the last validated login tied to the external ID is gone.

### A login's name or a matching email proves nothing

Neither is acted on; a user whose login is not validated acts under its user id and is answered for by its organisation through its owners.

## Crossings

| Crossing | Kind | Direction | What the receiving side does with it |
|---|---|---|---|
| *accept installation terms* | Command | A visitor at the front desk or a user in any organisation's account, to Person | Records which of the installation's terms the login accepted, *Installation terms accepted* |
| *validate* | Command | The same, to Person; refused without the current terms accepted | Ties the login to a person, minting or recognising, and answers *Login validated* |
| Login validated | Event | Person to Organisation, carrying the person id, once per organisation the login has a user in | Organisation marks the login validated, and so every user of it; held roles apply |
| User onboarded, Role granted to user, Role revoked from user, User disabled, User deleted | Event | Organisation to Person, naming the login; the payload crosses, the audit entry holds no login | Person keeps the login's organisations and where its user is an enabled owner, for the limit; on *User onboarded* of a validated login it answers *Login validated* |
| Terms accepted | Event | Organisation to Tenancy, naming the provider and the product | Tenancy wires the account to the provider on the first, and for the product on its first; the installation's wires nothing more, having been wired at *Tenant created* |
| New terms published, Product withdrawn | Event | Catalogue to Organisation | Replaces the accepted terms until the date; marks the product withdrawn |
| *approve agreement*, *set quota*, *request offboarding* | Command | The provider's operator to Organisation, over the agreement's wiring, authorised against the duty | As [Organisation's commands](../design/organisation/commands.md) say |
| Agreement activated, Quota set, Terms expired, Offboarding requested | Event | Organisation to each product's acceptance | Read at the ask from the agreement entry; an offboarding refuses asks, releases reservations and sets the day the notice ends |
| Organisation cleared | Event | The product named to Organisation | Organisation ends the terms for that product, and the agreement once every product's have ended |
| Terms ended, Agreement ended | Event | Organisation to Tenancy | Tenancy withdraws the wiring; the installation's stays until *Record closed* |
