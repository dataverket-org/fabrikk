# Events

*Part of [Organisation's design](README.md).* A domain event is a fact an aggregate records for its own context; an integration event is the published contract, named after its aggregate, audited, and carrying the agreement entry (see [read models](read-models.md)). The installation's agreement publishes the same events as any, naming the installation and the control plane.

| Aggregate | Domain events, inside | Integration events, published |
|---|---|---|
| **Organisation** | Organisation created, Policy set, Organisation data deleted, User data deleted | User onboarded, Role granted to user, Role revoked from user, User disabled, User deleted, Organisation deleted |
| **Agreement** | Agreement approved, Terms replaced | Terms accepted, Agreement activated, Quota set, Terms expired, Offboarding requested, Offboarding withdrawn, Offboarding lapsed, Terms ended, Agreement ended |

### *Terms accepted* crosses every time

*Terms accepted* crosses every time, since it names the provider and the product and Tenancy wires the account on the first at a provider and the first for a product. The very first names the installation and the control plane, at *Organisation created*; Tenancy wires nothing on it, the installation's wiring having been made at *Tenant created* so that it could cross at all.

### A hold is no event

The agreement entry names the conditions unmet, and *Terms accepted* carries it, so the organisation and the operator are told by the fact that made it. *Agreement approved* stays inside; *Agreement activated* crosses when the last condition is met. A declined agreement ends with *Terms ended* and *Agreement ended*, the reason on the *Offboarding requested* before them.

### The user events cross, to Person

The user events cross, to Person, which keeps which organisations a login has a user in and where its user is an enabled owner, for the installation's limit. The invitation is no event; the user exists from *User onboarded*. The login is in the payload and never in the audit entry.

### A role applying, or held without applying, is no event

Whether a role applies is read off the policy and the login's validation, so neither a tightened *Policy set* nor *Login validated* records anything about a user.

### *Terms replaced* stays inside

*Terms replaced* stays inside, being Organisation's record of Catalogue's *New terms published*; *Terms expired* crosses, since the product must refuse on it.

### *Offboarding withdrawn* and *Offboarding lapsed* cross

Only the installation's agreement publishes them, and they cross: each undoes an *Offboarding requested* that crossed and was audited, so the record shows a closing asked for and not done.

### *Terms ended* follows *Organisation cleared*

It follows whenever the answer arrives; *Offboarding requested* before it carries the day each product's notice ends. Each is read by Tenancy. The installation's *Agreement ended* is the last of an organisation's; after it only *User deleted* and *Organisation deleted* cross.

### *Organisation created* is a domain event

Nothing consumes it, and the tenant and account exist before Organisation publishes anything. What crosses is the command, audited in the installation's record, and the installation agreement's first *Terms accepted* beside it; see [the first message](../tenancy/first-message.md).

