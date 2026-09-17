# Adversarial dimensions

Used twice: to attack a plan before approval, and to review implementation before the PR. The reviewer is a separate
agent with no shared context. Its job is to break the work, not to describe it. Surface only critical and high findings;
record medium and low without blocking.

## Severities

| Severity | Meaning | Effect |
|---|---|---|
| Critical | A security invariant, data-loss path, cross-tenant effect, or budget blown without a plan revision | Blocks approval / PR. Must be resolved. |
| High | Missing protection or test that a skill requires; unjustified dependency; missing ADR; unpinned image | Blocks approval / PR. Must be resolved or explicitly waived by the human. |
| Medium | Drift from a skill that does not weaken correctness or security | Recorded; fixed in this or the next slice. |
| Low | Hygiene | Recorded. |

## Dimensions

Each dimension names the skill that defines it and what to attack. Findings cite the skill section.

### 1. Architecture conformance — `architecture`
Attack: aggregates bypassed (writes outside methods); business rules in application services or adapters; adapters
imported by domain; interfaces without consumers; technology names above `adapters`; vocabulary drift; request/reply
disguised as an event pair; a command whose token travels in `data`.

### 2. Tenant isolation and authentication — `adversary-security`
Attack: any path from tenant A's account to an effect in tenant B; callout fallbacks or bypasses; handlers acting before
verification; missing `jti`/time-window checks; `tenant` claim not compared to the pinned tenant; behavior when callout,
JWKS, or clocks fail; undeclared standing credentials; secrets in logs, subjects, artifacts, or plans.

### 3. Messaging correctness — `architecture`, `adversary-security`
Attack: non-CloudEvents payloads; wrong `type` grammar or tense; missing `tenant`/`traceparent`; subjects not per the ADR;
consumers without idempotency; events that are not facts; at-least-once delivery assumed to be exactly-once.

### 4. Testing adequacy — `adversary-testing`
Attack: security-relevant change without a black-box test; server-configuring tests on the shared stack; shared-stack
tests without name-scoped isolation; fakes not run through the contract suite; happy-path-only; sleeps; tier-0 tests
needing Zitadel, a cluster, or the network; a plan that does not say where the real downstream first appears.

### 5. Simplicity — `adversary-simplicity`
Attack: LOC over estimate or budget; abstractions with one implementation; new dependency or framework; speculative
fields and options; a second way of doing an existing thing; dev-environment growth that did not pass admission.
Always ask and answer: what can be removed?

### 6. Observability — `adversary-observability`
Attack: untraceable path; error logged at several layers; readiness not covering a real dependency; token or payload in
a log or span; missing graceful shutdown.

### 7. Source standards — `adversary-source-standards`
Attack: missing SPDX header; ADR-required change without an ADR; mutable tags; upstream image references; protected path
changed without a human; no signed `attestation/<commit>` tag for the PR head.

### 8. Development environment — `dev-environment`
Attack: a dependency added to the default profile; fragment without healthcheck, seed, or reset; unpinned fragment image;
a loop that reaches over the network; tests that depend on the long-lived dev Zitadel.

### 9. Delivery — `delivery`
Attack: join performed in the cluster; images or config by tag; L2 touching non-tunable fields; rendered output not
verified for every environment; secrets in an artifact; UAT taking input other than the release artifact; promotion
without a passing UAT.

## Output format

For each finding: dimension, severity, location (file or plan section), the attack that succeeds, and the smallest
change that defeats it. On code review, include the previous round's findings and state which are resolved.

## Rework

Findings are folded back and the work reworked, at most five rounds per stage. A stage that still has critical findings
after five rounds returns to the human with the open findings — never with a softened severity.
