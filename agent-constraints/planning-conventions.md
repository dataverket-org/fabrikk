# Planning conventions

A plan is the contract between the outcome a person asked for and the change the factory makes. A reviewer tries to
refute it and a person approves it. The factory checks the plan's fields; this file says what fabrikk asks of what is
in them. The skills and `design/` say what good looks like.

- **Start from the outcome.** The work item states an outcome, not an implementation. `summary` says what will be
  true for a user when the slice ships. Where the outcome is a rule of the Dataverket domain model, it is said in the
  model's words, with the heading that holds it (`design/products.md` says how to read the model). The model is
  cited, never restated.
- **One slice, one surface.** One aggregate's commands, one port, or the wiring of one crossing. A plan that needs
  two is split. What the slice does not build, the plan does not name.
- **Steps name files.** Each step says what it does and which files it touches, tests included, in the order the
  work is done. A change to a page under `design/`, to `domain/` or to a skill is a step like any other: approving
  the plan decides it, and it lands in the same pull request as the code that needs it.
- **Testing strategy by tier.** What tier 0 shows, always. Tier 2 only where the slice has something to show from
  outside (dev-environment skill).
- **Say what is not the default.** A choice that departs from a skill or a design page is named in the step that
  makes it, with its reason in a sentence.
- **Short.** A plan longer than a screen is a slice that is too big.
