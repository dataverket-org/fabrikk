# Planning conventions

A plan is the contract between the outcome a human asked for and the code the factory will write. It is reviewed
adversarially against the architecture skill and every adversary skill before a human approves it. Write it so the
reviewers can attack it and the implementer can execute it without asking questions.

## Start from the outcome

The work item states an outcome ("tenants can onboard and publish their first event, isolated from each other"), not an
implementation. If it states an implementation, rewrite the outcome first and confirm it in the plan's first section.

## Required sections

1. **Outcome.** One paragraph. What will be true for a user of the control plane when this ships.
2. **Bounded context and model.** Which context; aggregates touched or created; value objects and invariants, in the
   architecture skill's vocabulary.
3. **Events and commands.** Every CloudEvents `type` produced or consumed, with `source`/`subject` resource IDs and the
   extensions carried. Subjects per the subject-naming ADR. Mark anything that needs a new ADR.
4. **Tenancy impact.** How the change stays inside one account. What a wrong-tenant message does. What the black-box
   isolation tests will assert.
5. **Ports and downstreams.** For each external system: the port interface, the in-memory fake, the contract suite, the
   compose fragment and its profile, and **the tier at which the real system first appears**.
6. **Persistence.** Streams, consumers, tables, projections. What lives in JetStream and what in PostgreSQL, and why.
7. **File-level breakdown.** Every file created or changed, with an estimated LOC. Total against the simplicity budget.
8. **Testing strategy by tier.** What is verified at tier 0, 1, 2, and UAT. Which tests embed a server and which share
   the stack. New or changed black-box acceptance tests.
9. **Delivery impact.** Changes to L1 manifests, new L2 tunables (ADR), new images or dependencies (ADR), migration
   compatibility with the previous release.
10. **Risks and rollback.** What could go wrong in an environment that is not the dev loop, and how it is undone.
11. **Out of scope.** What this plan deliberately does not do, so the reviewer does not ask for it.

## Constraints

- Plans are short. If it exceeds two screens, the slice is too big; split the work item.
- Reference the skills by name rather than restating them. The reviewer checks conformance, not paraphrase.
- Every design choice that is not the default in a skill is called out and justified in one sentence.
- Planning is a conversation up to the point the plan is written; after that, iteration is through findings.

## Review loop

- The plan is reviewed against `adversarial-dimensions.md`. Only critical and high findings are surfaced.
- Findings are folded back and the plan reworked, at most five times. If it still has critical findings, the work item goes back to the human as a question, not as a plan.
- A human approves the plan. The agent never approves its own plan.
