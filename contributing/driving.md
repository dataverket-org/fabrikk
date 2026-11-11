# Drive a work item

How one work item goes through the factory. The `stagecraft` skill says how any work item is driven: read `status`,
dispatch the stage's work, record what it produced, advance, and stop for the person at a human gate. This page has
only what is particular to fabrikk. The person's part is the outcome, two approvals, the YubiKey and the merge. All
commands run from the main checkout, never from a work item's worktree.

## Start

The factory is `slice` and its tracker is `board`, stagecraft's built-in one. File a ticket with the outcome, claim
it, and run the `start` command that `claim` prints:

```sh
swamp workflow run @swamp/stagecraft/create --input tracker=board --input 'title=<title>' --input 'body=<the outcome>' --input type=feature
swamp workflow run @swamp/stagecraft/claim --input tracker=board --input issue=<ticket> --input factory=slice
swamp behavior run @swamp/stagecraft/work-item status <key>
```

The key is the ticket's id (`slice-12`). For a key that says what the work is, give the ticket that id when it is
filed: `swamp behavior run board create --input id=<key> --input 'title=<title>' --input 'body=<the outcome>' --input type=feature`.

## What each stage needs here

- **`plan`.** The outcome is the ticket's body. The plan follows `agent-constraints/planning-conventions.md`.
- **`plan-review`, `code-review`.** `dispatch` prints one reviewer's prompt. Send it, unchanged, to an agent that
  starts with no context, and record the file it writes. Record its usage from what the harness reports.
- **`implement`.** `agent-constraints/implementation-conventions.md`: one worktree and branch per work item, tier 0
  green, signed commits. Tell the person before each commit; it needs their touch.
- **`verify`.** Run the workflow the packet names, with the packet's inputs, and record its outcome with the real
  run id:

  ```sh
  swamp workflow run fabrikk-verify --input worktree=<worktree> --input headSha=<commit> --json
  swamp behavior run @swamp/stagecraft/work-item record_evidence <key> --input name=verify-run --input 'payload={"status":"succeeded","runId":"<run id>"}' <expect>
  ```

  Red: record `failed` and take `failed`. Read `swamp report get @swamp/workflow-summary --workflow fabrikk-verify --json`
  before changing anything.
- **`attest`.** `swamp workflow run fabrikk-attest` with the packet's inputs. The tag needs the person's touch.
  Record `attest-run` the same way. What it signed is the record `attestation` of the model `attest-<commit>`.
- **`pull-request`.** The stage's prompt spells it out: one push of branch and tag (a touch), the pull request
  through the `forgejo` model, then the person reviews and merges in Forgejo
  ([how, so the attested commit is the one that lands](forge.md#merge-a-work-items-pull-request)). The head that
  was merged is read back from the forge and recorded with the merge.

## Where the person decides

`plan-approval`, `merge-approval`, `abandon-confirmation`, and `unattested-merge`, which is asked only when the
head that was merged is not the attested commit. Show them the recorded product, read fresh, and every
way out with its cost, as the stagecraft skill says, and run `approve` or `decline` only on their word for that
decision, with `onBehalfOf` naming them. A manual way back (`revise` from plan review, `changes-requested` from the
pull request) is theirs too.

## Keep the ticket in step

`status` says when the ticket is behind. Publish the work item's journal to it:

```sh
swamp workflow run @swamp/stagecraft/publish --input tracker=board --input workItem=<key>
```

## Reading run data

```sh
# a product's payload, latest version
swamp data query 'modelName == "<key>" && name == "artifact-plan"' --select content --single --json

# the open findings of a review
swamp data query 'modelName == "<key>" && name == "artifact-code-review"' \
  --select 'attributes.findings.filter(f, !(has(f.resolved) && f.resolved)).map(f, {"id": f.id, "severity": f.severity, "what": f.description})' --json

# who approved what
swamp data query 'modelName == "<key>" && name == "run"' --select 'attributes.approvals' --json

# what a workflow left behind for a commit
swamp data query 'modelName == "dev-env-<commit>"' --select '{"target": attributes.target, "exit": attributes.exitCode}' --json
```

`swamp behavior run @swamp/stagecraft/work-item summary <key>` prints the whole story of a work item.

## Changing the factory

1. Edit `models/@swamp/stagecraft/factory/slice.yaml`, the one copy of the definition, and keep the diagram and the
   stage table in [design/factory.md](../design/factory.md) in step. Add or change a saved scenario for the path the
   change is about.
2. `swamp behavior run slice validate` must report the factory valid, with every scenario passing.
3. The file is a protected path: the change goes through a pull request and a human.

A work item already running keeps the copy of the definition it started with. The authoring rules are in the
stagecraft skill, `.agents/skills/stagecraft/references/authoring.md`.
