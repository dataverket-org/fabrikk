---
audience: contributor, agent
---

# Messaging

How a message is shaped, named and handled. The pattern words (command, reply, integration event, inbound adapter)
are the architecture skill's. Who sends what to whom is the domain model's integration contract
([products.md](products.md)). This page is the part between: NATS, JetStream and CloudEvents.

## The envelope

- Every message on NATS is a **CloudEvent**: CloudEvents 1.0, structured mode, JSON (`_reference/cloudevents-spec`).
  No bare payloads.
- `id` is unique per message. `source` and `subject` carry the global resource ID of the aggregate. The CloudEvents
  `subject` attribute is not the NATS subject.
- Required extensions: `tenant`, the one tenant the message concerns, and `traceparent`.
- `tenant` carries the tenant id: a UUID in its canonical lowercase spelling, and never the nil UUID. Nothing else is
  a tenant id, so a tenant is written one way wherever two ids are compared. That spelling is legal as one part of a
  NATS subject, needs no escaping in a resource ID or in a claim, and is unique across installations by itself. The
  model makes the tenant id the organisation id, which also names the account
  (`domain/control-plane/design/tenancy/first-message.md`, "*create organisation* goes to Tenancy, not
  Organisation"), so this is their spelling too.
- A fact that concerns several tenants is published once per tenant, each copy naming that one alone. NATS filters an
  import by subject and never by content, so one copy cannot be shown to some and hidden from others.
- The sender writes neither the actor nor a tenant to be believed. The actor is what admission bound to the
  connection ([identity.md](identity.md)); a message claiming another is refused at the edge.
- Payload travels in `data` and nowhere else. A log line and an audit record carry the envelope, never `data`.

## Types

`type` is reverse-DNS: `no.dataverket.<context>.<aggregate>.<event>`. Events are past tense (`…ended`); commands are
imperative (`…end`). The names are the model's: an integration event is named as the integration contract lists it.

## Commands, replies, queries

- A command produces zero or more events and is answered by a **reply**: success or failure with the ids, on the
  sender's reply subject.
- A reply is typed as the past tense of the command's verb, carries the command's id as its `subject` and an `id` of
  its own. It is never published on a subject and is never an integration event.
- A query is a request for a read model and is answered the same way.
- Never fake either with an event pair. If it needs an answer now, it is a request; if it is a fact, it is an event.

## Domain events and integration events

- A **domain event** stays inside its bounded context. The aggregate records it; it is handled in process, before
  the aggregate is saved.
- An **integration event** crosses a context or an account. It is a row of the model's integration contract, and it
  is the aggregate's save: one message in the record's stream, read by a durable consumer
  ([persistence.md](persistence.md)). Nothing publishes it a second time.

## Delivery

Delivery is at least once. A consumer that sees a message it has handled changes nothing: an aggregate moves to a
state and never counts, and a projection is a set keyed by the identity the message carries
([persistence.md](persistence.md), "A message seen twice").

## Verify before dispatch

An inbound adapter does three things in order, and only then calls the application service:

1. The message is a valid CloudEvent with a known `type` and the required extensions.
2. `tenant` equals the tenant this instance pinned at startup, and the message arrived on a subject the account
   wiring declares for that tenant. The subject of arrival alone grants nothing.
3. `data` is decoded. Never before 1 and 2.

A message that fails is rejected: logged once, `nak` or `term`, never processed.

```go
func (a *Adapter) onEndRental(msg platform.Message) {
	ctx, ce, err := a.envelope.Decode(msg) // steps 1 and 2
	if err != nil {
		a.reject(msg, err)
		return
	}
	var cmd EndRentalCommand
	if err := ce.DataAs(&cmd); err != nil { // step 3
		a.reject(msg, err)
		return
	}
	if err := a.endRental.Handle(ctx, cmd.Rental); err != nil {
		a.fail(msg, err)
		return
	}
	_ = msg.Ack()
}
```

**A message is decoded once.** The inbound adapter maps `type` to the context's closed set of messages exactly once
and rejects anything unknown. Handlers switch on Go types; they never compare `type` strings and never see raw
`data`. The outbound adapter is the only place a Go type becomes a `type` string (architecture skill, "Compile-time
invariants").

Steps 1 and 2 are one function in `internal/platform`, written once and used by every handler. A handler that
reimplements them is a finding. A lint in `.golangci.yml` allows only that package to import `nats.go`, so no
handler can subscribe around it. For the same reason the message a handler is given is that package's own type,
with the acknowledgements a handler needs, and never the client's: an adapter cannot name the client's type without
the import the lint denies it. The example calls it `platform.Message`; the slice that writes the first handler
names it.

## Subjects

- Subjects are scoped inside the tenant's NATS account. Never put a secret, a token or payload in a subject.
- A connection's inbox prefix is fixed per connection and named from the verified token, never from anything the
  client presents. Only the serving side may subscribe to command subjects, so no connection can read another's
  request.

## Open

- **The subject taxonomy.** Where the tenant id, the actor, the context and the aggregate sit in a subject. It is
  written into this page by the slice that first needs a subject, and decided by the human in that plan. Until then a
  plan that needs a subject proposes one and marks it as the proposal it is.
- **The global resource ID's grammar.** What `source` and `subject` carry beyond naming the aggregate: its segments,
  their order and what separates them. If installations federate (`domain/open.md`, "Federation"), the ID has to
  name the installation, and a tenant id that is unique by itself does not stand in the way. Recommended: the grammar
  names the installation from the start.
- **The asking account.** How a handler learns which account sent a request that crossed an import, so that "the
  import tells who sent it" is checked and not assumed.
- **`subject` on a creating command.** The aggregate has no resource ID yet; the model leaves
  it to the taxonomy.
