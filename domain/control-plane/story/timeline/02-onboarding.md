# 2. Onboarding an organisation

*Part of [the timeline](README.md).* The rules behind each step are [Person and Organisation's](../../map/person-and-organisation.md) and [Organisation's design's](../../design/organisation/README.md); the stories that found them are [the front desk](../stories/front-desk.md), [the same human again](../stories/same-human-again.md), [a colleague joins and leaves](../stories/colleague.md) and [taking the example product](../stories/taking.md).

1. Logged in *(not an event: a login from any identity provider the installation allows; admission places it in the organisation it is entering, or at the front desk, where it is a visitor)*
2. Installation terms accepted *(by the login, before it validates or creates an organisation; once per login)*
3. Catalogue listed, Product viewed *(reads)*
4. Login validated *(through BankID or Vipps; Person mints the person id or recognises the person it knows, and tells every organisation the login has a user in)*
5. **[P] Organisation created** *(by the validated visitor, who becomes its owner; the agreement with the installation is born with it, active at once, and the account is wired for it. Refused past the installation's limit on organisations a person is an owner in)*
6. Terms accepted *(by an owner, naming a provider, a product and its terms; the first at a provider is the agreement's birth, and the account is wired to the provider's and for the product)*
7. **[P] Agreement activated** *(once every condition for activation the provider's policy names is met; at once where it names none, otherwise held until the operator's *approve agreement*. A held agreement the operator will not approve is declined, in [chapter 4](04-leaving.md))*
8. Quota set *(by the provider's operator, the ceiling per count, from the announcement's default until then)*

At any point from step 5 onwards, independently of the rest:

- User onboarded *(by an owner, naming any login; the user exists with no role, and the login need not have logged in anywhere; Person is told)*
- Role granted to user, Role revoked from user *(owner only to a validated login; any other role to any user, applying only while the organisation policy's requirement for it is met)*
- Policy set *(by an owner, in the system's vocabulary; never refused for the users that exist, a tightened requirement holding a role without its effect)*
- User disabled, or User deleted *(as the organisation policy says; never the last enabled owner; Person is told)*

At any point from step 6 onwards: Terms accepted for a further product of the same provider, into the same agreement.

A visitor whose login has a user in no organisation is dropped by Person after the installation's dormancy period for visitors, Visitor dropped, and the person with it if that was its last validated login.
