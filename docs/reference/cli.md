---
title: "Swamp CLI for fabrikk"
type: reference
project: fabrikk
audience: operator, agent
last-verified: 2026-09-17 @ 7b38cae
description: "The swamp commands the factory is driven with."
weight: 30
---

# Swamp CLI for fabrikk

The commands fabrikk is driven with. `swamp help <command...>` prints the exact schema of any command as JSON; use it
before guessing a flag. All commands run from the repository root (the main checkout, not a work-item worktree).

## Driving a run

```sh
swamp model method run fabrikk start   --input workItem=<ref>          # once per work item; fails if a run exists
swamp model method run fabrikk status  --input workItem=<ref>          # refresh status-<ref>; then query it
swamp model method run fabrikk status                                  # every run, for picking up parked ones
swamp model method run fabrikk record_dispatch --input workItem=<ref> --input mode=<interactive|dispatch|workflow>
swamp model method run fabrikk record_artifact --input workItem=<ref> --input name=<artifact> --input payload='<json>'
swamp model method run fabrikk record_evidence --input workItem=<ref> --input name=<evidence> --input payload='<json>'
swamp model method run fabrikk resolve_findings --input workItem=<ref> --input artifact=<findings> --input resolutions='<json>'
swamp model method run fabrikk approve --input workItem=<ref> --input gateId=<id> --input actor=<login>
swamp model method run fabrikk reject  --input workItem=<ref> --input gateId=<id> --input actor=<login> --input note='<reason>'
swamp model method run fabrikk advance --input workItem=<ref> --input transition=<name>
swamp model method run fabrikk summary --input workItem=<ref>          # the work item's history as a report
swamp model method run fabrikk reset   --input workItem=<ref> --input confirm=reset   # destroys progress
swamp model method run fabrikk validate                                # lint the definition
swamp model method run fabrikk describe                                # Mermaid graph and stage table
```

`record_dispatch` is mandatory before a stage's work runs; a stage cannot advance without it, and a third dispatch of
the same stage entry is rejected as a runaway loop.

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

# a field of a payload; findings of a review
swamp data query 'modelName == "fabrikk" && name == "artifact-<ref>-plan"' --select 'attributes.payload.outcome' --json
swamp data query 'modelName == "fabrikk" && name == "artifact-<ref>-code-review"' \
  --select 'attributes.payload.findings.filter(f, !(has(f.resolved) && f.resolved)).map(f, {"sev": f.severity, "file": f.file, "title": f.title})' --json

# what a workflow left behind for a commit
swamp data query 'modelName == "dev-env-<sha>"' --select '{"target": attributes.target, "exit": attributes.exitCode}' --json
swamp data query 'modelName == "attest-<sha>"' --select 'attributes.tag' --json
swamp data query 'modelName == "release-<sha>"' --select attributes --json
```

Predicates take catalog fields (`modelName`, `name`, `specName`, `version`, `isLatest`) and plain comparisons on
`attributes`; macros (`filter`, `map`, `exists`) work only in `--select`. Only the latest version has parsed
`attributes`.

## Workflows

```sh
swamp workflow validate fabrikk-verify
swamp workflow run fabrikk-verify  --input worktree=/abs/path --input headSha=<sha>
swamp workflow run fabrikk-attest  --input workItem=<ref> --input worktree=/abs/path --input branch=<b> --input headSha=<sha>
swamp workflow run fabrikk-release --input mergeSha=<sha> [--input product=sentral --input environment=uat]
swamp workflow history search --json
swamp report get @swamp/workflow-summary --workflow fabrikk-verify --json     # after a failure, before retrying
swamp report get @swamp/method-summary --model forgejo --json
```

The factory's `workflow` stages run these for you, with inputs bound from run data; run them by hand only to debug.

## The forge and the cluster

```sh
swamp model method run forgejo health
swamp model method run forgejo pr_list        --input owner=dataverket --input repo=fabrikk
swamp model method run forgejo pr_ensure      --input owner=dataverket --input name=fabrikk --input head=<branch> --input base=main --input title='<subject>' --input body='<text>'
swamp model method run forgejo pr_merge_state --input owner=dataverket --input name=fabrikk --input index=<n>
swamp model method run forgejo branch_protection_list --input owner=dataverket --input name=fabrikk
swamp model method run forgejo runner_list    --input owner=dataverket
swamp model method run forgejo actions_secret_put --input owner=dataverket --input repo=fabrikk --input name=<NAME> --input 'value=${{ vault.get(fabrikk, <key>) }}'
swamp model method run omni discover
swamp model method run runner-pods list
PATH=_bin:$PATH swamp model method run dataverket-prod-helm list
```

Vault expressions in `--input` are resolved at run time and never recorded.

## Vault and references

```sh
swamp vault get fabrikk --json                                   # vault config and recipients
swamp vault put fabrikk <key> <value>                             # needs the factory age key or a YubiKey with PIN
swamp model method run references sync                           # all reference repositories
swamp model method run references sync --input 'names=["zitadel"]'
swamp data query 'modelName == "references"' --select '{"name": attributes.name, "commit": attributes.commit}'
```

## Health

```sh
swamp run history --active     # what is running now
swamp run doctor               # stale or orphaned runs; --fix reaps them
swamp model search --json      # every model instance
swamp model type describe @swamp/software-factory --json | jq '.methods[].name'
```
