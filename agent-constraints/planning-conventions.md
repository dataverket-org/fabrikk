# Planning conventions

A plan is the contract between the outcome a human asked for and the code the factory will write. It is reviewed
adversarially before a human approves it. Write it so the reviewers can attack it and the implementer can execute it
without asking questions. This file says what a plan contains; the skills and `design/` say what good looks like.

## Start from the outcome, in the model's words

The work item states an outcome, not an implementation. If it states an implementation, rewrite the outcome first and
confirm it in the plan's first section. The outcome is a rule, or a few, of the Dataverket domain model
(`design/products.md` says how to read it): the plan links each by the heading that holds it, and the story that
found it. The model is read and cited, never restated.

## One adversarial surface per slice

A slice carries one surface reviewers can attack: one aggregate's commands, one port, the wiring of one crossing. A
plan that touches two is split before it is reviewed. What the slice does not build it does not name: every word and
every section in the plan is one the slice makes true.

## Sections

The plan is the `plan` artifact; the names in brackets are its fields.

Always:

1. **Outcome** (`outcome`). One paragraph. What will be true for a user when this ships.
2. **Bounded context and model** (`boundedContext`). Which of the model's contexts; the aggregates, entities and
   invariants exactly as that context's design page names them, with the link; the pattern words from the
   architecture skill.
3. **File-level breakdown** (`fileBreakdown`, `totalEstimatedLoc`). Every file created or changed, with an estimated
   LOC. Total against the simplicity budget.
4. **Testing strategy** (`testingStrategy`). What is verified at tier 0, always. Tiers 1, 2 and UAT only where the
   slice has something to verify there. Which tests embed a server and which share the stack.
5. **Out of scope** (`outOfScope`). What this plan deliberately does not do, so the reviewer does not ask for it.

Only when the slice builds it. Leave the section out otherwise: a section that is present is a claim, and a reviewer
may attack it.

- **Events and commands** (`eventsAndCommands`). Every command, reply, query and integration event the slice sends or
  receives, named as the model's integration contract and the context's design list them, shaped per
  `design/messaging.md`.
- **Accounts and wiring** (`tenancyImpact`). Which accounts the slice runs in and pins; which crossings it relies on,
  each a rule of the model; what a message arriving elsewhere, or naming another tenant, does. What the isolation
  trio (testing skill) asserts for this slice.
- **Ports and downstreams** (`portsAndDownstreams`). For each external system: the port interface, the in-memory
  fake, the contract suite, the compose fragment and its profile, the tier at which the real system first appears,
  and the reference repos the fake's behavior was checked against, as `<name>@<commit>`.
- **Persistence** (`persistence`). Streams, subjects and consumers, and what the second copy receives, per
  `design/persistence.md`.
- **Delivery impact** (`deliveryImpact`). Changes to L1 manifests, new images, migration compatibility with the
  previous release.
- **Risks and rollback** (`risksAndRollback`). What could go wrong outside the dev loop, and how it is undone.
- **Design changes** (`designChanges`). Each page in `design/`, or skill, that this slice changes (source-standards
  skill, "A decision changes the page that states it"). A slice that needs an item a design page lists under
  **Open** proposes the answer here; approving the plan decides it, and the slice moves it into the page's body.
- **Model changes** (`modelChanges`). Each word, rule or boundary the slice needs that the model lacks or states
  differently: the page, the change, the reason. Approving the plan decides it, and the slice changes `domain/`
  in the same pull request (`design/products.md`).
- **Deviations** (`deviations`). Every design choice that is not the default in a skill or a design page, each
  justified in one sentence.

## Constraints

- Plans are short. If it exceeds two screens, the slice is too big; split the work item.
- Reference the skills, the design pages and the model by name and link rather than restating them. The reviewer
  checks conformance, not paraphrase.
- Planning is a conversation up to the point the plan is written; after that, iteration is through findings.
- A human approves the plan. The agent never approves its own plan. The definition holds the review loop, its gates
  and its limits.
