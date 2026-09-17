---
name: dev-environment
description: How the Dataverket development environment works — the compose session stack and its profiles, make targets, the downstream fragment contract, and the admission budget that decides what may join the loop. Use whenever running or testing services locally, adding a dependency or downstream system to development, writing compose files, or reviewing a plan that touches the dev loop.
---

# Development environment

Principle: **never split one loop across a network.** A loop and its dependencies live on the same machine. If the
machine should be a server, move the whole workbench — agent, code, and dependencies — not the dependencies alone.

## Session stack

One `compose.yaml` at the repository root, shared by every product; profiles select what runs. Boot once per session;
iterate with `go test` many times.

| Profile | Services | Purpose |
|---|---|---|
| *(default)* | `nats` (JetStream on), `postgres` | Tier 0 and 1. Rootless, seconds to boot. |
| `verify` | + `zitadel` (with its database), + the service scratch images | Tier 2: black-box suite against built artifacts. |
| `objekt` | + `ceph-aio` | Real Ceph (MON, MGR, OSD, RGW) for the Objekt downstream port. |
| `maskin` | + `incus` | Real incusd for the Maskin downstream port. **Rootful, privileged.** |

Zitadel is never in the default profile. Tier 0/1 tokens come from a fake JWKS issuer in tests. A single long-lived dev
Zitadel may exist for interactive exploration; **no test may talk to it.**

## Make targets

```
make dev.up [PROFILE=objekt]   compose up --wait for the profile; fails if not healthy
make dev.down                  stop, keep volumes
make dev.reset [PROFILE=...]   run every fragment's reset script; wipe volumes if asked
make run                       start services as plain processes against the stack, seeded
make check                     gofmt, go vet, golangci-lint, go test ./...   (tier 0)
make verify                    build images with ko, up `verify`, run contract + black-box suites (tier 2)
```

## Downstream fragment contract

Every downstream API used by a service ships a compose fragment under `deploy/dev/<system>/` at the repository root,
per downstream system rather than per product, because one session stack serves every product. Product manifests live
elsewhere, in `<product>/deploy/base/` (delivery skill). Each fragment declares:

| Field | Meaning |
|---|---|
| `profile` | `default` or a named opt-in profile |
| `image` | digest-pinned reference in the Dataverket registry (mirrored from upstream) |
| `boot_budget` | seconds to healthy; default profile ≤ 30 s cold; opt-in profiles may be slower |
| `privileges` | `rootless` or `rootful-privileged`, with the exact flags |
| `healthcheck` | a real readiness probe; `compose up --wait` must mean ready |
| `seed` | script that creates the fixtures tests assume |
| `reset` | script that returns the service to seeded state without a restart |

A fragment without `reset` or with an upstream tag is rejected in review. Adding a fragment requires an ADR.

## Admission budget

- Default profile: cold `compose up` under 30 seconds, rootless, per-test state isolation available.
- Opt-in profiles: session boot allowed to be slow; still needs healthcheck, seed, reset.
- Any fragment that flakes twice is demoted: tests fall back to the in-memory fake, the real fragment runs only in
  `make verify`. Demotion produces a finding.
- The agent will propose "just add X to compose" often. The budget is the answer.

## Current fragments

| System | Image (mirror and pin) | Notes |
|---|---|---|
| NATS | `nats` official | JetStream enabled, file store on a volume |
| PostgreSQL | `postgres` official | Template database for per-test clones |
| Zitadel | `ghcr.io/zitadel/zitadel` | `verify` only; seeded orgs |
| Ceph | `quay.io/benjamin_holmes/ceph-aio:v19` | Single container MON+MGR+OSD+RGW, ~60 s to healthy; tags expire upstream — mirror. Admin-ops API is real Ceph. |
| Incus | `ghcr.io/cmspam/incus-docker` | Needs `privileged`, `network_mode: host`, `pid: host`, `cgroup: host`, `/dev`, `/lib/modules`; rootful podman; one instance per workbench. Container-class instances only; VMs need `/dev/kvm`. |

`pr0ton11/radosgw` is a gateway-only image and needs a RADOS backend; use it only in front of `ceph-aio` if
gateway-level topology is ever needed.

## Per-test isolation on the shared stack

- PostgreSQL: `CREATE DATABASE t_<name> TEMPLATE dataverket_template`; drop on cleanup.
- NATS: prefix subjects, streams, consumers with the test name. Tests that configure the server embed their own.
- Ceph: per-test user/tenant/bucket names; `reset` sweeps them.
- Incus: per-test project; `reset` deletes projects.

## Workbench

The workbench (laptop, VM, or an IncusOS container) is defined as code — a bootstrap script or Nix flake pinning Go,
podman, `ko`, `flux`, `cosign`, `crane`, and the compose file. Every workbench is identical; parallel work items run in
worktrees on one workbench or on separate workbenches, never against shared remote dependencies.
