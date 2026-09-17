---
title: "Operate the forge"
type: guide
project: fabrikk
audience: operator
description: "Forge tasks through the forgejo model: attesters, required checks, secrets, runners."
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
swamp model method run forgejo runner_list --input owner=dataverket
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

## Put an Actions secret

Values come from the vault and are never recorded:

```sh
swamp model method run forgejo actions_secret_put --input owner=dataverket --input repo=fabrikk \
  --input name=REGISTRY_PASSWORD --input 'value=${{ vault.get(fabrikk, registry/ci_password) }}'
```

## Register a runner

```sh
swamp model method run forgejo runner_registration_token --input owner=dataverket
swamp vault get fabrikk --json      # the token was stored in the vault; read it from there on the runner host
```

The org runner `dataverket-runner` (labels `ubuntu-latest`, `kata`) is a Kata VM pod in `dataverket-prod`, deployed
from `fabrikk-infra` (`apps/forgejo-runners`). The release runner (`fabrikk-release`) does not exist yet.

## Rename a repository

```sh
swamp model method run forgejo repo_rename --input owner=dataverket --input name=<old> --input newName=<new>
```

Verify-first: refuses a missing source or an occupied target. Forgejo redirects the old name until it is reused;
fixed remotes such as push mirrors are not updated.
