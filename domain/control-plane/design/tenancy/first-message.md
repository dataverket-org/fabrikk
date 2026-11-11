# The first message

*Part of [Tenancy's design](README.md).* Organisation pins its tenant, so no Organisation instance exists for a tenant that has not been created, and *Organisation created* cannot be the thing that creates it.

### The visitor stands at the front desk

A visitor is a login with or without organisations elsewhere, since a login spans organisations and the desk is where any login goes to create one. The front desk is an account of its own, no tenant's, holding nothing of any organisation; it imports the catalogue entry and exports *accept installation terms*, *validate* and *create organisation* into the installation's account, and nothing else.

### *create organisation* goes to Tenancy, not Organisation

Tenancy is pinned to no tenant and runs beside admission in the installation's account, because it serves every tenant by nature: it makes them. The gate is the installation organisation's policy for its front desk, the login's terms accepted and validation and the person's count of organisations owned, enforced at authorisation where the command enters, where Person holds all three facts; the person id and the terms' identity are bound onto the command there, never written by the sender. Tenancy mints the organisation id, which is the tenant id and names the account; creates the tenant and its account; makes the installation agreement's wiring, *Tenant wired*; and forwards *create organisation* into the new account, where Organisation creates the aggregate, the first owner and the installation's agreement, and emits *Organisation created*.

### The command waits for the account, not the other way round

Nothing in a new account can act until its instances run, and every instance pins its tenant at startup, so *Tenant created* is also what brings the tenant's instances up. The forwarded command waits durably in the account until Organisation is there. That is why it is a command into the account and not a synchronous call. The engineering view, admitted because it decides the shape.

### *Organisation created* is a domain event

Nothing on the map consumes it, and the fact that must be audited is the command, which carries the actor and arrives in the installation's account, where the installation's Audit is. The copy Tenancy forwards into the new account speaks as Tenancy, the instance that forwards it, and carries the visitor's delegation to Tenancy, issued in the visitor's session for the actor they addressed, so that the organisation's own record of its creation names the visitor and not only Tenancy; it is audited too, as every command inside an organisation's account is ([the words beneath the story](../../language/system-words.md), *delegation*).

### The installation's organisation is a given

It exists before the story, with the platform; no visitor creates it. It provides the control plane and may provide other products, and nothing but the account tells it apart from another provider.

### The command is answered, as every human command is

Answered with the organisation id Tenancy minted; no event crosses back. The visitor's next act is as the first owner in the new account, once Organisation has created them there, and being admitted to it is how they learn it is ready.

## Rejected shapes

### A provider-pinned Organisation instance emits *Organisation created* from the provider's account

Breaks the pin rule for Organisation, and the rule that the emitting context owns the name becomes a fiction: Organisation would emit it for a tenant it is not.

### The visitor asks Tenancy for a tenant, then sends *create organisation* into the new account

Two round trips; the client learns tenancy exists; an abandoned second step leaves an account with no organisation to clean up; and the visitor is left unanswered.

### The visitor as a user of the provider's organisation

The visitor as a user of the provider's organisation, admitted into the provider's account with a visitor role: the shape Zitadel's cloud uses, a portal user first. It put the public in the account that runs the provider's products, its Audit and its record and mirrors every organisation's agreement entry, with per-command authorisation as the only wall between them, and it made every organisation's first step a step at one provider. The front desk keeps the account the wall for the public as for organisations, and an organisation is created before it has chosen any provider but the installation.

