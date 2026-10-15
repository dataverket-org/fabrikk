---
title: "Maskin"
type: explanation
project: maskin
audience: everyone, agent
last-verified: 2026-10-15 @ 9a79569
description: "Maskin's ubiquitous language: the words every subject, event, and Go type of the compute product uses."
weight: 50
---

# Maskin

Maskin is the compute product: it brings up and takes down virtual machines and physical machines for a tenant. This
page is its ubiquitous language and the list of messages that enter and leave it. The architecture skill supplies the
pattern words; [Sentral](sentral.md) supplies the words shared across products (tenant, principal, command, event,
intent, worker); this page supplies Maskin's own. Subjects, CloudEvent types, and Go identifiers use these words and no
others; a new word is a change to this page first.

Nothing here is built. Payloads are settled one message at a time: `create` is defined below, the rest are open.

## Language

| Term | Meaning | Where it appears |
|---|---|---|
| Flavour | A named machine size: CPUs and memory. A reference in `create`, never free-form values. | `create`'s `flavour`, `created`'s `flavour` |
| Image | A named operating system image a machine is made from. A reference in `create`. | `create`'s `image`, `created`'s `image` |
| Machine | Something a tenant runs workloads on, virtual or physical. The one aggregate of Maskin. | subject aggregate segment, `source` and `subject` of every message |
| Create | The command to bring a machine into existence and make it ready. | `maskin.cmd.machine.create` |
| Created | The fact that a machine exists and is ready to be booted: defined on a host, its disk made from the image, its initial configuration attached. Not booted, not "accepted". | `maskin.evt.machine.created` |
| Creation failed | The fact that an attempt to create a machine did not succeed. It says nothing about a machine that was running and later broke. | `maskin.evt.machine.creation-failed` |
| Start | The command to boot a created machine. | `maskin.cmd.machine.start` |
| Started | The fact that a machine has booted and has an address. | `maskin.evt.machine.started` |
| Start failed | The fact that an attempt to boot a machine did not succeed. | `maskin.evt.machine.start-failed` |
| Release | The command to give a machine back: a virtual machine is destroyed, a physical machine is wiped and returned to the pool. | `maskin.cmd.machine.release` |
| Released | The fact that a machine is no longer the tenant's. | `maskin.evt.machine.released` |
| Release failed | The fact that an attempt to release a machine did not succeed. | `maskin.evt.machine.release-failed` |
| MaskinAPI | The Maskin service: it receives the commands and requests above, holds the machines' state, and talks to a provider over the network. | the process behind `maskin.>` |
| Provider | Something that runs machines, an Incus deployment first. Sentral knows which providers exist, and MaskinAPI is the one that calls the provider. | Sentral's knowledge of providers |
| Health worker | A small process on the provider's node whose only job is to tell MaskinAPI that the provider is ok. It takes no intents and does no work on the provider. Not in the proof of concept. | the health checks, later |
| Worker | Sentral's word, unchanged: the process next to the hypervisor or the BMC, acting only on signed intents. Never *agent*. Maskin has none; the health worker is not one. | not used by Maskin |

**Release is not fabrikk's release.** In the rest of this repository a release is the signed OCI artifact: the
`releasing` stage, `release.json`, `make release`. Inside Maskin it always means giving a machine back. The subject or
the type says which: `maskin.cmd.machine.release` is never an artifact.

## Messages

Provisioning takes minutes and can fail partway, so it is a command followed by events, never a request and a reply.
Reading a machine's state is a request, because it needs an answer now.

