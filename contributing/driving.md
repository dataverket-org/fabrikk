# Drive a work item

How to take one work item through the factory, from the operator's side. The driving agent (any enrolled coding tool
with the `software-factory` skill, which says the same loop in the agent's terms) does most of this; the human's part
is the outcome, two approvals, the YubiKey, and the merge. `swamp help <command...>` prints the exact schema of any
command; use it before guessing a flag. All commands run from the main checkout, not a work-item worktree.

## The loop, every stage

```sh
swamp model method run fabrikk status --input workItem=<ref>
swamp data query 'modelName == "fabrikk" && name == "status-<ref>"' --select 'attributes.work' --json
swamp model method run fabrikk record_dispatch --input workItem=<ref> --input mode=<mode>
# ... do what the work spec says ...
swamp model method run fabrikk record_artifact --input workItem=<ref> --input name=<n> --input payload='<json>'
swamp model method run fabrikk status --input workItem=<ref>
swamp model method run fabrikk advance --input workItem=<ref> --input transition=<name>
```

If exactly one transition is satisfied and it has no human gate, advance. If a human gate is the only blocker, show
the human the recorded artifact (fetched with `swamp data query`, not from memory) and stop. A failing gate's
`reasons` say what is missing.

## 1. Start

The human names the factory and the work item. `<ref>` is any stable string: an issue id, a URL, a slug.

```sh
swamp model method run fabrikk start --input workItem=<ref>
```

Resume an existing run with `status`, never `start`; `reset` destroys progress and needs `confirm=reset`.

## 2. Plan (`planning`, interactive)

Load the skills the stage lists and `agent-constraints/planning-conventions.md`. Planning is a conversation with the
human until the plan is written; after that, changes come through findings. Record it:

```sh
swamp model method run fabrikk record_artifact --input workItem=<ref> --input name=plan --input payload="$(cat plan.json)"
```

The payload must match the `plan` schema in the definition; a rejected payload is stored as `validation-plan` with
the errors. Advance `submit`.

## 3. Plan review (`plan-review`, dispatch)

Spawn one reviewer subagent per listed skill, in parallel, each with the `systemPrompt` from the status record's
`work` field and no other context. Merge their findings into one `plan-review` artifact. Then:

- Critical or high findings open: advance `rework`, fold them into the plan, record the new plan, submit again. The
  stage's cycle limit parks it for the human.
- None open: present the plan payload to the human. They approve or reject:

```sh
swamp model method run fabrikk approve --input workItem=<ref> --input gateId=plan-approval --input actor=<login>
swamp model method run fabrikk reject  --input workItem=<ref> --input gateId=plan-approval --input actor=<login> --input note='<their words>'
```

Advance `approve`.

## 4. Implement (`implementing`, interactive)

Follow `agent-constraints/implementation-conventions.md`: one worktree and branch per work item, the plan's file list,
tests at the plan's tiers, tier 0 green, signed commits (the human touches per commit). Then record:

```sh
sha=$(git -C /abs/worktree rev-parse HEAD)
swamp model method run fabrikk record_artifact --input workItem=<ref> --input name=change-summary --input payload='{"summary":"...","files":[{"path":"...","loc":0}],"totalLoc":0}'
swamp model method run fabrikk record_evidence --input workItem=<ref> --input name=change --input payload="{\"worktree\":\"/abs/worktree\",\"branch\":\"<ref>\",\"headSha\":\"$sha\"}"
```

Advance `submit`.

## 5. Verify (`verifying`, workflow)

Record the dispatch with `mode=workflow`, then run what the work spec resolved to; the factory already bound the
inputs from `change` evidence:

```sh
swamp workflow run fabrikk-verify --input worktree=/abs/worktree --input headSha=$sha
swamp model method run fabrikk record_evidence --input workItem=<ref> --input name=verify-run --input payload='{"status":"succeeded","runId":"<run id>"}'
```

Green: advance `pass`. Red: record `status: failed`, advance `fail`, fix in the worktree, commit, record a new
`change` evidence, submit again. Read `swamp report get @swamp/workflow-summary --workflow fabrikk-verify --json`
before changing anything.

## 6. Code review (`code-review`, dispatch)

As plan review, against the diff at `headSha`. Reviewers fetch the plan, the plan-review findings, and the change
summary from run data. Critical or high open: `rework`. Clear: `accept`.

## 7. Attest (`attesting`, workflow)

```sh
swamp workflow run fabrikk-attest --input workItem=<ref> --input worktree=/abs/worktree --input branch=<ref> --input headSha=$sha
```

The human touches the key for the tag. Record `attest-run` and the `attestation` evidence from `attest-<sha>`:

