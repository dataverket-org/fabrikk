---
title: "Service naming"
description: "Each Dataverket service has a single Norwegian noun as its authoritative name; the name is also its brand."
type: adr
project: dataverket
category: architecture
status: accepted
created: 2026-03-08
updated: 2026-09-17
author: Jan Ivar Beddari
tags: [naming, services]
related: []
---

## Status

Accepted on 2026-03-08. Brought into fabrikk's decision record on 2026-09-17, unchanged in substance; it is the one
decision taken before this repository existed that fabrikk treats as its own. Nett was added to the set when the
seven products were listed in the README.

## Context

Dataverket is a sovereign open source datacenter automation system composed of several services: control plane,
compute, Kubernetes, identity, application deployment, object storage, network. Each service needs an authoritative
name for use in documentation, CLIs, subjects, and architecture. Norwegian institutional naming, in the tradition of
"Vegvesenet" and "Jernbaneverket", was chosen for the parent organisation.

## Decision

Each service gets a Norwegian service name: a single descriptive noun consistent with the parent organisation. The
service name is also the service's brand in external-facing contexts.

| Service | Purpose |
|---|---|
| **Sentral** | Control plane, orchestration, billing |
| **Maskin** | Compute: VMs and bare metal |
| **Plattform** | Kubernetes platform |
| **Identitet** | Identity and access management |
| **Tjeneste** | Application and service deployment (SaaS layer) |
| **Objekt** | Object storage (S3-compatible) |
| **Nett** | Datacenter network automation and tenant network products |

Names are Norwegian, single-word, descriptive of the service domain, institutional in tone, and double as branding.
They may become subdomains under `dataverket.org`.

## Consequences

- New services follow the pattern: a Norwegian noun that describes the service domain.
- The service names are the stable identifiers across documentation, CLI tooling, branding, subjects, and code.
- The lower-cased name is the `<service>` value wherever a subject, an identity-provider project, or a policy names a
  service (see the subject-naming decision).

## Decision Outcome

Accepted. The seven names above are the closed set until a new service is added by amending this record.

## Audit

- 2026-03-08: decided (bootstrap repository).
- 2026-09-17: imported into fabrikk as decision 0001; Nett added.
