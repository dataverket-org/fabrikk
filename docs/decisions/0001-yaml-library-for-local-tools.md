---
title: "A YAML library for the repository's local tools"
description: "tools/ may depend on gopkg.in/yaml.v3 to read human-managed YAML such as docs/schema.yaml."
type: adr
project: fabrikk
category: infrastructure
status: proposed
created: 2026-09-17
updated: 2026-09-17
author: Jan Ivar Beddari
tags: [tools, dependencies, yaml]
related: []
---

## Status

Proposed on 2026-09-17. The source-standards skill requires an ADR for every new Go module dependency; this is the
first Go code in the repository and its first dependency.

## Context

`docs/schema.yaml` is the human-managed schema and bounding rules for `docs/`, and `tools/cmd/docs-check` enforces
it at tier 0. The file is YAML because people read and edit it, and because the Dataverket docs site's validator
policy, which it is modelled on, is YAML. Go's standard library has no YAML parser. The alternatives were a JSON
schema file (loses comments and readability), a private YAML subset parsed by hand (the awk version this tool
replaces, which silently ignored misspelt keys), or a library.

## Decision

The `tools` module may depend on `gopkg.in/yaml.v3` (Apache-2.0 and MIT, compatible with AGPL-3.0). It is the
library the docs site's validator already uses, it is maintained, and its decoder can reject unknown fields, which is
the property the check needs most. The dependency is scoped to `tools/`; it says nothing about product code, where
every dependency still needs its own ADR.

## Consequences

- `tools/go.mod` pins the version; `tools/go.sum` is committed. Bundling or vendoring is not needed for a tool built
  and run on the workbench.
- Any future local tool that reads YAML uses the same library. A second YAML library is a simplicity finding.
- The docs site's validator and fabrikk's check share a config format, so one can grow into the other.

## Decision Outcome

Accepted when this ADR is merged; the status field is updated in the same pull request that accepts it.

## Audit

- 2026-09-17: written with the first version of `tools/cmd/docs-check`.
