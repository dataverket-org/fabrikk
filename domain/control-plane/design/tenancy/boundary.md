# The boundary

*Part of [Tenancy's design](README.md).* Tenancy is not on [the map](../../map/README.md); it is the first context named beneath it, and it is system-internal by the glossary's own rule that *tenant* is never a word of the story.

| Side | Holds | Events |
|---|---|---|
| **Tenancy** | The tenant: one per organisation, identified by the organisation id. Its account: the isolation wall. The topology: which accounts exist, and what each exports to and imports from the accounts of the providers it has agreements with, the installation's first, per agreement and per product taken | Tenant created, Tenant wired, Wiring withdrawn, Tenant deleted |

## Rules

### One kind of tenant

Every organisation is one, and a tenant has no kind: whether an organisation provides is a fact of its agreements. An organisation that provides runs the instances of its products in its account. Its Audit is there too, and in this story the provider runs it; that another organisation may one day keep a provider's record for it is [seen and left](../../../open.md#a-providers-record-kept-by-another). The installation's organisation runs Person, Catalogue and the installation's Audit in its, beside the two instances pinned to no tenant.

### Wired per agreement and per product taken

An organisation's account is wired per agreement and per product taken, and the same way for every organisation. The first wiring is the installation agreement's, made at *Tenant created*: Organisation's agreement events and entry, the user events for Person, *accept installation terms* and *validate* for Person, the envelopes of the organisation's own lifecycle for the installation's Audit, and, since any organisation may provide, its announcements, terms and withdrawals for Catalogue and every command and event of its own for the installation's Audit; back come *Login validated*, the catalogue entry, Catalogue's two events, the installation's policy and the audit view. To each other provider's account, from the first *Terms accepted* naming it: the agreement's rows of [the integration contract](../../decisions/integration-contract.md), importing back the operator's three commands and the audit view. For each product taken, from the first *Terms accepted* naming it: exactly the product's rows, importing back its replies and *Organisation cleared*. Nothing else crosses, and nothing ever crosses between two customer accounts. The wiring is what a pinned instance's acceptance rests on: a message naming organisation X is accepted because it arrived on X's export. This is the invariant that replaces fabrikk's earlier "no imports or exports between tenant accounts".

### The wiring is a consequence of the agreement and the terms, not of the organisation

Those exports run between an organisation and one provider, so they belong with the agreement of [Organisation's design](../organisation/README.md): the agreement's are made when *Terms accepted* first names the provider and withdrawn on *Agreement ended*; a product's are made when *Terms accepted* first names the product and withdrawn on its *Terms ended*. A further provider is a further agreement and a further wiring, a further product a further wiring under the same agreement, and a product announced after the agreement was made needs no re-wiring of anything: its wiring is made when the organisation accepts its terms. An organisation can ask a product only while its wiring stands, and the wiring stands only while its terms do, which is isolation doing the gate's work. The installation agreement's wiring follows the same rule with the agreement's own timing: it is made at *Tenant created*, ahead of the agreement's first fact, because the forwarded *create organisation* and Organisation's first *Terms accepted* need it to cross, so *Terms accepted* naming the installation wires nothing more; and it is withdrawn last, on *Record closed*, together with the account, since *User deleted* and *Organisation deleted* still cross it after the installation's *Agreement ended*.

### Admission and Tenancy are the two instances pinned to no tenant

Both are pinned to no tenant, and they run in the installation's account. Admission identifies a connection's actor and places it in exactly one account, the organisation the person is entering or the front desk, reading from Tenancy which account a tenant is; that read never leaves the installation's account.

### The installation's account imports what its contexts need

Nothing else: from the front desk its three commands; from each organisation's account the installation agreement's rows above. Tenancy's are *create organisation*, *Terms accepted*, *Terms ended* and *Agreement ended*; the rest are Person's, Catalogue's and the installation Audit's. *Record closed*, which Tenancy deletes on, is the installation Audit's, published in the same account, and is taken rather than *Organisation deleted* because the account must outlive its last message's crossing.

## Crossings

| Crossing | Kind | Direction | What Tenancy does with it |
|---|---|---|---|
| *create organisation* | Command | A visitor whose login has accepted the installation's current terms and is validated, from the front desk, with or without organisations elsewhere, to Tenancy | Creates the tenant and its account, makes the installation agreement's wiring, and forwards the command into the new account, where Organisation emits *Organisation created* and the installation agreement's first *Terms accepted*. The first crossing off the map, [the first message](first-message.md) |
| Terms accepted | Event | Organisation, in the organisation's account, to Tenancy, naming the provider and the product | The first naming a provider other than the installation wires the organisation's account to that provider's for the agreement, *Tenant wired* for the provider; the first naming a product wires it for the product, *Tenant wired* for the product. A later one for the same product wires nothing, and one naming the installation and the control plane wires nothing: that wiring stands from *Tenant created* |
| Terms ended, Agreement ended | Event | Organisation to Tenancy, naming the provider and, for terms, the product | Withdraws the product's wiring, or the agreement's: *Wiring withdrawn*. The installation's withdraw nothing yet; the installation agreement's wiring goes with the account. What has crossed stays where it crossed to |
| Record closed | Event | The installation's Audit, in the same account, to Tenancy | Withdraws the installation agreement's wiring and deletes the tenant and its account. Audit publishes it once it holds the organisation's last message, *Organisation deleted*, so the record is complete and nothing is lost with the account |

Tenancy publishes nothing to the contexts on the map. Not in Tenancy: who a user is, which is Person with the identity provider beneath it; what a user may do, which is authorisation; the terms and the quota, which are the agreement in Organisation.
