# Commands and policies

*Part of [Tenancy's design](README.md).* Taken together because Tenancy has one command. A command is what a human or another context asks Tenancy to do; a policy is Tenancy reacting to an event with no one asking.

## Commands

| Command | Who sends it | Rules | Event behind it |
|---|---|---|---|
| *create organisation* | A visitor at the front desk whose login has accepted the installation's current terms and is validated | Gate: the installation organisation's policy for its front desk, that the login has accepted the current terms and is validated by the means it names, and that the person is an owner in fewer organisations than its limit, enforced at authorisation in the installation's account, where Person holds all three facts. The command arrives carrying the login, the person id and the terms' identity, the last two bound at entry from Person's facts and never written by the sender; a command claiming others is refused and audited. One tenant per organisation; Tenancy mints the organisation id and answers the command with it. A redelivered command makes one tenant, because the command carries its own identity | Tenant created; then the command is forwarded ([the first message](first-message.md)) |

That is the only command. The installation organisation's tenant is a given of the left edge and is not created in the story; any other provider's is created here like any other organisation's. Deletion is not a command: it follows the organisation.

## Policies

| Whenever | Tenancy does |
|---|---|
| *Tenant created* | Makes the installation agreement's wiring, the rows listed in [the boundary](boundary.md), recorded as *Tenant wired*; and brings the tenant's instances up, each with an identity naming the tenant, which is the fact admission places an instance by |
| *Tenant wired*, for the installation | Forwards *create organisation* into the new account. An account with no exports is not yet a place Organisation can act from, so the forwarding waits for the wiring, not only for the account |
| *Terms accepted* arrives from the organisation's account, naming a provider and a product | Only if the catalogue lists the product under that provider; otherwise nothing is wired and the event stands refused in the record. The first naming a provider other than the installation wires the agreement's rows to the provider's account and back, *Tenant wired* for the provider; the first naming a product wires the product's rows, *Tenant wired* for the product. Otherwise nothing: new terms accepted, or the installation's, wired at creation |
| *Terms ended* arrives from the organisation's account, naming a provider and a product | Withdraws the product's wiring: its exports and imports are removed, and nothing about the product crosses from then on. *Wiring withdrawn* for the product. What has crossed stays where it crossed to, Audit included. One naming the control plane withdraws nothing, since it has no product wiring |
| *Agreement ended* arrives from the organisation's account, naming a provider | Withdraws the agreement's wiring, every product's having gone before it; *Wiring withdrawn* for the provider. The installation's is the organisation's last agreement to end, and withdraws nothing yet: *User deleted* and *Organisation deleted* still cross the installation agreement's wiring after it, so that wiring goes with the account |
| *Record closed* arrives from the installation's Audit | Deletes the tenant: the installation agreement's wiring is withdrawn, *Wiring withdrawn* for the installation, and the account removed. Audit holds the organisation's last message and its retention clock runs, and what has crossed into the installation's and the providers' accounts stays there, so nothing retained goes with it. Emits *Tenant deleted* |

The compensation for a wiring that fails is left to Tenancy's implementation, under the rule that every command is answered.
