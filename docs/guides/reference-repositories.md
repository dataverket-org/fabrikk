---
title: "Use the reference repositories"
type: guide
project: fabrikk
audience: operator, agent
description: "Sync and read the reference clones under _reference/."
weight: 40
---

# Use the reference repositories

`_reference/<name>/` holds read-only clones of upstream code and documentation agents read: NATS ADRs, the
CloudEvents spec, Zitadel, and swamp itself. The list is `models/@dataverket/reference-repos/references.yaml`
(tracked, protected); the cache is ignored and rebuildable. Each clone has every branch and tag and is checked out
detached at the listed `ref`.

## Sync

```sh
swamp model method run references sync                                  # all
swamp model method run references sync --input 'names=["zitadel"]'      # one
swamp data query 'modelName == "references"' --select '{"name": attributes.name, "commit": attributes.commit}'
rm -rf _reference && swamp model method run references sync             # rebuild from nothing
```

Update with `sync`, not `git pull`: the checkout is detached, so pull refuses. A manual `git fetch` is harmless.

## Read

```sh
git -C _reference/zitadel show v4.10.0:go.mod                 # a file at another version, no checkout
git -C _reference/zitadel grep jwks v4.17.3                    # search another version
git -C _reference/zitadel log v4.0.0..v4.17.3 -- <path>        # what changed between versions
rg <pattern> _reference/zitadel                                # search the checkout explicitly
```

A search from the repository root skips ignored files, so name the directory. Work-item worktrees have no
`_reference/`; read it from the main checkout (`git worktree list`, first entry).

## Rules

- Cite what you relied on as `<name>@<commit>`; plans require it for every downstream port.
- Read, never copy. Reusing upstream code is a dependency with an ADR, or a reimplementation; copied code is judged
  like a dependency with that code's licence (source-standards skill).
- Go libraries come from the module cache at the version `go.mod` pins, not from here.
- Adding a repository changes what agents read: it goes through a pull request and a human.
