---
audience: contributor, agent
---

# Identity

How a connection is identified before it can do anything. Which organisations exist, where a login may be placed,
and what a role allows are the domain model's ([products.md](products.md)).

## Who holds what

- **Humans** authenticate with Zitadel.
- **Machines** use workload identity: a token from the in-cluster issuer of the cluster the workload runs in, and a
  security token service (STS) that exchanges it. No machine holds a standing credential: no static secret, no
  long-lived key.
- Authority travels as short-lived, audience-scoped tokens that expire on their own.

## Admission

Admission is the NATS auth callout, and it is the only authentication path into NATS.

- It verifies the token, identifies the connection's actor, places the connection in exactly one account, and writes
  the permissions that bind the actor to the connection. The server stamps no sender on a publish, so those
  permissions are what makes the actor true.
- It fails closed. No token, an unknown issuer, an expired token, a wrong audience, admission unreachable: all deny.
  There is no fallback user, no static credential, and no bypass for tests in a production build.
- Access tokens are JWTs, never opaque tokens.
- The JWKS cache is bounded in time, and a successful refetch replaces the whole cached set.
- Development tokens live at most one hour.
- Renewing a token is a new connection, because a connection's permissions and inbox prefix are fixed when it is
  admitted ([messaging.md](messaging.md)).

## Delegation

A human action carried out by a machine is delegated, not anonymous. A delegation is a token exchange with the
identity provider: the user's token as grounds, naming the instance that will act, per session and time-limited,
never per message. The receiver compares the actor the delegation names with the connection's, and the audit record
carries both.

## In tests

Nothing stands in for an issuer. A system test gets its tokens from the real Zitadel in its stack, and UAT from the
environment's (dev-environment skill). A unit test pins a decision about claims it is given, and starts no issuer.

**Why.** A control plane that holds standing credentials to what it manages is the breach that matters. Tokens that
expire, issued for one audience from an identity the platform already proves, leave nothing to steal at rest.

## Open

Humans through Zitadel and machines through in-cluster issuers and an STS are decided. The rest of the machine path
is not, and the first slice that admits a machine needs it decided first:

- **The STS.** What it is and where it runs: Zitadel's token exchange, or a service of its own.
- **What admission accepts for a machine.** Only the token the STS issues, or an in-cluster token directly.
- **Trusting an in-cluster issuer.** Who registers its issuer URL and keys, and how that trust is withdrawn.
- **From workload to actor.** How an issuer, a namespace and a service account become an actor and an account.
- **Audiences.** The audience of each token on the path.
- **The organisation a human is entering.** Which claim names it, given that a login spans organisations.
- **The dev loop.** What stands in for an in-cluster issuer in the verify stack.
- **Key custody.** Where the NATS operator and account signing keys that admission and the account wiring need are
  held, their scope and rotation. In operator mode that is the operator's and each account's signing keys, the
  activation tokens for private imports, and the callout's own key. The same table covers the wiring a provider's
  and a product's crossings need.
- **The identity provider's side of a tenant.** Whether a tenant is a Zitadel organisation or a project
  (`domain/open.md`, known tensions), who creates it when a tenant is made, and how a login that was named before
  it existed at the identity provider is matched at its first login.
- **Authorisation.** Where a handler reads what decides a command. The model fixes that the role, the policy and
  the login's validation are read at each command and never stored as a state of the user.
