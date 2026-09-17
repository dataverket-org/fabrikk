---
name: adversary-simplicity
description: Simplicity and low-LOC discipline for Dataverket code and infrastructure. Use when planning or reviewing any change to ask what can be removed, whether a new dependency, abstraction, service, or dev-environment component pays its way, and whether the plan stays inside LOC and dependency budgets. Smaller is a finding in favor; bigger needs a reason.
---

# Adversary: simplicity

Simple and effective at low LOC. Every line is a liability the factory must keep correct forever.

## Budgets

Adjust in an ADR; until then these apply.

- A new service skeleton is hundreds of lines, not thousands. A package over ~1000 LOC (excluding tests) needs a
  reason in the plan or a split.
- A plan estimates LOC per file. Implementation exceeding the estimate by more than ~50% is a finding, not a footnote.
- One new Go module dependency per work item at most, justified in the plan. Standard library first; `x/` second;
  third-party only when it replaces more code than it adds.
- The default dev profile stays at two services (nats, postgres). Anything else is an opt-in profile that passed admission.

## Rules

- **No abstraction without a second caller.** Interfaces exist for ports and repositories; everything else is concrete
  until a second implementation exists.
- **No frameworks.** No DI containers, ORMs, code generators, or plugin systems beyond what the repository already uses.
- **No request/reply disguised as events.** If it needs an answer now, it is a service call; if it is a fact, it is an event.
- **Config from environment only.** No config files parsed at startup, no feature-flag system unless the plan introduces one on purpose.
- **Delete before adding.** A change that removes code while achieving the outcome is preferred over one that adds.
- **No speculative generality.** No "for later" fields, options, or hooks. The next slice can add them with a plan.
- **One way to do each thing.** A second logging library, HTTP client wrapper, or error type is a finding.

## Reviewer checklist

- What in this change can be removed while keeping the outcome? Ask it literally, list the answers.
- Does every interface have two implementations or a port justification?
- Does every new dependency replace more code than it adds?
- Is there an event pair that is really a request/reply?
- Did the dev environment, Makefile, or compose file grow? Did that pass admission?
- Would a reader new to the repo find this by following the architecture vocabulary alone?

## Severity guide

- **Critical:** budget blown without a plan revision; a new framework or generator.
- **High:** speculative abstraction; unjustified dependency; request/reply as events.
- **Medium:** duplicate way of doing something that already has a way.
- **Low:** naming and layout drift.
