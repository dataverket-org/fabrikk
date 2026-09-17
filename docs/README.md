---
title: "fabrikk"
type: index
project: fabrikk
weight: 10
---

# fabrikk documentation

The manual for fabrikk, Dataverket's software factory. It is written for an infrastructure engineer who has to run it,
change it, or find out where a part lives. The repository `README.md` is the front door: what fabrikk is, its products,
and the current state of the build-out. Everything that explains, instructs, or lists lives here.

## Layout

The folders follow [Diátaxis](https://diataxis.fr/), the same categories the Dataverket docs site
(`builder-hugo`) aggregates from every repository's `docs/`:

| Folder | Question it answers | Reader's mode |
|---|---|---|
| [`explanation/`](explanation/) | How does fabrikk work, and why is it shaped this way? | Understanding |
| [`guides/`](guides/) | How do I do X? Numbered steps, commands, expected results. | Working |
| [`reference/`](reference/) | What is where? What does this stage, model, or command take and produce? | Looking up |
| [`tutorials/`](tutorials/) | Take me through a whole run once, by the hand. | Learning |
| [`decisions/`](decisions/) | Architecture decision records: what was decided, when, and why. | Accounting |

Start with [explanation/how-fabrikk-works.md](explanation/how-fabrikk-works.md), then
[reference/code-map.md](reference/code-map.md) to find the code, then the guide for the task at hand.

## Index

### Explanation

- [How fabrikk works](explanation/how-fabrikk-works.md): the actors, the loop, what each stage does, and where its code is.
- [Attestation and trust](explanation/attestation-and-trust.md): what the signed tag proves, what CI checks, what it cannot.
- [Release model](explanation/release-model.md): build once after merge, the config join, gitless promotion, the signing key.

### Guides

- [Set up a workstation](guides/set-up-a-workstation.md)
- [Drive a work item](guides/drive-a-work-item.md)
- [Operate the forge](guides/operate-the-forge.md)
- [Use the reference repositories](guides/reference-repositories.md)

### Reference

- [Code map](reference/code-map.md): every path in the repository and its role, including model instances and vault keys.
- [Factory definition](reference/factory-definition.md): stages, artifacts, evidence, gates, and the run data they produce.
- [Swamp CLI for fabrikk](reference/cli.md): the commands the factory is driven with.

### Tutorials

None yet. Sentral's first work item produces the first one: [tutorials/](tutorials/README.md).

### Decisions

[decisions/](decisions/README.md) holds the ADRs. None yet; the source-standards skill says when one is required.

## Program, skills, docs

fabrikk follows the model in Adam Jacob's talk *How to build a software factory* (swamp-club.com/campaign/software-
factory-2026): "the factory needs to be a program, not just a bag of skills", "skills are context, skills don't build
trust", and "build software; skills explain how; call into intelligence". Everything in this repository is one of
three things, and the difference is what it is for, not what it is about:

| | Program | Skills and constraints | Docs |
|---|---|---|---|
| Is | `fabrikk.yaml`, `workflows/`, `extensions/`, `.forgejo/`, `Makefile` | `skills/*`, `agent-constraints/*`, the review prompts in the definition | `docs/`, the README |
| Job | makes things happen and proves they happened: gates, cycle limits, workflows, checks, signatures | shapes what the agent writes and reviews, and explains how to use the factory's software | lets a person, or an agent on demand, understand and operate the machine |
| Read by | swamp, CI | the agent, automatically, while doing a stage's work | whoever opens it; CLAUDE.md points agents here |
| Put it here when | it must always happen and we must know it did: "did you run the tests" is never a skill | it changes what a good plan, good code, or a good review looks like: vocabulary, budgets, severities, simple examples in Go from an unrelated domain | someone would open it to find where a part is, how it works, why, or how to do a task |
| Trust comes from | here, and only here | never | never |

Two rules follow. A process written into a skill ("then rework up to five times") is the anti-pattern the talk names;
the program enforces it, so a skill or constraint may only refer to it. And a doc never steers the work product: guides here tell a person how to operate the machine, and the agent's own
how-to is the pulled `software-factory` skill; if a page in `docs/` starts saying what good code or a good plan looks
like, it is a rule (move it to a skill or constraint), and if it says something must always happen, it is a check
(build it into the program).

## One tree, merged by metadata

fabrikk is a monorepo, so there is one `docs/` tree, Diátaxis first. What a page is *about* (the factory, or one
product, or one bounded context inside a product) is metadata, not a folder. This is how the Dataverket docs site
already treats ADRs: every repository keeps `docs/decisions/`, and the site groups them by the `category` in their
frontmatter with a generated index per group. The same mechanism, keyed on `project`, gives each product its own
view of explanation, reference, and guides without a second docs root. The folder structure stays true; the product
dimension is a field.

Swamp's `design/` folder, then, has its equivalent here as **explanation pages with a `context` field**: one page per
bounded context, in the architecture skill's vocabulary, each saying which product and context it serves and when a
person last checked it against the code. That is swamp's admission rule ("a doc names the primitive it enables") as
a schema requirement instead of a folder rule. A subfolder per product under a category (`explanation/sentral/`) is
allowed for tidiness and changes nothing: the metadata is what the site and the agent read.

## Page schema

Every Markdown page under `docs/` starts with YAML frontmatter. Required fields depend on the page type.

