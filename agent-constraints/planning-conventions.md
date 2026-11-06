# Planning conventions

A plan is the contract between the outcome a human asked for and the code the factory will write. It is reviewed
adversarially against the architecture skill and every adversary skill before a human approves it. Write it so the
reviewers can attack it and the implementer can execute it without asking questions.

## Start from the outcome, in the model's words

The work item states an outcome ("a visitor at the front desk creates an organisation and is answered with its id"),
not an implementation. If it states an implementation, rewrite the outcome first and confirm it in the plan's first
section. The outcome is a rule, or a few, of the Dataverket domain model (the `domain-model` reference repository,
dev-environment skill): the plan links each by the heading that holds it, and the story that found it. The model is
read and cited, never restated and never extended by a plan; where a slice needs a rule the model does not state, the
work item goes back to the domain owner as a question, and the model changes before the plan does.

## One adversarial surface per slice

A slice carries one surface eight reviewers can attack: the wiring of one agreement, one aggregate's commands, one
port. A plan that touches two is split before it is reviewed; the first slice's retrospective
(`docs/explanation/first-slice-retrospective.md`) is what two cost. What the slice does not build it does not name:
every word in the plan is one the slice makes true.

## Required sections

1. **Outcome.** One paragraph. What will be true for a user of the control plane when this ships.
2. **Bounded context and model.** Which of the model's contexts (Person, Organisation, Catalogue, Audit, Tenancy);
   the aggregates, entities and invariants exactly as that context's design page names them, with the link; the
   pattern words from the architecture skill. A new aggregate, entity or invariant is a model change, not a plan's.
3. **Events and commands.** Every command, reply and integration event the slice sends or receives, as the model's
   integration contract and the context's design list them, with `source`/`subject` resource IDs and the extensions
   carried. Subjects per the subject-naming ADR. Mark anything that needs a new ADR; the model's decisions a slice
   first depends on are imported as ADRs (section 9), not rewritten.
4. **Accounts and wiring** (the plan's `tenancyImpact`). Which accounts the slice runs in and pins; which exports and imports it relies on, each a
   row of Tenancy's boundary page; what a message arriving on another export, or naming another organisation, does.
   What the black-box isolation trio (testing skill) will assert for this slice.
5. **Ports and downstreams.** For each external system: the port interface, the in-memory fake, the contract suite, the
   compose fragment and its profile, **the tier at which the real system first appears**, and the reference repos the
   fake's behavior was checked against, as `<name>@<commit>` (dev-environment skill).
6. **Persistence.** Streams, consumers, tables, projections. What lives in JetStream and what in PostgreSQL, and why.
7. **File-level breakdown.** Every file created or changed, with an estimated LOC. Total against the simplicity budget.
8. **Testing strategy by tier.** What is verified at tier 0, 1, 2, and UAT. Which tests embed a server and which share
   the stack. New or changed black-box acceptance tests.
9. **Delivery impact and decisions.** Changes to L1 manifests, new L2 tunables (ADR), new images or dependencies
   (ADR), migration compatibility with the previous release. The decisions from the model's `control-plane/decisions/`
   this slice first rests on, each to be imported into `docs/decisions/` in its ADR form as part of the slice, with the
   model's commit it was taken from.
10. **Risks and rollback.** What could go wrong in an environment that is not the dev loop, and how it is undone.
11. **Out of scope.** What this plan deliberately does not do, so the reviewer does not ask for it.

## Constraints

- Plans are short. If it exceeds two screens, the slice is too big; split the work item.
- Reference the skills and the model by name and link rather than restating them. The reviewer checks conformance,
  not paraphrase.
- Every design choice that is not the default in a skill is called out and justified in one sentence.
- Planning is a conversation up to the point the plan is written; after that, iteration is through findings.

## Review loop

- The plan is reviewed against `adversarial-dimensions.md`. Only critical and high findings are surfaced.
- Findings are folded back and the plan reworked, at most five times. If it still has critical findings, the work item goes back to the human as a question, not as a plan.
- A human approves the plan. The agent never approves its own plan.
