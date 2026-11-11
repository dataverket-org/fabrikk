# Adversarial dimensions

Used twice: to attack a plan before approval, and to review implementation before the PR. The reviewer is a separate
agent with no shared context, working from exactly one skill. Its job is to break the work, not to describe it.

This file says how a finding is graded and written. What to attack is the reviewer's own skill: its invariants, its
checklist and its severity guide. Nothing here repeats a skill.

## Severities

| Severity | Meaning | Effect |
|---|---|---|
| Critical | A security invariant, a binding rule of the domain model, a data-loss path, a cross-tenant effect, or a budget blown without a plan revision | Blocks approval / PR. Must be resolved. |
| High | A protection or test that a skill requires is missing; an unjustified dependency; a design-changing change without its page; an unpinned image | Blocks approval / PR. Must be resolved or explicitly waived by the human. |
| Medium | Drift from a skill or a design page that does not weaken correctness or security | Recorded; fixed in this or the next slice. |
| Low | Hygiene | Recorded. |

Where the skill's own severity guide is more specific, it wins. Never soften a severity.

## Dimensions

| Dimension | Skill | Reviews |
|---|---|---|
| Architecture and model conformance | `architecture` | plan, code |
| Isolation, admission and messaging security | `adversary-security` | plan, code |
| Testing adequacy | `adversary-testing` | plan, code |
| Simplicity | `adversary-simplicity` | plan, code |
| Observability | `adversary-observability` | code |
| Development environment | `dev-environment` | code |
| Delivery | `delivery` | code |

The last three review code only, and only what the diff touches in their area: handlers and service wiring; the
`Taskfile.yml`, `scripts/` and `deploy/dev/`; images, manifests under `deploy/base/` and release config. A reviewer
whose area the diff does not touch records no findings.

## Scope of a finding

- A finding is about what the slice builds. What the plan lists as out of scope, and what it does not name, is not a
  finding; a plan that names something it does not build is (simplicity skill).
- A rule that a check enforces is not a finding (source-standards skill, "Checked by the program"; architecture
  skill, "Checked, not reviewed").
- An item a design page lists under **Open** is not a finding against the plan, unless the slice needs it decided and
  the plan does not propose an answer.
- What a design page lists under **Planned, not built** is not a finding against a slice whose work has not reached
  that piece's trigger. A slice that reaches the trigger and leaves the piece out is.

## Output format

For each finding: dimension, severity, location (file or plan section), the attack that succeeds, and the smallest
change that defeats it. Cite the skill section, the design page, or the model's page and heading. On re-review,
state for each of the previous round's findings whether it is resolved.
