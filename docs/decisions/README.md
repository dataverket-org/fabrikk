---
title: "Decisions"
type: index
project: fabrikk
weight: 50
---

# Architecture decision records

ADRs for fabrikk and the products it builds. The source-standards skill (`skills/adversary-source-standards/SKILL.md`)
says when one is required: a new subject namespace, a new CloudEvents type family, a new Go module dependency, a new
downstream port or compose fragment, a new tunable field in an environment overlay, or a change to a budget in an
adversary skill. No ADR, no approval. This folder is a protected path.

## Format

Structured MADR, the format the Dataverket docs site validates (`builder-hugo`, `smadr-validator`): YAML frontmatter
and the sections **Status**, **Context**, **Decision**, **Consequences**, **Decision Outcome**, **Audit**. Files are
`NNNN-short-title.md`, numbered in order, and the basename must be unique across every Dataverket repository because
the site's ADR references are filename-based. Keep them short: what was decided, why, and what it costs.

```markdown
---
title: "Subject naming for Sentral events"
description: "One sentence."
type: adr
project: sentral          # fabrikk | dataverket | a product name
category: architecture    # api | architecture | data | infrastructure | integration | migration | security | testing
status: accepted          # proposed | accepted | rejected
created: 2026-10-01
updated: 2026-10-01
author: Jan Ivar Beddari
tags: []
related: []
---

## Status
## Context
## Decision
## Consequences
## Decision Outcome
## Audit
```

The frontmatter is the docs site's ADR schema; `project` is the field the merged site groups on, and `fabrikk` must be
added to its allowlist (`builder-hugo`, `config/smadr-validator.yaml`).

## Index

None yet.
