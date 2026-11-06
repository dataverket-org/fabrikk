---
title: "Sentral"
type: explanation
project: sentral
audience: everyone, agent
last-verified: 2026-11-06
description: "Sentral is the service that will hold the control plane's contexts; its language and design are the Dataverket domain model, not this page."
weight: 40
---

# Sentral

Sentral is the service name ([decision 0001](../decisions/0001-service-naming.md)) for the control plane: the product
every organisation holds under the installation's terms from the moment it is created, and the one that decides what
an organisation is to a provider. Its ubiquitous language, context map, decisions and designs are the **Dataverket
domain model**, the `domain-model` reference repository (`_reference/domain-model`); this page says only how fabrikk
reads it. An earlier version of this page carried a language of its own (principal, grant, binding, a catalogue of
subject patterns, contexts `access` and `tenancy`); the model supersedes it, and where a word below differs from the
model, the model is right.

## Where to read

| Question | Page in the model |
|---|---|
| What does a word mean? | `control-plane/language/README.md` and its sections: who's who, products and the catalogue, the record, words beneath the story, avoided terms |
| Which contexts exist and what crosses between them? | `control-plane/map/README.md`: Person, Organisation, Catalogue and Audit on the map, Tenancy beneath it; one page per boundary |
| What does a context do? | `control-plane/design/<context>/`, in Stack's order: commands, policies, read models, aggregates, events |
| What does every slice have to keep? | `for-implementors/README.md`: the binding rules, one clause and a link each |
| Why is a rule what it is? | the story that found it, `control-plane/story/stories/`, in its hotspots |
| What is deliberately not decided? | `for-facilitators/status.md`, and the landing zone and subject taxonomy below |

## What the model leaves to fabrikk

- **The landing zone:** which service holds which context. The model's contexts are not services; Sentral is the
  first service, and the first slice decides, in its plan, which contexts it brings up as `internal/<context>/`
  packages of the `sentral` module.
- **The subject taxonomy and the CloudEvents profile:** where the organisation id and the actor sit in a subject and
  an envelope. The model's integration contract (`control-plane/decisions/integration-contract.md`) fixes the names,
  the versioning and the payload rules; the taxonomy is an ADR here, written by the slice that first needs it.
- **Mechanism:** persistence, admission's wiring to the identity provider, how the clock fires, how a consumer
  remembers what it handled. The model's `for-implementors/implementation-notes.md` lists what the reviews found about
  each, one line per item, and names none of it as a decision.

## Two words the model and fabrikk agree on

- **Worker**, never *agent*, for a Dataverket process adjacent to the infrastructure it manages: in fabrikk *agent*
  names the session that drives the factory, and the model avoids the word for the same reason.
- **Admission**, for the auth callout's act: it identifies a connection's actor, places the connection in exactly one
  account, and writes the permissions that bind the actor to it. The callout is the mechanism; admission is the word.
