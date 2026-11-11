# Read models

*Part of [Organisation's design](README.md).* The grain was chosen against every reader in the domain.

## Read by humans through the API

Scoped by the organisation policy.

| Read model | Holds | Who reads it |
|---|---|---|
| Organisation overview | Name; per agreement, the provider and the agreement's state, for one held the conditions still unmet, for the installation's a pending closing with the owners who requested it or a running notice with its end; per product taken, the terms and their state, the product's state with the day its notice ends while offboarding, whether withdrawn, and the quota in its counts | Owner, editor, viewer |
| Users and roles | Each user with its login, whether the login is validated, disabled or not, roles, and per role whether it applies or is held without applying | Owner; others as the organisation policy allows |
| Organisation policy | The organisation's rules | Owner |

Zitadel holds users and logins beneath Organisation, so the users-and-roles view is partly Zitadel's. What Organisation's model adds is validated, the roles, and whether each applies. How that is wired is implementation.

## Published for other contexts

The shape [reads](../../decisions/reads.md) prefers for rarely changing facts: state in a KV bucket, mirrored into the accounts that read it. **One entry per agreement, the agreement entry,** the installation's included. The organisation's own lifecycle publishes none: its integration events are notifications, read by Person and Audit.

| Entry | Holds | Who reads it |
|---|---|---|
| The agreement | State; while held, the conditions unmet; per product taken, keyed by the product the catalogue lists, the terms and their state, the product's state with the day its notice ends while offboarding, and the quota; for the installation's, the pending closing and the notice's end | The instance a provider runs for each product, for the agreement's state and its own product's terms, state and quota; the installation's account for the installation's, whose product has no contexts to read it |

Rules:

- **The agreement entry carries its state in one field,** held, active, offboarding or ended, **and each product's in two,** a state, held, offboarding or ended, and the terms, current, replaced or expired. Separate fields because a product's terms can expire while it is held, and a product can be offboarding with its terms expired. *May it ask* is agreement active, the product held and its terms current. A product reads only its own key.
- **The entry is a full snapshot,** so a reader rebuilds its projection from the latest one, and each integration event of the agreement carries it.
- **The events still go out.** A product's refusal and its ending at the notice's end are reactions to being told, not to polling.
- **The entry is deleted with the organisation;** the audit record is what remains.

The product's facts sit inside the agreement entry rather than in an entry per product, because a product needs the agreement's state and its own facts in one snapshot, and because they are one aggregate's. The grain was chosen over three others: one entry per organisation ships every fact to every reader and would show one provider another's quota; one entry per fact has no snapshot; one entry per reader makes the upstream know its downstreams. One entry per agreement keeps a snapshot and makes the agreement the unit a provider imports, so a second provider is a second entry and no redesign.

## Kept by Organisation from other contexts

Beside the projection below, Organisation reads two published languages as they stand: the catalogue entry, to validate *accept terms*, *set quota* and *set policy*, and a provider's published conditions for activation, as the installation's dormancy periods are read. It keeps no copy of either.

| Projection | Fed by | Used for |
|---|---|---|
| Validated, per login, with the person id | Person's *Login validated* | Marking every user of the login validated; granting owner; making held roles apply |