| Kind | Subject | CloudEvent type | Payload |
|---|---|---|---|
| command | `maskin.cmd.machine.create` | `no.dataverket.compute.machine.create` | [defined below](#the-create-payload) |
| command | `maskin.cmd.machine.start` | `no.dataverket.compute.machine.start` | [defined below](#the-start-and-started-payloads) |
| event | `maskin.evt.machine.started` | `no.dataverket.compute.machine.started` | [defined below](#the-start-and-started-payloads) |
| event | `maskin.evt.machine.start-failed` | `no.dataverket.compute.machine.start-failed` | open |
| command | `maskin.cmd.machine.release` | `no.dataverket.compute.machine.release` | open |
| event | `maskin.evt.machine.created` | `no.dataverket.compute.machine.created` | [defined below](#the-created-payload) |
| event | `maskin.evt.machine.creation-failed` | `no.dataverket.compute.machine.creation-failed` | open |
| event | `maskin.evt.machine.released` | `no.dataverket.compute.machine.released` | open |
| event | `maskin.evt.machine.release-failed` | `no.dataverket.compute.machine.release-failed` | open |
| request | `maskin.qry.machine.get` | `no.dataverket.compute.machine.get` | open |
| reply | the requester's inbox | `no.dataverket.compute.machine.got` | open |

Every message carries the envelope the architecture skill requires: `tenant` and `traceparent`, a `source` and
`subject` that are the machine's resource ID, and a unique `id`. A command carries its authorization in the envelope,
never in `data`. Maskin pins its tenant at startup and rejects any message whose `tenant` does not match.

## Decided

- **The caller mints the machine ID.** `create` carries it, and it is the `source` and `subject` of every message about
  that machine, so it is also the handle a caller tracks a request by. A retry of `create` with the same ID is a no-op,
  so `create` is idempotent by construction and needs no separate idempotency key. There is no separate order concept;
  one is added only when a single command can create several machines.
- **`create` names what it wants from a list Maskin owns, never free-form values.** The size and the operating system
  are references into that list, so Maskin decides what can be built and a command cannot ask for anything outside it.
  The lists are flavours, images and networks; see below.
- **The CloudEvent type context is `compute`,** the product's own purpose, so a type reads
  `no.dataverket.compute.machine.create`. The context and the product are the same thing for now.
- **The proof of concept builds only virtual machines.** One shape of flavour, no kind field, until a physical machine
  is a real requirement.
- **Initial configuration is a structured subset of cloud-init, never raw user-data.** Nothing free-form enters a
  command, so there is no secret to store in the stream or leak into a log, and every field can be validated.
- **`created` means ready to be booted, not booted.** Creating a machine does not start it. The host the machine landed
  on is never in any payload: the tenant does not need it, and it would expose the infrastructure.
- **Booting is its own command.** `start` boots a created machine and `started` reports it running. `stop` is added
  when it is needed, not before. Every command has a failure event, so a failed start is never silent.
- **The proof of concept runs on Incus and includes `release`.** `create` makes an instance without starting it, `start`
  boots it, and `release` removes it, so a test or a demo leaves nothing behind. `stop` comes after Incus is set up.
- **MaskinAPI calls the provider itself, over the network.** There is no worker next to Incus. Sentral knows the
  providers, and MaskinAPI is the one that talks to the provider. Later a health worker on the provider's node tells
  MaskinAPI that the provider is ok; the proof of concept has no health checks.
  This departs from the security skill's preferred on-node pattern (a worker on a local socket, holding no network
  credential), so for the proof of concept MaskinAPI holds a client certificate for the provider, and the plan has to
  declare it: scope, custody, rotation, and what a leak grants. An undeclared credential is a critical finding. This is
  a temporary exception. MaskinAPI runs in Kubernetes, and the end state is Dataverket's own workload identity: OIDC
  and short-lived JWTs between MaskinAPI and the provider, trust instead of a certificate. The certificate sits behind
  the provider port, so replacing it changes the adapter and nothing else. The details are open below.

## Flavours and images

A flavour is a size. The proof of concept has three:

| Flavour | CPUs | Memory | Root disk |
|---|---|---|---|
| `small` | 1 | 512 MiB | 10 GB |
| `medium` | 1 | 1024 MiB | 10 GB |
| `large` | 2 | 2048 MiB | 10 GB |

An image is an operating system image. The proof of concept takes them from the Incus default image server
(`images.linuxcontainers.org`) and offers only the aliases Maskin names, never the whole server. For now there is one:
Alpine, which is small and enough for testing.

## The `create` payload

The machine ID is not in `data`: it is the envelope's `source` and `subject`.

| Field | Type | Meaning |
|---|---|---|
| `flavour` | string | A reference into Maskin's list of sizes. |
| `image` | string | A reference into Maskin's list of images. |
| `network` | string | A reference into the list of networks Maskin is configured with. One network per machine; the address comes from DHCP. |
| `cloud_init.hostname` | string, optional | The machine's hostname. Defaults to a value derived from the machine ID. |
| `cloud_init.ssh_authorized_keys` | list of strings | Public SSH keys placed on the machine's default user. Public keys are not secrets. |

Maskin validates every field before any work starts: the references exist in their lists, the hostname is a valid
hostname, each key parses as a public key, and the list has a size cap. A command that fails validation is rejected, and
nothing is created. The remaining messages' payloads are still open.

## The `created` payload

| Field | Type | Meaning |
|---|---|---|
| `flavour` | string | The flavour the machine was made with, as resolved. |
| `image` | string | The image the machine was made from, as resolved. |
| `network` | string | The network the machine is attached to, as resolved. |

These repeat what the caller sent, so the event describes itself to anyone reading the stream. The host is not in it, and
there is no address yet: a DHCP address exists only once the machine boots.

## The `start` and `started` payloads

`start` has an empty `data`: the machine ID in the envelope is all it needs.

| Field | Type | Meaning |
|---|---|---|
| `addresses` | list of strings | The addresses the machine holds on its network once booted. |

## Open questions

Each is settled before the subject it touches is built. The payloads are decided event by event, in this order: `create`,
`created`, `creation-failed`, `release`, `released`, `release-failed`, `get` and `got`.

1. **Reading the lists.** Whether a caller reads the flavours, images and networks through a `qry` request is
   undecided. For the proof of concept their contents are configuration shipped with MaskinAPI. *Catalogue* is not used:
   it is Sentral's word for the subject patterns policy decides over.
2. **The machine ID's format.** The caller mints it, but the form of a global resource ID is not fixed here, and what
   Maskin does with an ID that is malformed or already belongs to another tenant is not decided.
3. **Virtual and physical, after the proof of concept.** One `machine` aggregate with a kind in `data`, or two
   aggregates. Their lifecycles differ.
4. **Stopping.** `stop` and `stopped` are not in the proof of concept. Whether releasing a running machine implies a stop
   or is refused is undecided.
5. **Failure semantics.** What `creation-failed`, `start-failed` and `release-failed` carry, which failures are terminal, and which the
   worker retries.
6. **The provider credential.** MaskinAPI's Incus client certificate must be declared. The proof of concept's answer is
   a certificate restricted to one Incus project, so a leak reaches only Maskin's own instances, kept in a Kubernetes
   secret (the `fabrikk` vault for tests) and rotated by hand. The plan says it is a stopgap for workload identity.
   Until a provider is reachable, MaskinAPI calls a port with a fake adapter, and the first slice stops at that port.
7. **Providers and the health worker, after the proof of concept.** What a provider is in practice (an Incus host or a
   cluster), which message a health check is, what MaskinAPI does with a provider that stops reporting (refuse new
   `create` commands for it, or fail them), and how the health worker authenticates. How Sentral learns of a provider is
   also open.
8. **Authorization before Sentral.** The envelope keeps its authorization slot. Tests use a fake issuer, as Sentral's
   do, so the shape is right when Sentral arrives.
9. **The lists' contents.** The exact Alpine alias, which must be a variant that ships cloud-init because `cloud_init`
   depends on it (to check against the image server), and which network the proof of concept offers.

## Why these words

- *Create* and *release*, not *provision* and *deprovision*: the subject already names the service and the aggregate,
  and provisioning is the whole of Maskin's work, so the longer word adds nothing.
- *Release*, not *delete*: a physical machine is not deleted, it is given back. One word has to be true for both kinds.
- *Creation failed*, not *failed*: a bare `failed` reads as "the machine failed", a fact about a running machine that
  Maskin will need to say separately.
