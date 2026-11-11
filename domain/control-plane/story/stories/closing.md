# An organisation that took nothing closes

*Part of [the story](../README.md).* The fourth story from a person's side: **an organisation that never took a provider's product is closed, by its owners or by the installation for dormancy; its users go, the person goes with its last login, the record closes, the account is removed, and the retained record ends later still.** Terms follow [the glossary](../../language/README.md); what the story added to the model is listed at the end.

## At a glance

- **It starts** when an owner requests offboarding of the installation's agreement, or the installation's operator does for dormancy, and **ends** when the organisation's retained record is deleted.
- **Closing is offboarding the installation's agreement,** the one agreement every organisation holds and the last to end. The control plane holds nothing for the organisation but the organisation itself, so no product answers: Organisation ends the terms, the agreement and then itself.
- **Who may close is organisation policy.** The policy says whether any owner's request closes the organisation or every enabled owner must request it; the default is any owner. The owner's decision.
- **The owner's closing is at once; the installation's is at the end of notice, and lapses if a product is taken.** The installation's terms give the notice; the organisation is told; an owner who accepts a provider's terms before the notice ends keeps the organisation, since the reason, no agreement but the installation's, no longer holds. The owner's decision.
- **One pivotal event,** *Agreement ended*, the installation's: before it an organisation; after it only deletion and retention.

## The events

The story as it would run in a team today: the project is over, or nobody has been around for a year.

1. Offboarding requested *(for the installation's agreement: by an owner, by choice, refused while any agreement with a provider stands, and, where the organisation policy requires every enabled owner, recorded against the owner and told to the rest until the last has requested it; or by the installation's operator, reason dormancy, when the organisation has held no agreement but the installation's for the installation's dormancy period, with the notice the installation's terms give)*
2. Terms ended, then **[P] Agreement ended** *(at once on the owners' request; at the end of notice on the operator's, unless an owner has accepted a provider's terms meanwhile, on which the offboarding lapses and the agreement stands. No *Organisation cleared*: the control plane holds nothing for the organisation but the organisation itself)*
3. User deleted, once per user *(Person drops the organisation from each login's; a login left with no organisation is a visitor)*
4. Organisation deleted *(the last message the organisation's account carries)*
5. Record closed *(the installation's Audit holds the organisation's last entry; the retention period starts, and Tenancy removes the account)*
6. Visitor dropped, then Person deleted *(the last owner's login, in no organisation, is dropped by Person after the installation's visitor period, and the person with it if that was its last validated login; a login with organisations elsewhere stays, and so does its person)*
7. Retention period ended, then Retained records deleted *(the installation's Audit)*

Side paths: an organisation with an agreement at a provider is refused and gives that agreement back first, which is the provider stories' matter; an owner whose request waits for the other owners withdraws it, *Offboarding withdrawn*, before the last has requested; the operator's request lapses when an owner accepts a provider's terms during the notice, and the organisation is told; a login validated at the desk and never used in an organisation is dropped the same way as the owner's, which is the front desk story's side path.

## People and parties

The owners, one or all as the policy says; the installation's operator, under its duty, for dormancy; Person, Audit and Tenancy, which do the rest. No outside party.

## Hotspots

### Is one owner enough to close?

As the organisation policy says: any owner, the default, or every enabled owner, in which case the first request waits for the rest and may be withdrawn. The alternatives, any owner always, and every owner always, were not chosen: the first leaves a shared organisation to one owner's act, the second adds a pending state every organisation pays for. *Decided by the owner.* The withdrawal, *Offboarding withdrawn*, and the default are the facilitator's.

### When does a dormant organisation end, and can it be saved?

At the end of the installation's notice, and yes: an owner who accepts a provider's terms before then keeps it, the offboarding lapsing since its reason no longer holds. The alternatives, no way back and ending at once, were not chosen: the first is harshest for a team that was merely slow, the second returns a team to nothing. *Decided by the owner.* Whether an owner's own closing under the policy's "every owner" rule can lapse the same way is no question: it is withdrawn instead.

### What if the owners change while a request is pending?

Completeness is one condition, every enabled owner has requested, re-evaluated whenever the owners or the request change: an owner who leaves is no longer waited for, an owner who joins is, and a loosened rule completes it. It completes only while no provider's agreement stands, so nothing that happens meanwhile can close an organisation that has taken a product. *The facilitator's resolution.*

### Does the owners' closing wait for a notice?

No: the control plane holds nothing for the organisation but the organisation itself, and the notice every offboarding carries is an upper bound and never a wait, so the terms end as soon as the request is complete. *The facilitator's resolution.*

### What of the organisation remains?

The installation's record of its lifecycle, under retention; nothing of a provider's, since it held no provider's agreement. *The facilitator's resolution.*

## What the story added

The rules this story found live in these pages; its hotspots above say why.

- [Who's who](../../language/who.md), [The glossary's record](../../language/record.md)
- [The timeline's leaving chapter](../timeline/04-leaving.md), [gates](../timeline/gates.md), [dropped events](../timeline/dropped-events.md)
- [Organisation's design](../../design/organisation/README.md), [Tenancy's design](../../design/tenancy/README.md), [Audit](../../map/audit.md)
