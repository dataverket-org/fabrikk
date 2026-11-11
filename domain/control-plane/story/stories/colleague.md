# A colleague joins and leaves

*Part of [the story](../README.md).* The third story from a person's side: **an owner invites a colleague, who joins with any login; the owner makes them an editor, then tightens the organisation's policy so that editors must be validated, and the colleague validates; later the colleague leaves and is disabled or deleted, as the policy says.** Terms follow [the glossary](../../language/README.md); what the story added to the model is listed at the end.

## At a glance

- **It starts** when an owner onboards a colleague, and **ends** when the colleague's user is disabled or deleted and the organisation has its owner as before.
- **An invitee is covered by the organisation.** The organisation's agreement with the installation covers its users; a login accepts the installation's terms personally only before it validates or creates an organisation, at the front desk or from the organisation it is in. A colleague who only works in the organisation accepts nothing. The owner's decision.
- **A tightened policy holds the role and withholds its effect.** When the policy comes to require a validated login for a role a user already holds, the role stays granted and does not apply: authorisation refuses the user's commands until *Login validated* arrives, and the users-and-roles view shows which roles are held without applying. Nothing is revoked, nothing is refused, no event. The owner's decision.
- **A role other than owner is granted freely and applies when the login meets the policy.** Owner is the system's floor, granted only to a validated login; every other role is granted to any user and applies only while the organisation policy's requirement for it is met, which is the same rule as the tightening. The facilitator's resolution.
- **Departure is the policy's.** The organisation's policy says whether a departing user is disabled or deleted; an owner does it; the last enabled owner can be neither.
- **No pivotal event.** The story runs chapter 2's threads; what it proves is organisation policy and the roles.

## The events

The story as it would run in a team today: a new colleague gets an account, a role, an ID check, and one day leaves.

1. User onboarded *(by an owner, naming the colleague's login; the user exists in the organisation from this moment, with no role. Person is told, and keeps the login's organisation. The login need not have logged in anywhere yet)*
2. The colleague logs in *(not an event; admission places the login in the organisation it was invited to. The installation's terms are not presented: the colleague acts under the organisation's agreement)*
3. Role granted to user *(editor; the organisation's policy requires no validated login for it yet, and the role applies)*
4. Policy set *(by an owner: editors must be validated. The colleague's role is held and does not apply from now on; the colleague is told, and the users-and-roles view shows it)*
5. Installation terms accepted, Login validated *(the colleague validates by BankID or Vipps, from the organisation, accepting the installation's terms first; Person ties the login to a person, new or recognised, and tells the organisation, which marks the user validated; the editor's role applies again)*
6. The colleague leaves: User disabled, or User deleted *(by an owner, as the policy says; Person is told either way. A deleted user's login keeps its other organisations, if any, and is a visitor with none; a disabled user still exists and holds no role that applies)*

Side paths: the owner grants a second owner, refused unless that user's login is validated; the colleague's login has organisations elsewhere and is validated already, so step 5 is nothing and the role applies at step 4 as before; the last enabled owner tries to disable or delete themselves and is refused; the policy is loosened again and every held role applies at once.

## People and parties

The owner, who onboards, grants, sets the policy and disables or deletes; the colleague, who logs in, validates and leaves; Person, which keeps the login's organisations and its validation. The means of validation. No provider.

## Hotspots

### Does an invitee accept the installation's terms?

No: the organisation's agreement covers its users, and a login accepts the terms personally only before validating or creating an organisation. The alternatives, every login at its first login, and acceptance at validation only, were not chosen: the first makes every colleague pass the front desk, the second is this rule with the front desk's case missing. *Decided by the owner.*

### What does a tightened policy do to a role already granted?

Holds it and withholds its effect until the login validates. The alternatives, revoking every role the policy now forbids, and refusing the policy while a user would violate it, were not chosen: the first makes a policy change a mass change of roles, the second makes the owner chase every user before tightening. *Decided by the owner.*

### Is a role granted to an unvalidated login refused, when the policy requires validation?

No: one rule covers granting and tightening alike, a role applies only while the login meets the policy for it, and owner is the one role the system refuses to grant to an unvalidated login. *The facilitator's resolution.*

### Is the invitation an event?

No. *User onboarded* is the fact, naming the login; the login arrives at its first login, and Person keeps the organisation against the login as named. *The facilitator's resolution.*

### Where does a user validate?

From the organisation, as from the front desk: *accept installation terms* and *validate* are sent from the front desk or from any organisation's account, and Person answers both. *The facilitator's resolution.*

## What the story added

The rules this story found live in these pages; its hotspots above say why.

- [Who's who](../../language/who.md), [Words beneath the story](../../language/system-words.md)
- [The front desk story](front-desk.md), [the same human again](same-human-again.md)
- [The timeline's onboarding chapter](../timeline/02-onboarding.md), [gates](../timeline/gates.md), [people](../people.md)
- [Person and Organisation](../../map/person-and-organisation.md), [the integration contract](../../decisions/integration-contract.md)
- [Organisation's design](../../design/organisation/README.md)
