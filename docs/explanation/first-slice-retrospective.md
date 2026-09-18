---
title: "What the first slice taught"
type: explanation
project: fabrikk
audience: everyone
last-verified: 2026-09-18 @ d2bdf65
description: "A report on the first attempt at Sentral's first work item: why it grew, how to cut the next one in half, and what belongs in the skills."
weight: 50
---

# What the first slice taught

On 2026-09-17 and 18 the factory ran its first real work item, `sentral-hello-callout`: a tenant's operator runs
`dv hello`, the connection is admitted by Sentral's auth callout into that tenant's NATS account, permissions come
from a Cedar policy, the request crosses as a verified CloudEvent, and the isolation trio holds. The plan went through
six review cycles, two human cycle overrides, five versions, and 148 recorded findings before the human reset it.
Nothing was implemented. This page is the report: why it grew, what the first slice should be instead, and what the
session showed belongs in the skills. The run data is the source; the numbers here are from it.

## Why it grew

The outcome was reasonable. The slice was not. It carried four adversarial surfaces at once: the callout and
tenancy, the CloudEvents envelope with its replay window, a request and reply path with an inbox convention, and a
product CLI, plus the whole development environment. Each surface is a place eight reviewers can attack, and they
did: cycle 1 opened 78 findings, cycle 2 opened 47 more, then 15, then 8. Two thirds of the total came from the
envelope, the replay window, the inbox design, and the request path, none of which was needed to prove tenancy.

Two things made it worse. The plan inherited shape from context that was never meant as decision: the seven-segment
subject convention and the account-per-service topology of an earlier system, and a research note on NATS auth. The
reviewers rightly treated every inherited shape as unproven, so the plan paid for decisions it had not made. And the
drive loop, dispatching reviewers, merging their output, recording, resolving, advancing, was executed by the agent
from a skill's instructions. That is the expensive for-loop the talk warns about. It showed: a failed edit script
followed by chained commands advanced the run on the wrong plan version, and one review cycle was recorded that never
ran. Swamp's refusal to record a plan outside the planning stage was what stopped it.

The deterministic parts did their job. Schema validation rejected nothing silently, the cycle limits parked the run
for a human twice, the human gates were never satisfied by the agent, and every version of every artifact is queryable.
The factory worked. The slice and the loop around it were the problem.

## The first slice, half the size

Cut it at the callout and keep everything that proves tenancy.

- **In:** the identity-provider port with the OIDC adapter and the fake issuer; the callout binding a connection into
  a tenant account from the verified organisation claim against an explicit allow-list; a Cedar authorizer over a
  two-row catalogue; real NATS in an embedded server and in the session stack; tokens from the fake issuer at tier 0
  and tier 2; `make check` and `make verify` arriving with the slice; two decisions, tenancy and the identity port.
- **Out:** the CloudEvents envelope, the replay window, any request or reply, the inbox convention, the greeting
  probe, the `dv` binary. The client is a test, not a product.
- **The only tests that matter:** the isolation trio. Another tenant sees nothing. An organisation with no account is
  refused. A replayed connect is refused.

Slice two adds the envelope and one request. Slice three adds `dv`. Each slice then has one adversarial surface, and
a plan with one surface converges in two cycles, not six. The dependency budget also holds better: slice one needs
nats.go, jwt, nkeys, callout.go, go-oidc, and cedar-go, and the budget decision for a platform-bearing first slice
is made once, in one ADR, with a ceiling the check can measure.

Write the language page first, as was done, and let it name only what the slice builds. Words for things the slice
does not build are invitations to review them.

## What belongs in the skills

The reviewers rediscovered the same facts from source, cycle after cycle, and invented the same rules. Each of these
is one line in a skill, and each would have saved a cycle. They are recorded here as input to the next skill change,
which is a protected-path pull request of its own.

Into `adversary-security`:

- The client's NATS connect token is a JWT access token whose audience is the Sentral project id; the tenant is the
  resourceowner claim; the identity provider must issue JWT access tokens, not opaque ones.
- The JWKS cache is bounded in time, and a successful refetch replaces the whole cached set.
- Development tokens live one hour, and the identity provider is configured to at most one hour for Sentral's clients.
- Only the service role may subscribe to request and command subjects, so no principal can read another's token.
- Every connection's inbox is named from the verified token's id, never from anything the client presents.

Into `architecture`:

- A request's reply is typed as the past tense of the request verb, carries the request id as its subject and its own
  minted id, and is never published on a subject.
- A machine principal is a role on the grant, never a claim or anything inferred from the client.
- Token renewal is a new connection, because the inbox prefix is fixed per connection.

Into `dev-environment`:

- A fragment owns only its own keys and writes no product credential; product credentials are minted by the make
  targets on every run.
- The verify profile is torn down on exit, with its logs captured to an evidence file first.
- Per-case embedded servers render their own copy of the stack's config and override every port.

Into `delivery`:

- The ko base pin lives in the product directory and ko is run from there.
- Local daemon references are resolved to image IDs before they enter any rendered config; never tags.

Into `adversary-simplicity`:

- Budget ceilings are stated in the terms the check measures, with the counted paths named.

## Two changes to the machine

First, the review stage's dispatch and merge should be a swamp workflow, as swamp's own verification is: one
reviewer step per skill, an assertion on the output shape, a merge step that writes the findings artifact. Then every
review is a run with an id, a failed reviewer is a failed step, and the agent's part shrinks to running the workflow.

Second, the planning conventions should say what this page says about size: one adversarial surface per slice, the
language page names only what the slice builds, and a plan that touches more than one surface is split before it is
reviewed. The factory has a cycle limit for a reason. A slice that needs an override to converge was too big.
