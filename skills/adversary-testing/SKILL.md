---
name: adversary-testing
description: Testing strategy and test-tier rules for Dataverket services. Use when planning what tests a change needs, writing tests, or reviewing whether tests are adequate — including any change to callout, accounts, subjects, downstream ports, or the dev environment. Also use to decide where a test runs (embedded server vs session stack vs artifact verification vs UAT).
---

# Adversary: testing

Fast, deterministic feedback is what makes the factory converge. Every rule here protects that.

## Tiers

| Tier | What runs | Dependencies | When |
|---|---|---|---|
| 0 — test loop | `go test ./...` | Session stack (compose default profile: nats, postgres); embedded NATS for server-configuring tests; fake JWKS | Every edit |
| 1 — run the slice | Services as plain processes via `make run`, seeded | Same session stack | Interactive checks |
| 2 — verify artifacts | Scratch images under the `verify` compose profile (adds Zitadel); black-box suite from outside | Real everything, containerized | Before the PR |
| UAT | Joined, signed release artifact on the UAT cluster; black-box suite | The real environment | After merge |

## The one isolation rule

**Tests that use the server share it; tests that configure the server embed it.**

- Domain, application, and flow tests use the session stack. Isolation is per test: clone a throwaway PostgreSQL database
  from the template; prefix subjects, streams, and consumers with `t.Name()`.
- Callout, account topology, subject permission, and isolation tests own their server: `nats-server` embedded
  in-process on a random port, JetStream in `t.TempDir()`, memory resolver. They never touch the shared stack.
- Zitadel is never in tier 0 or 1. Tokens come from an `httptest` JWKS issuer. Real Zitadel appears in tier 2 and UAT.

## What every change must ship

- Table-driven unit tests for every aggregate method and value-object constructor touched.
- For every downstream port touched: the contract suite still passes against the fake **and** the real fragment.
- For any change to callout, subject mapping, account topology, or the CloudEvents envelope: a black-box acceptance test,
  not only a unit test.
- Fault paths tested through the fake (`FailNext`, timeouts, partial failure). Happy-path-only is a finding.

## Contract suites

- One suite per port, parameterized over implementations. The fake must pass the identical suite as the real system.
- Fault injection lives in the fake; the contract suite asserts the *service's* behavior under those faults.
- A fake that passes a case the real implementation fails is a critical finding: the fake is lying.

## Black-box acceptance suite

- Separate module. Talks only to the public surface: a NATS client with tenant credentials, S3/API endpoints where relevant.
  Never imports service internals.
- The isolation trio must exist and pass for every release:
  1. Tenant A publishes; tenant B observes nothing.
  2. A token whose `tenant` claim does not match is refused at callout.
  3. A replayed message (same `id`) is rejected.
- Tests are selected by the promises the environment declares. Functional tests run everywhere; environmental tests
  (restart survival, persistence, backup) run only where the overlay declares them.

## Budgets and hygiene

- `go test ./...` on the default profile under 60 seconds. A plan that breaks this must say so and why.
- No `time.Sleep` for synchronization. Poll with a deadline (`require.Eventually`) or use channels.
- No test depends on another test's state or on run order. `t.Parallel()` wherever isolation allows.
- A test that flakes twice is quarantined the same day and produces a finding. Flakes are never retried into green.
- Coverage: domain packages high; adapters covered by contract suites and tier 2. No coverage theater — tests that assert
  nothing meaningful are removed in review.

## Reviewer checklist

- Does the plan name which tier each new behavior is verified in, and where the real downstream first appears?
- Do server-configuring tests embed, and shared-stack tests isolate by name?
- Is there a fault-path test for every external call?
- Did anything security-relevant change without a black-box test?
- Does any test need Zitadel, a cluster, or the network to pass tier 0?
