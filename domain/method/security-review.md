# Security review: the control plane

*Kept beside [the method](README.md).* An adversarial reading of the control plane, read as Stack would read it: an actor, an invariant, a command, a crossing or a published language, and nothing about mechanism. Each finding is decided by the domain owner and is a rule in a page of the model; this page says where each rule stands, so the next reader can find the rule without the finding.

## At a glance

- **Ten findings, ten rules,** each a sentence in a page of the model, listed below.
- **Two things resolved several findings together** rather than one by one: the installation as an organisation, and a provider, which answered the visitor, the platform operator, the record's integrity and the shape for several providers; and the actor and the delegation, which carried the provider's duties.

## Where each finding landed

| Finding | The rule, and where |
|---|---|
| The actor named by the sender | The actor is what admission bound the connection to, never written by the sender; a message claiming another is refused and audited; a delegation is a proven grant naming the actor it is good for. [Words beneath the story](../control-plane/language/system-words.md), *actor*, *delegation*, *envelope* |
| The visitor in the provider's account | The visitor stands at the installation's front desk, an account that is no tenant's, with or without organisations elsewhere, and its login has accepted the installation's terms before it validates or creates anything; an organisation is created in an account of its own, with the installation as the provider of the control plane and no other, and comes to a provider by accepting one of its products' terms. [The first message](../control-plane/design/tenancy/first-message.md), [who's who](../control-plane/language/who.md) |
| The unvalidated editor | Which roles require a validated user, one whose login is validated, is organisation policy above the owner floor; a role the policy requires it for is held by a user whose login is not validated and does not apply, authorisation refusing the user's commands in it until *Login validated* arrives; the installation organisation's policy guards its front desk; an unvalidated user the policy allows is answered for through its owners. [Who's who](../control-plane/language/who.md), *organisation policy* |
| The width of the tamper-evidence claim | A record is append-only, enforced by the installation, above the party that keeps it; an act never written shows against the original in the organisation's own account, which every provider act on its things through the control plane crosses into. [The audit decision](../control-plane/decisions/audit.md) |
| The provider's duties | A duty is the system's word, held only as the provider's organisation policy grants it, and every provider command onto an organisation is authorised against its duty. [Who's who](../control-plane/language/who.md), *duty* |
| The person id written by the sender | Bound at entry from Person's own fact, never written by the sender, and so is the identity of the installation's terms the login accepted, which *create organisation* carries, and the count of organisations the person is an owner in, which its gate reads against the person id; the envelope row states the rule for everything that names a party. [Tenancy's command](../control-plane/design/tenancy/commands-and-policies.md) |
| *Terms accepted* naming any organisation | A provider publishes each product's terms in the catalogue; *accept terms* is refused unless the named product is listed under the named provider with those terms; the provider's say is the conditions for activation its organisation policy names, today approval or none, the quota, new terms with notice and offboarding, a held agreement's with reason declined. [Organisation's commands](../control-plane/design/organisation/commands.md) |
| An instance's tenant at admission | Tenancy's fact, named in the identity Tenancy gives an instance when it brings it up. [Words beneath the story](../control-plane/language/system-words.md), *admission* |
| The provider on an announcement | The exporting account, told by the import, never written. [Words beneath the story](../control-plane/language/system-words.md), *envelope* |
| The delegation's issuer | The identity provider, within the user's own session, for the actor the user addresses. [Words beneath the story](../control-plane/language/system-words.md), *delegation* |
