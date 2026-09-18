---
title: "Factory definition"
type: reference
project: fabrikk
audience: contributor, agent
last-verified: 2026-09-17 @ 7b38cae
description: "Stages, artifacts, evidence, gates, and the run data they produce."
weight: 20
---

# Factory definition

The contract of `models/@swamp/software-factory/fabrikk.yaml`: what each stage takes, produces, and needs to leave.
The file itself is the source of truth; `swamp model method run fabrikk describe` renders it, and `validate` lints it.

## Stages

| Stage | Mode | Skills | Constraints | Max cycles |
|---|---|---|---|---|
| `planning` (initial) | interactive | architecture, all five adversaries, dev-environment, delivery | `planning-conventions.md` | 5 |
| `plan-review` | dispatch (one subagent per skill) | same eight | `adversarial-dimensions.md` | 5 |
| `implementing` | interactive | architecture, testing, simplicity, observability, source-standards, dev-environment | `implementation-conventions.md` | 10 |
| `verifying` | workflow `fabrikk-verify` | | | 5 |
| `code-review` | dispatch | same eight as plan-review | `adversarial-dimensions.md` | 5 |
| `attesting` | workflow `fabrikk-attest` | | | 5 |
| `pull-request` | interactive | source-standards | | 5 |
| `releasing` | workflow `fabrikk-release` | | | 5 |
| `uat` | workflow `fabrikk-uat` (not built) | | | 5 |
| `promoting` | workflow `fabrikk-promote` (not built) | | | 5 |
| `done`, `failed`, `aborted` | terminal | | | |

`implementing` has ten cycles because verify, code review, attestation, and the pull request all send work back to it;
each loop keeps its own bound of five. `abort` is a global transition to `aborted` behind a human approval
(`abort-confirmation`).

## Artifacts and evidence

Artifacts are what a stage produces; evidence is an external fact it records. Both are validated against the schema
in the definition on `record_artifact` / `record_evidence`, and a rejected payload is kept as `validation-<name>` with
its errors. The names are global to the machine; records are namespaced per work item.

| Name | Kind | Declared in | Required fields |
|---|---|---|---|
| `plan` | artifact | planning | `outcome`, `boundedContext{context,model}`, `eventsAndCommands[]`, `tenancyImpact`, `portsAndDownstreams[]`, `persistence`, `fileBreakdown[{path,change,estimatedLoc}]`, `totalEstimatedLoc`, `testingStrategy{tier0,tier1,tier2,uat}`, `deliveryImpact`, `adrs[]`, `risksAndRollback`, `outOfScope[]`, `deviations[{choice,justification}]` |
| `plan-review` | findings, reviews `plan` | plan-review | `findings[{severity, …, resolved?}]` (engine contract) |
| `change-summary` | artifact | implementing | `summary`, `files[{path,loc}]`, `totalLoc`, `adrs[]` |
| `change` | evidence | implementing | `worktree` (absolute), `branch`, `headSha` |
| `verify-run` | result evidence | verifying | `status` (succeeded or failed), `runId` |
| `code-review` | findings, reviews `change-summary` | code-review | as `plan-review` |
| `attest-run` | result evidence | attesting | `status`, `runId` |
| `attestation` | evidence | attesting | `headSha`, `tag`, `protectedPathsSha256`, `protectedPathsChanged[]` |
| `pull-request` | evidence | pull-request | `url`, `index`, `prHeadSha` |
| `merge` | evidence | pull-request | `url`, `mergeSha`; optional `mergedAt`, `mergedBy` |
| `release-run` | result evidence | releasing | `status`, `runId` |
| `release` | evidence | releasing | `artifact`, `digest`, `appCommit`, `envConfigVersion` |
| `uat-run`, `promote-run` | result evidence | uat, promoting | `status`, `runId` |

Event and command `type`s in a plan must start with `no.dataverket.`; reference citations must be `<name>@<40-hex>`.

## Transitions and gates

| From | Transition | To | Gates |
|---|---|---|---|
| planning | `submit` | plan-review | `plan` exists |
| plan-review | `approve` | implementing | `plan-review` recorded this cycle; no unresolved critical/high; human `plan-approval` |
| plan-review | `rework` | planning | recorded this cycle; unresolved critical/high **or** a rejection of `plan-approval` this cycle |
| implementing | `submit` | verifying | `change-summary` exists; `change` recorded |
| verifying | `pass` | code-review | workflow `fabrikk-verify` succeeded |
| verifying | `fail` | implementing | `verify-run.status == failed` |
| code-review | `accept` | attesting | recorded this cycle; no unresolved critical/high |
| code-review | `rework` | implementing | recorded this cycle; unresolved critical/high |
| attesting | `attested` | pull-request | workflow succeeded; `attestation` recorded |
| attesting | `fail` | implementing | `attest-run.status == failed` |
| pull-request | `merged` | releasing | `pull-request` recorded; `prHeadSha == attestation.headSha`; human `merge-approval`; `merge` recorded |
| pull-request | `head-moved` | implementing | `pull-request` recorded; `prHeadSha != attestation.headSha` |
| pull-request | `changes-requested` | implementing | a rejection of `merge-approval` this cycle |
| releasing | `released` | uat | workflow succeeded; `release` recorded |
| releasing, uat, promoting | `fail` | failed | the stage's result evidence has `status: failed` |
| uat | `pass` | promoting | workflow succeeded |
| promoting | `promoted` | done | workflow succeeded |

Gate types in use: `artifact-exists`, `artifact-fresh` (`recordedThisCycle`), `findings-clear` (`blocking: [critical,
high]`), `evidence-recorded` (optionally `requireField`), `workflow-succeeded`, `cel`, `human-approval`.

## Run data

Everything a run produces is swamp data under model `fabrikk`, named per work item. The envelope is the record's
`attributes`; the schema-validated payload is `attributes.payload`.

| Record | Holds |
|---|---|
| `status-<workItem>` | The self-describing status packet: stage, cycle, resolved `work` spec, every transition with its gate results and reasons, `pendingApprovals`, `dispatch` counters, `validations` |
| `status-_factory` | Overview of every run (`status` without a work item) |
| `state-<workItem>`, `journal-<workItem>` | Program counter and the audit trail (dispatches, records, advances) |
| `artifact-<workItem>-<name>` | Each artifact, versioned per record |
| `evidence-<workItem>-<name>` | Each evidence record |
| `approval-<workItem>-<gateId>` | Human decisions with actor, cycle, and note |
| `validation-<name>` | A rejected payload and its schema errors, until a clean record replaces it |

Records the workflows leave under other models, all keyed by commit: `git-<sha>` (`status`, `log`, `branch-list`,
`paths-digest`, `diff`), `dev-env-<sha>` (`up`, `check`, `verify`), `attest-<sha>` (`attestation`),
`release-<sha>` (`release`), `forgejo` (`dataverket:fabrikk#<n>`, `dataverket:fabrikk#<n>:merge`).

## Editing the definition

1. Edit the YAML. Keep the stage table in this page and the diagram in
   [explanation/how-fabrikk-works.md](../explanation/how-fabrikk-works.md) in step.
2. `swamp model method run fabrikk validate` must print `Definition is valid`.
3. `swamp model method run fabrikk describe` renders the Mermaid graph and the stage table; show it to a human.
4. The file is a protected path: the change goes through a pull request and a human.

Authoring rules (work modes, bindings, schemas, retry with feedback) are in the pulled skill,
`.agents/skills/software-factory/references/authoring.md`.
