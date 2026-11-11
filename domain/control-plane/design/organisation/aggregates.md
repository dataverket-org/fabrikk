# Aggregates

*Part of [Organisation's design](README.md).* An aggregate is the consistency boundary: the facts one command changes together under one set of invariants. The two lifecycles give two.

| Aggregate | Identity | Holds | Invariants |
|---|---|---|---|
| **Organisation** | The organisation id, which is also the tenant | Its users as entities, each with its login, disabled and roles, and validated, taken from its login; the organisation policy; its lifetime. Whether a role applies is read off the policy and the login's validation, never stored | At least one enabled owner always exists. Owner is held only by a user whose login is validated; any other role by any user. Always holds at least one agreement, the installation's, born with it; deleted only after its last agreement ended, which is the installation's |
| **Agreement** | Organisation id plus the provider's id; one per provider, the installation one of them | The products taken, as entities: terms and their state, the product's state, the day its notice ends while offboarding, the quota; the agreement's state; while held, the conditions for activation unmet; for the installation's, the pending closing with the owners who requested, and the dormancy notice's end | A product entity exists only with terms accepted for it, and a quota only in counts the catalogue entry names. Held from birth until every condition for activation is met, active from then and never held again. A product's terms end only on its *Organisation cleared*, no later than the notice's end; the control plane's by Organisation's own hand; a declined agreement's all at once. The agreement ends only when its offboarding was requested and every product's terms have ended. Neither state goes backwards from offboarding. The installation's is not offboarded by an owner while another agreement stands, and is offboarding only once the owners' request is complete or the operator's notice has ended |

## Users are entities inside Organisation

Not an aggregate of their own: "at least one enabled owner always exists" is a rule over all of an organisation's users at once, and an invariant lives inside one aggregate. Zitadel stays the store for logins beneath it; the aggregate holds membership, each user's login, whether that login is validated as Person tells it, and roles. Whether a role applies is not held, so a tightened policy and a login's validation touch no user. One login may have a user in several aggregates; each learns of its validation only from Person.

## Products are entities inside Agreement

Not an aggregate of their own: "the agreement ends when every product's terms have ended" is a rule across the products of one agreement. The entity is keyed by the product the catalogue lists and holds what the agreement has per product, see [the design note on products](../../decisions/products.md). The installation's agreement holds one entity, the control plane, with terms and state and no quota.

## The installation's agreement is an Agreement like any other

One aggregate, not two kinds: the same entity, state machine and entry serve it, and what sets it apart is where its facts come from. It is created by *create organisation* together with the Organisation aggregate; its product's terms end by Organisation's own hand rather than on *Organisation cleared*, since the control plane holds nothing but the organisation itself; and it is the agreement an owner cannot give back while another stands. It alone holds a request that is not yet an offboarding, the owners' pending closing and the operator's running notice, because a request for a provider's agreement is offboarding at once and the notice there is the products' to run.

## State machines

### Agreement

Born on the first *Terms accepted* naming the provider, the installation's with the organisation; held while a condition for activation is unmet; active once every one is met, never back to held; offboarding on *request offboarding* for the agreement; ended when every product's terms have ended. A held agreement declined goes to offboarding and ended in one step. The installation's goes to offboarding and ended in one step when the owners' request is complete or the operator's notice ends; before that it is active with a request on it: a pending closing, which grows by each owner's request, shrinks by *withdraw offboarding*, completes on the last owner's or on a *Policy set* that loosens the rule, and is gone when the last name is withdrawn; or a running notice, which lapses on *Terms accepted* at a provider.

### A product under the agreement

Held on *Terms accepted* for it; offboarding on *request offboarding* naming it or the agreement, with the notice's end on the entity; ended on *Organisation cleared*, or in one step with a declined agreement; held again on a later *Terms accepted*, which starts the entity over. Beside the state, the terms: current, replaced with the effective date, expired, current again on acceptance. An expiry does not move the state.

### A role of a user

Held from *grant role*; gone on *revoke role* or with the user; not held while the user is disabled. While held, applying or not, as the organisation policy's requirement and the login's validation say, with no event for either.

### Organisation

Exists from *create organisation*; deleted after its last *Agreement ended*, the installation's, users first and then itself.