| Field | Values | Required on | Meaning |
|---|---|---|---|
| `title` | text | all | Page name; the site's menu entry |
| `type` | `explanation`, `guide`, `reference`, `tutorial`, `adr`, `index` | all | What kind of page; must match the folder it is in |
| `project` | `fabrikk`, `dataverket`, `sentral`, `maskin`, `plattform`, `identitet`, `tjeneste`, `objekt`, `nett` | all | What the page is about. `fabrikk` is the machine; `dataverket` is cross-product; a product name is that product. The site groups by it. |
| `audience` | `operator`, `contributor`, `agent`, `everyone` (comma list allowed) | explanation, guide, reference | Who the page is for, swamp's convention. `agent` marks pages CLAUDE.md or a skill points an agent at. |
| `last-verified` | `YYYY-MM-DD @ <short sha>` | explanation, reference | A person checked the claims against the code at that commit. A PR that changes what the page describes bumps it. |
| `context` | bounded-context id, e.g. `onboarding` | explanation pages that are a product's design | The context the page documents. An explanation page with a product `project` and no `context` is an overview, and there is at most one per product. |
| `weight` | integer | any | Menu order within the folder |
| `description` | one sentence | any | Shown in listings |
| `tags` | list | any | Free labels |
| `related` | list of relative paths | any | Pages this one depends on or supersedes |

ADRs (`type: adr`) use the Structured MADR frontmatter the Dataverket validator enforces, with `category`
(`api`, `architecture`, `data`, `infrastructure`, `integration`, `migration`, `security`, `testing`), `status`
(`proposed`, `accepted`, `rejected`), `created`, `updated`, `author`, and the same `project` values; see
[decisions/README.md](decisions/README.md). `fabrikk` is not yet in the validator's `project` allowlist in
`builder-hugo`; adding it is a one-line change there.

Rules the schema encodes:

- `type` and folder agree, so a page cannot pretend to be reference while giving instructions.
- Every page names a `project`, so a merged site can always say what a page belongs to.
- A product's design is findable by query, not by folder: `grep -l 'context:' docs/explanation/` lists every bounded
  context that has a page, and a context without one is a finding for the code reviewer.
- `last-verified` is required exactly where claims about code live (explanation, reference), and nowhere else.

## Bounding

Swamp keeps its design docs from sprawling with four habits: a doc exists only if it names the primitive it serves,
everything else gets one line in `operations.md`; there are no `archive/`, `proposals/`, or `decisions/` folders
because git history holds those and rationale stays as a short *Why* inside the doc it explains; every doc carries
`last-verified` and the PR that changes a subsystem bumps it; and the index carries the consolidation plan in the
open ("to be split", "to fold into"). Its skills are bounded by machinery: a scored content review and trigger evals
run whenever a skill changes, and their scripts are hashed into the attestation.

fabrikk takes the habits as rules and, where "must always happen" applies, as checks:

| Rule | fabrikk form | Enforced by |
|---|---|---|
| A page earns its place | Every page names `type` and `project`; a product design page names its `context`; a product has at most one overview page. What does not earn a page gets one line in the [code map](reference/code-map.md), fabrikk's `operations.md`. | `docs-check` (proposed, below); the source-standards reviewer |
| No archive, no proposals, no research | Nothing under `docs/` is kept because it once mattered, and nothing is parked there while it is being thought about: git history holds the first, a conversation or a plan artifact holds the second. The five folders above are the closed list. ADRs are the one exception and have their own status. | `docs-check`: folder list is closed |
| Rationale lives in the page | A short *Why* section inside the explanation page, never a separate document. | reviewer |
| Claims are dated | `last-verified` on explanation and reference; a PR that changes a path a page describes bumps it, and the code-review stage treats a stale page as a source-standards finding. | `docs-check` (field present); code review (bumped) |
| Nothing is orphaned | Every page is linked from this index, and every tracked path under `models/`, `workflows/`, `extensions/`, `skills/`, `agent-constraints/`, `.forgejo/` appears in the code map. | `docs-check` |
| The plan for the docs is visible | Consolidation notes ("fold into", "split") live in the Index above, not in issues. | this file |

`docs-check` is a proposed `make` target: a small script that reads every page's frontmatter and fails on a missing or
unknown field, a `type` that does not match its folder, a `project` outside the allowlist, a second overview for one
product, an explanation or reference page without `last-verified`, a page not linked from this index, or a steering
path missing from the code map. It belongs in `make check` (tier 0), so `fabrikk-verify` runs it on every work item
and the attestation covers it; CI need not repeat it. The `Makefile` is a protected path, so it arrives by pull request.

Skills are bounded differently from swamp's, because fabrikk's program names which skills a stage loads: there is no
trigger routing to eval. What sprawl looks like here is context cost. Each review stage loads up to eight skills and a
constraints file into every reviewer, so the bound to hold is size: a skill states rules, budgets, vocabulary, and
small examples, never mechanism or process, and a stage's total loaded context is a number the simplicity adversary
can be asked to keep. That budget is not set yet; it is the skills' equivalent of `docs-check`.

## Conventions

- **Plain English, short sentences.** Say what happens and where. Name a file when the reader has to open it.
- **Frontmatter** follows the page schema above; Hugo mounts the folder as is and the site groups by `project`.
- **Diagrams** are Mermaid in fenced code blocks. Forgejo renders them in the browser and the docs site renders them
  through Kroki. A diagram shows a mechanism: which actor does what, in which order, and where the boundary is. If a
  table says it better, use the table.
- **Commands** are real and copy-pasteable, and say what they print when they work.
- **ADRs** follow Structured MADR, as the Dataverket ADR validator expects: see [decisions/README.md](decisions/README.md).

## What stays in the README

The README is orientation and status, not documentation. It keeps: what fabrikk is and builds, the repository
model (monorepo plus `miljo`), the factory shape in one picture, how to get going in three commands, and the
"Follow-up work" list, which is project state and changes every week. It links here for everything else. When a
README paragraph starts explaining how something works, it moves to `explanation/`; when it lists paths or fields,
to `reference/`; when it gives steps, to `guides/`.
