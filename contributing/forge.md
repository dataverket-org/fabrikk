# Operate the forge

Forge tasks go through the `forgejo` model (`@dataverket/forgejo` plus `extensions/models/forgejo_actions.ts`), never
through the web UI or `curl`, so that what was done is recorded. The token is `forgejo/api_token` in the vault.
Methods are find-or-create and report `created`, `updated`, or `unchanged`; nothing here deletes.

## See the state

```sh
swamp model method run forgejo health
swamp model method run forgejo repo_list                 # no owner: the token has neither read:organization nor read:user
swamp model method run forgejo branch_protection_list --input owner=dataverket --input name=fabrikk
swamp model method run forgejo pr_list --input owner=dataverket --input name=fabrikk
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

## Merge a work item's pull request

The attestation is a signed tag on one commit, so that commit is the one that has to land on `main`.

- Merge with a **merge commit**. It leaves the branch's commits as they are. Rebasing or squashing at merge makes
  new commits: the attested one is then not on `main`, and what is there carries neither its signature nor its tag.
- Never use **Update branch**, by rebase or by merge. Either moves the pull request's head off the attested commit.
  A branch that is behind `main` merges as it is; one that conflicts goes back through the factory, which takes
  `head-moved` to `implement` and attests the new commit.
- A work item's branch starts from `main`. A branch stacked on another unmerged branch is behind `main` the moment
  that one merges, which is how the first slice's commit came to be rewritten.

The repository's settings can enforce the first two. In Forgejo they are under the repository's pull request
settings, and by the API's names: `allow_merge_commits` on, `default_merge_style` `merge`, and `allow_rebase`,
`allow_rebase_explicit`, `allow_squash_merge` and `allow_rebase_update` off. They are set from fabrikk-infra,
whose token reaches a repository's settings; this repository's does not, and is not meant to
([the loop boundary](../design/factory.md#the-loop-boundary)). Until the forge model there has a method for them,
a repository administrator sets them by hand.

The factory checks afterwards: it reads the head that was merged back from the forge, and a head that is not the
attested commit keeps the work item from `done`. The ways on are then the person's: `changes-requested`, which
takes the work back through the factory, or `abandon`.

## What is not here

Actions secrets, runner registration and pruning, repository renames, and the release runner itself are forge
operations that reach beyond this repository. They live in fabrikk-infra's swamp with their own token and vault; this
repository's token is scoped to `dataverket/fabrikk` and the factory holds nothing more
([the loop boundary](../design/factory.md#the-loop-boundary)).
