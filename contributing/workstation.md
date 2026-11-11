# Set up a workstation

What a machine needs before it can drive fabrikk. That machine is the
[workbench](../design/factory.md#the-workbench): the loop runs entirely on it, the agent, the code, the session
stack, and swamp, with one worktree per work item. Only the release is built elsewhere.

## 1. Tools

```sh
curl -fsSL https://swamp-club.com/install.sh | sh     # swamp
swamp --version
```

Also: git 2.36 or newer, Go 1.25 or newer, [task](https://taskfile.dev) 3.x on `PATH`, `jq`, `sops` 3.x, `age` with `age-plugin-yubikey`, and rootless Podman
for the session stack. The driving agent is any coding tool enrolled in `.swamp.yaml`; the skills live in
`.agents/skills/`, `.claude/skills/` symlinks to them, and the rules are in `AGENTS.md`. Enrol another with
`swamp repo upgrade --tool <tool>`, repeating the flag for every tool to keep; if the tool reads a directory other
than `.agents/skills/`, symlink it the way `.claude/skills/` is.

### The container engine

One engine is supported: **rootless Podman**. The stacks never run as root, and there is no fallback to Docker.

| Platform | Podman |
|---|---|
| Linux | Ubuntu 26.04 or newer, with the distribution's own `podman` (5.7 or newer) |
| macOS | Homebrew's `podman`, with a `podman machine` |

The stacks are played with `podman kube play` from Kubernetes manifests. There is no compose and nothing to install
beside Podman.

`task dev.up`, `task dev.down`, `task dev.reset` and `task verify` check the engine and stop on an older or a
rootful Podman. On Linux, enable the user's API socket once, since `ko` loads the images it builds through it:

```sh
systemctl --user enable --now podman.socket
```

## 2. Clone and initialise

```sh
git clone ssh://git@git.dataverket.org/dataverket/fabrikk.git ~/kode/fabrikk
git clone ssh://git@git.dataverket.org/dataverket/miljo.git   ~/kode/miljo      # L2 overlays, next to the monorepo
cd ~/kode/fabrikk
swamp model search --json | jq '.results[].name'       # board, forgejo, references, slice, source-standards
task tools                                              # the pinned tools into _bin (scripts/tools lists them)
swamp model method run references sync                  # read-only reference clones into _reference/
```

Pulled extensions are restored by swamp on first use from `extensions/models/upstream_extensions.json`.

`_bin/` in the main checkout serves every worktree. Run `task tools` again when a task says the tools were not
installed from the checkout's pins, which happens after a pull or on a branch that moves one.

Update the reference clones with `sync`, never `git pull`: each checkout is detached at its listed ref. A work-item
worktree has no `_reference/`; read it from the main checkout (dev-environment skill). The domain model is not a
reference: it is `domain/`, in every checkout and worktree.

## 3. Signing and the vault

- Commits and attestation tags are SSH-signed with a YubiKey resident key (`sk-ssh-ed25519`). Set `gpg.format=ssh`,
  `user.signingkey` to the public key file, `commit.gpgsign=true`, and `tag.gpgsign=true`. Every commit, tag, and push
  needs a touch, so run those commands one at a time.
- Your key must be in `.forgejo/attesters` and in Forgejo's tag protection for `attestation/*` before CI accepts tags
  you sign ([forge.md](forge.md)).
- The `fabrikk` vault (one SOPS file per secret under `vaults/fabrikk/`) decrypts unattended with this host's own
  key, or with an operator's YubiKey (PIN and touch). The YubiKey path cannot serve an unattended run, and the
  factory's pull-request stage is one: without a host key the forge model stops at the token.

```sh
swamp vault get fabrikk --json | jq .config          # recipients
echo -n '<value>' | swamp vault put fabrikk <group>/<key>    # add a secret (all recipients re-encrypted)
```

### A key for this host

One key per host, generated on it and never copied, under the same file name everywhere. The convention and its
reasons are fabrikk-infra's (`docs/runbooks/swamp-host-key.md` there).

1. Generate it, as the user that runs swamp. Do not append it to `keys.txt`, which holds only YubiKey identities.

   ```sh
   age-keygen -o ~/.config/sops/age/swamp-fabrikk.txt
   chmod 0600 ~/.config/sops/age/swamp-fabrikk.txt
   age-keygen -y ~/.config/sops/age/swamp-fabrikk.txt     # the public key, age1...
   ```

2. Add the public key as `swamp-fabrikk-<host>` in `.sops.yaml` (the `identities` block, the header comment, the
   rule) and in `agePublicKey` of the vault config under `vaults/@dataverket/sops/`. Both are public.
3. Re-encrypt every secret to the new set, with a YubiKey that is already a recipient:

   ```sh
   sops updatekeys vaults/fabrikk/forgejo/api_token.enc.json
   ```

4. Check that swamp reads the vault without a touch: `swamp model method run forgejo health`.

Removing a host is the same edits in reverse and the same re-encryption. Git history stays readable by the removed
key, so a key that may be in the wrong hands means rotating the secret at its origin too.

Homebrew `ykman` and `age-plugin-yubikey` on Linux need `PCSCLITE_CSOCK_NAME=/run/pcscd/pcscd.comm` to reach the
system pcscd.

## 4. Check

```sh
swamp model method run forgejo health                  # the forge answers with its version
swamp behavior run slice validate                      # the factory is valid, its scenarios pass
swamp run doctor                                       # no stale runs
```
