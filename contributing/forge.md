# Operate the forge

Forge tasks go through the `forgejo` model (`@dataverket/forgejo`), never
through the web UI or `curl`, so that what was done is recorded. The token is `forgejo/api_token` in the vault.
Methods are find-or-create and report `created`, `updated`, or `unchanged`; nothing here deletes.

## See the state

```sh
swamp model method run forgejo health
swamp model method run forgejo repo_list                 # no owner: the token has neither read:organization nor read:user
swamp model method run forgejo branch_protection_list --input owner=dataverket --input name=fabrikk
swamp model method run forgejo pr_list --input owner=dataverket --input name=fabrikk
swamp model method run forgejo issue_list --input owner=dataverket --input name=fabrikk --input state=open
```

## Allow a new attester

1. Add their SSH public key to `.forgejo/attesters` (`<email> namespaces="git" <type> <key> <comment>`), through a
   pull request; it is a protected path.
2. Allow them to push `attestation/*` tags:

```sh
swamp model method run forgejo tag_protection_ensure --input owner=dataverket --input name=fabrikk \
  --input 'namePattern=attestation/*' --input 'whitelistUsernames=["beddari","<login>"]'
```

Keep the two lists equal: CI verifies against the file, Forgejo enforces the push. The login needs write access to
the repository first: Forgejo drops one without it from the rule and says nothing, so the method refuses and names
the login.

## `validate-attestation` is not a required check

A change to the factory itself is not a work item and carries no attestation, so a required check would refuse
every such pull request. Until that is settled the check reports and does not block: a red check on a work item's
pull request is for the person who merges to act on.

Making it required is a branch-protection change, which this repository's token cannot make. It is fabrikk-infra's
to run, and its `apps/forgejo/README.md` says where that stands.

## Merge a work item's pull request

The attestation is a signed tag on one commit, so that commit is the one that has to land on `main`.

- Merge with a **merge commit**. It leaves the branch's commits as they are. Rebasing or squashing at merge makes
  new commits: the attested one is then not on `main`, and what is there carries neither its signature nor its tag.
- Never use **Update branch**, by rebase or by merge. Either moves the pull request's head off the attested commit.
  A branch that is behind `main` merges as it is; one that conflicts goes back through the factory, which takes
  `head-moved` to `implement` and attests the new commit.
- If Update branch was pressed anyway, the attestation check on the pull request says so and names the attested
  commit. Nothing needs attesting again: open a new pull request from that commit
  (`git push origin <commit>:refs/heads/<branch>-attested`), close the old one, and have the work item's driver
  record the new pull request.
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
repository's token covers the pull requests and the issues of `dataverket/fabrikk`, and the factory holds nothing more
([the loop boundary](../design/factory.md#the-loop-boundary)).
