# Read models

*Part of [Tenancy's design](README.md).* Both reads are Tenancy's own facts.

| Read model | Holds | Who reads it |
|---|---|---|
| Tenants | Each tenant: id, account and whether it exists. Fed by *Tenant created* and *Tenant deleted* | Admission, in the installation's account. This is the list of accounts a connection may be placed in: a connection is placed in the account of the organisation the person is entering and refused when that organisation names no tenant here, a login an owner has onboarded is placed at its first login in the organisation it was invited to, a login at the desk to accept the installation's terms, validate or create an organisation, with or without organisations elsewhere, goes to the front desk, and an instance goes only to the tenant its identity names. The slice's second isolation test reads exactly this |
| Topology | Every account and what it exports to and imports from which other account: the installation's own, the front desk, each provider's, each organisation's, per agreement, the installation's first, and per product taken. Fed by *Tenant wired* and *Wiring withdrawn* | The installation's organisation, through the API. A statement of the wiring that the invariant in [the boundary](boundary.md) can be checked against |

Rules:

- **Tenants is a published entry in the installation's account,** the shape [reads](../../decisions/reads.md) prefers for rarely changing facts: one key per tenant, a full snapshot. Admission watches it and never asks Tenancy anything.
- **Tenancy keeps no projection from another context.** Everything in both reads is its own fact, and with the gate at authorisation there is nothing to keep.
- **Nothing on the map reads Tenancy.** An organisation learns of its account by being able to act in it; a provider sees its customers through the agreement entry of [Organisation's read models](../organisation/read-models.md), not here.

## The gate is authorisation

Tenancy does not read *Login validated* or *Installation terms accepted* from Person, nor its count of organisations the person is an owner in, although both run in the installation's account. It need not: *create organisation* is authorised where it enters, in the installation's account, and "only a visitor who meets the installation organisation's policy for its front desk may create an organisation" is a decision there, as every command is authorised by the instance that receives it, and the count is read against the person id there as the terms and the validation are. The command reaches Tenancy carrying the validated login, the person id the installation's Person minted or recognised and the identity of the installation's terms the login accepted, both bound at entry from Person's facts and never written by the sender, which Organisation needs anyway: the person id to make the creator an owner whose login is validated by construction, the terms to create the agreement with the installation under them. The external ID itself never leaves Person. Tenancy trusts the authorised command and keeps nothing from Person.
