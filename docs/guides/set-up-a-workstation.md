---
title: "Set up a workstation"
type: guide
project: fabrikk
audience: operator
description: "What a machine needs before it can drive fabrikk."
weight: 10
---

# Set up a workstation

What a machine needs before it can drive fabrikk. That machine is what the manual calls a
[workbench](../explanation/how-fabrikk-works.md#the-workbench): the loop runs entirely on it, the agent, the code, the
session stack, and swamp, with one worktree per work item. Only the release is built elsewhere.

## 1. Tools

```sh
curl -fsSL https://swamp-club.com/install.sh | sh     # swamp
swamp --version
```

Also: git 2.36 or newer, Go 1.25 or newer, `jq`, `sops` 3.x, `age` with `age-plugin-yubikey`, and Podman or Docker
with compose for the session stack. The driving agent is any coding tool enrolled in `.swamp.yaml`, Claude Code or
Codex today; the skills live in `.agents/skills/` and `.claude/skills/` symlinks to them, and the rules are in
`AGENTS.md`. Enrol another with `swamp repo upgrade --tool <tool>`, repeating the flag for every tool to keep; if the
tool reads a directory other than `.agents/skills/`, symlink it the way `.claude/skills/` is.

## 2. Clone and initialise

```sh
git clone ssh://git@git.dataverket.org/dataverket/fabrikk.git ~/kode/fabrikk
git clone ssh://git@git.dataverket.org/dataverket/miljo.git   ~/kode/miljo      # L2 overlays, next to the monorepo
cd ~/kode/fabrikk
swamp model search --json | jq '.results[].name'       # fabrikk, forgejo, omni, references, ...
make tools                                              # pinned ko, cosign, kustomize, crane, flux, and tools/ into _bin
swamp model method run references sync                  # read-only reference clones into _reference/
```

Pulled extensions are restored by swamp on first use from `extensions/models/upstream_extensions.json`.

## 3. Signing and the vault

- Commits and attestation tags are SSH-signed with a YubiKey resident key (`sk-ssh-ed25519`). Set `gpg.format=ssh`,
  `user.signingkey` to the public key file, `commit.gpgsign=true`, and `tag.gpgsign=true`. Every commit, tag, and push
  needs a touch, so run those commands one at a time.
- Your key must be in `.forgejo/attesters` and in Forgejo's tag protection for `attestation/*` before CI accepts tags
  you sign ([operate-the-forge.md](operate-the-forge.md)).
- The `fabrikk` vault (`vaults/fabrikk.enc.json`) decrypts with the factory host's age key from the default SOPS age
  keys file, or with an attester's YubiKey (PIN and touch). The YubiKey path cannot serve unattended runs; that is
  what the factory key is for. Nothing in the repository names a home directory.

```sh
swamp vault get fabrikk --json | jq .config          # recipients
echo -n '<value>' | swamp vault put fabrikk <group>/<key>    # add a secret (all recipients re-encrypted)
```

Homebrew `ykman` and `age-plugin-yubikey` on Linux need `PCSCLITE_CSOCK_NAME=/run/pcscd/pcscd.comm` to reach the
system pcscd.

## 4. Cluster access

The factory reaches `dataverket-prod` through Omni-issued contexts in your default kubeconfig. Model definitions name
contexts, never paths:

| Context | Rights | Used by |
|---|---|---|
| `fabrikk-readers` | `view` in `forgejo-runners` | `runner-pods` |
| `dataverket-prod-admin` | cluster-admin, 30-day token | `dataverket-prod-rbac`, `dataverket-prod-helm` |

```sh
kubectl config get-contexts
swamp model method run runner-pods list
```

## 5. Check

```sh
swamp model method run forgejo health                  # the forge answers with its version
swamp model method run fabrikk validate                # Definition is valid (13 stages)
swamp run doctor                                       # no stale runs
```
