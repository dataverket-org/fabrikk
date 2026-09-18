---
title: "Operate the forge"
type: guide
project: fabrikk
audience: operator
description: "Forge tasks through the forgejo model: attesters and required checks; the rest lives in fabrikk-infra."
weight: 30
---

# Operate the forge

Forge tasks go through the `forgejo` model (`@thomas/forgejo` plus `extensions/models/forgejo_actions.ts`), never
through the web UI or `curl`, so that what was done is recorded. The token is `forgejo/api_token` in the vault.
Methods are find-or-create and report `created`, `updated`, or `unchanged`; nothing here deletes.

## See the state

```sh
swamp model method run forgejo health
swamp model method run forgejo repo_list --input owner=dataverket
swamp model method run forgejo branch_protection_list --input owner=dataverket --input name=fabrikk
swamp model method run forgejo pr_list --input owner=dataverket --input repo=fabrikk
```

## Allow a new attester

1. Add their SSH public key to `.forgejo/attesters` (`<email> namespaces="git" <type> <key> <comment>`), through a
   pull request; it is a protected path.
2. Allow them to push `attestation/*` tags:

```sh
swamp model method run forgejo tag_protection_ensure --input owner=dataverket --input name=fabrikk \
  --input 'namePattern=attestation/*' --input 'whitelistUsernames=["beddari","<login>"]'
```

Keep the two lists equal: CI verifies against the file, Forgejo enforces the push.

## Make `validate-attestation` a required check

After the workflow has reported once on a real pull request, read the context name Forgejo shows on the PR and:

```sh
swamp model method run forgejo branch_protection_ensure --input owner=dataverket --input name=fabrikk \
  --input rule=main --input enableStatusCheck=true --input 'statusCheckContexts=["<context as shown>"]'
```

Check the result with `branch_protection_list`. From then on a pull request without a valid attestation tag cannot
merge.

## What is not here

Actions secrets, runner registration and pruning, repository renames, and the release runner itself are forge
operations that reach beyond this repository. They live in fabrikk-infra's swamp with their own token and vault
(since 2026-09-18); this repository's token is scoped to `dataverket/fabrikk` and the factory holds nothing more
([how fabrikk works](../explanation/how-fabrikk-works.md#the-loop-boundary)).
