# The method

How a subdomain is discovered here, and how its pages are written. The control plane was discovered this way and is being re-stormed the same way from new stories of its own; a product follows the same steps, starting from the seam.

## At a glance

- **Big-picture EventStorming first, then DDD, then Stack's order inside each context.** One concrete story, end to end; events as facts in the past tense; hotspots; people; pivotal events; the language; the boundaries; then commands, policies, read models, aggregates and events, one context at a time.
- **One domain, Dataverket, with subdomains.** The control plane is the subdomain every product depends on; each product is a subdomain of its own, with its bounded contexts. Evans's and Vernon's words: the whole business is the domain, these are its subdomains.
- **A product meets the control plane at the seam,** and nowhere else. [The seam](seam.md) is the list of what a product must answer; the control plane knows a product only by those answers. The control plane is itself the installation's product, held by every organisation, and answers the seam trivially.
- **The pages hold facts and contracts, never mechanism.** Who publishes what, what a reader keeps, what a message carries. The stack guides the shape, and where it does, the page says so, marked "the engineering view, admitted because it decides the shape"; the rest goes to [fabrikk's design pages](../../design/README.md).

## The phases

| Phase | Focus | For the control plane |
|---|---|---|
| 1 | Scope: one concrete story, end to end | Re-stormed one story at a time from a person's side; [the front desk](../control-plane/story/stories/front-desk.md), [the same human again](../control-plane/story/stories/same-human-again.md), [a colleague joins and leaves](../control-plane/story/stories/colleague.md), [an organisation that took nothing closes](../control-plane/story/stories/closing.md), [taking the example product](../control-plane/story/stories/taking.md) and [giving the example product back](../control-plane/story/stories/giving-back.md) told, the next in [status](../open.md) |
| 2 | Chaotic exploration: dump events | Per story |
| 3 | Timeline: order events in chapters | Per story, into the standing chapters |
| 4 | Hotspots: resolve, defer or acknowledge | Two open, in [status](../open.md) |
| 5 | People and outside parties | Per story, into the standing page |
| 6 | Pivotal events | Three standing; per story |
| 7 | Language: settle the glossary | Standing, to be reread against the new stories |
| 8 | Boundaries: candidate bounded contexts | Five contexts standing |
| 9 | Review against Stack, and the decisions every context depends on | Standing |
| 10 | Design, one context at a time | Organisation, Tenancy and Catalogue standing |

Design-level work is guided by Michael Stack's *Event-Driven Architecture in Golang*: commands, policies, read models and aggregates per context, then domain versus integration events, then, in fabrikk's `design/`, a CloudEvents profile, a subject taxonomy and where state lives. One context at a time, and the domain owner chooses which first.

## Discovering a product

Products come after the control plane's new stories, starting from the example product, which stands in the story for what the control plane can see of any product. A product is stormed as a story of its own, with the control plane's facts as its left edge: the organisation exists, its agreement is active and it has accepted the product's terms, its roles and organisation policy hold, and every command and integration event is audited. The storming then follows the phases above for the product's own events. It ends when every row of [the seam](seam.md) has an answer, the product's rows are added to [the integration contract](../control-plane/decisions/integration-contract.md) and no control-plane row has changed, its quota counts and command classes are named for its announcement, and its pages stand in a directory of its own in the same shape as the control plane's: story, language, map, decisions, design.

Four conditions keep the split orthodox, and a product's discovery checks itself against them:

1. **The split groups existing map relationships and draws none.** The context map is one picture, with a line around the control plane and one around each product.
2. **Each subdomain has its own language.** What crosses is a published language, listed at the seam. A single glossary across subdomains would be a shared kernel, which couples what should not be.
3. **The control plane never models what a product delivers.** It knows the facts at the agreement's edge, the terms accepted for the product, its quota and *Organisation cleared*, and what the product reports to Catalogue and Audit, in their words. It refers to a resource, and to a reservation, only by the product and the product's own id, and models neither; no product gains a box in the control plane.
4. **The seam is a hypothesis until a real product confirms it.** Evans warns against a pluggable framework before several products exist. Every row is written in the control plane's language, so the test for a real product is sharp: it must answer every row and change no control-plane row, see [the seam decision](../control-plane/decisions/seam-languages.md).

## How the pages are written

- **One directory per subdomain,** with story, language, map, decisions and design beneath it; one page per glossary section, per boundary, per decision, per Stack step. A `README.md` opens each directory with an "at a glance" list and a contents list.
- **Dense and plain.** An opening paragraph, an at-a-glance list, tables for terms, crossings, commands and aggregates. Events are a subject and a verb in the past tense; detail goes in a note under the event or in the glossary.
- **Three levels of heading.** The page's title, its sections, and beneath a section one heading per rule, hotspot, state machine or ADR part that runs to a paragraph, so a link can reach the rule itself by its anchor. A one-sentence item and an at-a-glance list stay bullets.
- **Present tense, no history.** A page says what is decided, not when or what it replaced; git holds the history. Rationale stays: rejected shapes, the grain not chosen, the reason a term was avoided.
- **A word used in a design page is in a glossary.** A system word not in [the words beneath the story](../control-plane/language/system-words.md) is a finding.
- **Industry terms are reused** wherever one fits, such as *resource* for what a product delivers.
- **A statement the domain owner made about implementation is recorded as a statement,** not as a decision.
- **Links, not numbers.** A page refers to another by name and link.
