# How the domain owner wants to work

*Part of [the method](README.md).* For whoever continues the modelling with the domain owner. Everything in the model has been agreed with them, chapter by chapter and boundary by boundary; build on it, do not revisit it. Read [the method](README.md) and [the seam](seam.md), then the control plane, then [where it stands](../open.md). Stated explicitly, after an early attempt went into implementation too fast, and confirmed by what worked since.

- **You drive the process, start to finish.** The domain owner does not want to plan it.
- **The owner's additions beat the proposals.** In nearly every review item the owner's reply simplified the proposal. Leave room for it.
- **Facts and contracts in, mechanism out.** The stack still guides the shape, and where it does, say so, marked "the engineering view, admitted because it decides the shape". Everything else about mechanism goes to the **Open** list of the page it concerns in [fabrikk's design](../../design/README.md).
- **Ask one question at a time.** Discuss it until it feels settled, then move on. Never send a batch of questions.
- **Propose, then ask.** Offering a concrete draft for them to correct works far better than an open question. When they ask for options, give a table with three or four rows, for and against, then one recommended row with the reason; they decide every such question in one reply.
- **Show the board when it changes,** so they never have to hold the whole picture in their head. In practice: [the map](../control-plane/map/README.md) opens and closes every story, shown in the conversation as text with the story's path marked on it before the storming and with what moved after; and every reply during a story carries one line of position, which chapter of the board and which context the question lands in. Diffs and commit messages are not the board.
- **Mark your own suggestions as yours,** so they can be rejected freely.
- **Stay out of implementation** until the method reaches it. The engineering view is welcome when it decides something, such as KV mirrors making a projection free, and is otherwise kept out.
- **Reuse established industry terms** where they exist, such as *resource* for what a product delivers, or CADF's shape for an audit entry.
- **Give honest assessments when asked,** with the caveats. Check a technical brief's claims against its sources before taking them as proposals, and say which were checked and which only read.
- **Keep event names short:** a subject and a verb, past tense. Detail goes in a note under the event or in the glossary.
- **The domain's own rule settles naming.** The story describes the world, so the parties of the world act in it, never software. *Agent* is unusable, taken by language models.
- **A rule has one home.** Each rule is stated once, in the page that owns it: a word's meaning in its glossary entry, in one to three sentences; what a context does in that context's design; what crosses in the integration contract and the map's boundary pages; what a product must answer in the seam; why a rule is what it is, and what was rejected, in the story that found it. Every other page says it in a clause with a link to the home, to the rule's own heading where it has one, and a story's "what it added" is a list of links. When a story lands, the rule is written into its home and the clauses elsewhere are checked, never the rule copied; a reread that finds a rule in full in two places is a finding.
- **System words go in the glossary before a design page uses them.** Drifting into fabrikk's vocabulary muddles the work in words only; a reread of every sentence fixes it in one commit, and no restart is needed.
- **Read an outside proposal against the model item by item** before taking it as a plan, marking each item: no domain dependency, needs the language rewritten, or needs a decision not yet taken. Fabrikk's `design/` pages decide the stack and never the domain.
- **Record agreed changes as you go,** not at the end, so nothing lives only in the conversation. Apply an agreed change across the whole model at once, in the pages, as soon as it is agreed. When a rename or a rule changes, reread the whole model and fix every place by reading each sentence, not by search and replace.
- **A session is one branch and a pull request.** `domain/` is a protected path: commits are signed with the owner's key, each needs a touch, and a person merges. So a session ends in a few commits whose messages state the decisions they hold, never in dozens. Signing is never bypassed, and nothing carries AI attribution.
- **A wide table goes in a plain-text code block,** within 120 characters, with cells wrapped by hand. Their terminal breaks a markdown table's wrapped cells into rows.
- **A thin context may take two of Stack's steps in one question,** as commands and policies were for Tenancy.

The conversation is held in English. The domain owner is Norwegian.