```sh
swamp data query 'modelName == "attest-<sha>"' --select '{"headSha": attributes.attestation.headSha, "tag": attributes.tag, "sha256": attributes.attestation.protectedPaths.sha256, "changed": attributes.attestation.protectedPaths.changed}' --json
swamp model method run fabrikk record_evidence --input workItem=<ref> --input name=attestation --input payload='{"headSha":"...","tag":"attestation/...","protectedPathsSha256":"...","protectedPathsChanged":[]}'
```

Advance `attested`.

## 8. Pull request (`pull-request`, interactive)

The stage's prompt spells this out. In short:

```sh
git -C /abs/worktree push origin <ref> attestation/$sha                       # one push, one touch
swamp model method run forgejo pr_ensure --input owner=dataverket --input name=fabrikk --input head=<ref> --input base=main --input title='feat(...): ...' --input body='...'
swamp data query 'modelName == "forgejo" && name == "pull-dataverket-fabrikk-<n>"' --select '{"url": attributes.htmlUrl, "index": attributes.index, "prHeadSha": attributes.headSha}' --json
swamp model method run fabrikk record_evidence --input workItem=<ref> --input name=pull-request --input payload='{"url":"...","index":<n>,"prHeadSha":"..."}'
```

If `prHeadSha` is not the attested sha, advance `head-moved`. Otherwise stop: the human reviews in Forgejo (CI
`validate-attestation` must be green; a protected-path change needs their eyes regardless) and merges. Then:

```sh
swamp model method run forgejo pr_merge_state --input owner=dataverket --input name=fabrikk --input index=<n>
swamp data query 'modelName == "forgejo" && name == "pr-merge-state-dataverket-fabrikk-<n>"' --select '{"url": attributes.url, "mergeSha": attributes.mergeSha, "mergedAt": attributes.mergedAt, "mergedBy": attributes.mergedBy}' --json
swamp model method run fabrikk record_evidence --input workItem=<ref> --input name=merge --input payload='{...that record...}'
swamp model method run fabrikk approve --input workItem=<ref> --input gateId=merge-approval --input actor=<merger>   # on the human's say-so
```

Advance `merged`.

## 9. Release (`releasing`, workflow)

CI builds the candidate on merge. The workflow waits for it and verifies it:

```sh
swamp workflow run fabrikk-release --input mergeSha=<mergeSha>
swamp data query 'modelName == "release-<mergeSha>"' --select attributes --json
```

Record `release-run` and `release` evidence, advance `released`. The run now stops at `uat`, which is not built.

## When it parks

- **Cycle limit.** A stage entered too often blocks; the human can grant one more entry:
  `approve --input gateId=cycle-override:<stage>`, or take `abort`. A slice that needs an override was too big.
- **Runaway dispatch.** The same stage entry dispatched a third time is rejected. Something is not being recorded; look
  at `validations` and `unresolvedBindings` in the status record.
- **Report a run.** `swamp model method run fabrikk summary --input workItem=<ref>` renders the journal.

## Reading run data

```sh
# what exists for a work item
swamp data query 'modelName == "fabrikk" && name.startsWith("artifact-<ref>-")' --select name

# which transitions are open right now
swamp data query 'modelName == "fabrikk" && name == "status-<ref>"' \
  --select 'attributes.transitions.filter(t, t.satisfied).map(t, t.name)' --json

# why the others are blocked (the reasons are the instructions)
swamp data query 'modelName == "fabrikk" && name == "status-<ref>"' \
  --select 'attributes.transitions.filter(t, !t.satisfied).map(t, {"transition": t.name, "blockedBy": t.gates.filter(g, !g.pass).map(g, g.reasons)})' --json

# a field of a payload; the open findings of a review
swamp data query 'modelName == "fabrikk" && name == "artifact-<ref>-plan"' --select 'attributes.payload.outcome' --json
swamp data query 'modelName == "fabrikk" && name == "artifact-<ref>-code-review"' \
  --select 'attributes.payload.findings.filter(f, !(has(f.resolved) && f.resolved)).map(f, {"sev": f.severity, "file": f.file, "title": f.title})' --json

# what a workflow left behind for a commit
swamp data query 'modelName == "dev-env-<sha>"' --select '{"target": attributes.target, "exit": attributes.exitCode}' --json
```

Predicates take catalog fields (`modelName`, `name`, `specName`, `version`, `isLatest`) and plain comparisons on
`attributes`; macros (`filter`, `map`, `exists`) work only in `--select`. Only the latest version has parsed
`attributes`.

## Changing the factory

1. Edit `models/@swamp/software-factory/fabrikk.yaml`. Keep the stage table and the diagram in
   [design/factory.md](../design/factory.md) in step.
2. `swamp model method run fabrikk validate` must print `Definition is valid`.
3. `swamp model method run fabrikk describe` renders the Mermaid graph and the stage table; show it to a human.
4. The file is a protected path: the change goes through a pull request and a human.

Authoring rules (work modes, bindings, schemas, retry with feedback) are in the pulled skill,
`.agents/skills/software-factory/references/authoring.md`.
