---
name: delivery
description: How Dataverket software becomes a release — ko-built scratch images, the config join that produces one signed OCI release artifact per environment, gitless promotion through the registry, and where UAT sits. Use when planning or reviewing anything that touches images, deployment config, environment overlays, the registry, Flux, signing, or promotion.
---

# Delivery

The registry is where releases travel. Git is where they are authored. The UAT environment holds no git credentials.

## Artifacts

- Services are built with `ko`: static Go binaries on `scratch`, one image per `cmd/<service>`, addressed by digest.
- Release builds happen on shared infrastructure (Forgejo Actions runner), after merge. A developer's or agent's machine
  never produces the artifact that ships.
- Everything upstream is mirrored into the Dataverket registry and pinned by digest there.

## Three layers of config

| Layer | Contents | Owner | Cadence |
|---|---|---|---|
| L0 — platform baseline | Storage classes, CSI, backup operator, Flux, monitoring | Environment line | Cluster lifecycle |
| L1 — app base | Env-agnostic manifests with defaults, next to the code in `deploy/base/` | Code factory | Per code change |
| L2 — environment overlay | Replicas, PVC sizes and classes, backup policy, resources, placement, in `environments/<env>/` | Environment line | Per environment change |

L2 may only touch fields the L1 schema declares tunable; a linter enforces it. New tunable fields need an ADR.

## The join

`release = render(L1 @ commit, L2 @ version)` — a pure function, run in the factory, producing **one complete, immutable
artifact per environment**. Never join in the cluster.

```
ko resolve -f deploy/base/ | kustomize build environments/uat/ --load-restrictor … > rendered/
# add release manifest: {app_commit, images: {name: digest}, env_config_version}
flux push artifact oci://registry.dataverket.internal/sentral/config-uat:$GIT_SHA \
  --path=rendered/ --source=$REPO_URL --revision=$GIT_SHA
cosign sign --key … registry.dataverket.internal/sentral/config-uat@<digest>
```

The config artifact's digest is the **release identity**. It pins every image by digest. Its annotations carry the
source URL, git revision, and environment config version.

## Promotion

- Environments are channel tags: `config-uat:candidate`, `config-uat:current`, later `config-prod:…`.
- Promotion is retagging a digest that already passed (`crane tag` / `oras cp`). Rollback is retagging the previous digest.
- Flux `OCIRepository` on the target watches its channel with `verify.provider: cosign`. Unsigned or tampered config is rejected before reconciliation.
- Gate on the *applied revision equal to the candidate digest*, not on "pods ready", before any test runs.

## UAT

- Runs **after merge**, against the release artifact, and takes nothing else as input.
- Functional tests run for every artifact; environmental tests run where the overlay declares the promise.
- On failure: either the acceptance test was wrong (fix the test) or it is a regression (file a bug; the factory runs the whole loop).
- Passing UAT promotes the candidate to `current`. Nothing else does.

## Environment line

Environment config has its own small factory line with operational adversaries (capacity, disruption budgets, storage
classes present in the target baseline, backup with a tested restore). Both lines converge on the same UAT gate: a code
change with pinned env config, or an env change with pinned app digests, each yields a new joined artifact and each runs UAT.

## Reviewer checklist

- Is any image or config reference a tag?
- Does the rendered output for *every* environment still build and pass the schema linter, not only the one being deployed?
- Does the change add an L2 field without an ADR?
- Does anything get joined, templated, or substituted in the cluster?
- Can this artifact be mirrored anywhere safely — no secrets inside?
