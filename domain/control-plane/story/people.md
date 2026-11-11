# People and outside parties

Who and what causes the events on the [timeline](timeline/README.md). A role here is a responsibility, not a person or a job title: at a given provider several roles may be held by the same people, and some will be partly or fully automated. That question belongs to design-level work and does not change the roles.

## At a glance

- **Three roles in an organisation:** owner, editor and viewer, the set Google Cloud uses; and the visitor, a login at the installation's front desk, who holds no role.
- **One provider duty:** operator. A provider's users hold the same three roles as any organisation's, and the duty only as the provider's organisation policy grants it; the installation's users hold it the same way.
- **Two kinds of outside party:** the identity providers a person may log in through, and the means of validation. A product has its own.

## Roles

| Role | Causes events like |
|---|---|
| **Visitor** | Installation terms accepted, Catalogue listed, Product viewed, Login validated, Organisation created, the last its last act as a visitor; and, having done none of it for the installation's period, Visitor dropped, Person's |
| **Owner** | Organisation created, Terms accepted, User onboarded, Role granted to user, Role revoked from user, Policy set, User disabled, User deleted, Offboarding requested, Offboarding withdrawn |
| **Editor** | What a product lets an organisation do with the things it holds: for the example product, Resource asked for and Resource given back; and, as any user, Installation terms accepted and Login validated |
| **Viewer** | Read-only: what the organisation holds, and its audit view |

The validated visitor who creates an organisation is its owner, and the owner commits the organisation to a provider's terms. The viewer causes no events but depends heavily on what the events produce; that matters when read models are discussed. What each role may do is in [who's who](../language/who.md).

## The provider's duty

| Duty | Causes events like |
|---|---|
| **Operator** | Product announced, through the service that runs the product; Terms published, New terms published, Product withdrawn, Agreement activated by *approve agreement*, Quota set, Offboarding requested with reason declined, dormancy, terms expired or product withdrawn, Offboarding lapsed |

The operator is a duty, not a role: a role is what a user does with its own organisation's things, a duty is what a provider's user does to other organisations. No one holds it by default; the provider's organisation policy grants it, and every command the provider sends onto an organisation is authorised against it. See [who's who](../language/who.md), *duty*.

## Outside parties

| Party | Involved in |
|---|---|
| **Identity providers for login** *(FEIDE, Entra ID, Google, others the installation allows)* | Logged in, which is not a fact of the control plane's |
| **Means of validation** *(BankID, Vipps)* | Login validated |

A product's own outside parties are in its own story.
