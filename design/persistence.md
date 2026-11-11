---
audience: contributor, agent
---

# Persistence

Where state lives and how a change to it becomes a message. Nothing above `adapters` names JetStream or PostgreSQL;
a repository hides both. Claims about NATS here were checked in `nats-architecture-and-design@d694333`.

## JetStream is the working record

The control plane needs NATS to decide, store and publish a command, and nothing else.

- **An aggregate is one subject in an append-only stream**, in the account of the tenant it belongs to. The stream
  keeps every message and denies delete and purge (`deny_delete`, `deny_purge`).
- **Each message is a fact and carries the aggregate's full state.** It is the CloudEvent of the fact that last
  changed the aggregate, with the state as `data`. The newest message on the subject is the current state. Nothing
  is replayed to load an aggregate.
- **Load is one read**: the last message on the subject. It may come from a replica that is slightly behind; the
  checked save is what makes that safe.
- **Concurrency is optimistic, by sequence.** A repository saves with `Nats-Expected-Last-Subject-Sequence` set to
  the sequence it loaded, or `0` to create, and the server refuses the write when another instance saved first
  (ADR-8). On a refusal the application service loads again and runs the command again, a bounded number of times.
  Any number of instances may handle commands for the same aggregate: no lock, no leader.
- **One save is one write.** It happened or it did not. There is no transaction across subjects, which is the
  reason an invariant lives inside one aggregate.
- **The save is the fact.** Whatever must not miss a fact, the archive and another context among them, reads the
  stream with a durable consumer. There is no outbox and no second write to lose. A stream may also republish for
  live readers (ADR-28), but republish is at most once and nothing may depend on it.
- **An aggregate that ends is a final fact**, not a removal. A tenant's state is removed by deleting its account.
- **Retention is never by age.** The newest message on a subject is the aggregate's current state, and an age limit
  would delete every aggregate that sat idle.
- **Command inboxes are streams** with one durable consumer shared by every instance of a service, so work spreads
  across instances and survives a restart.

## PostgreSQL is the complete second copy

JetStream is not trusted alone. Jepsen's analysis of NATS 2.12.1 found acknowledged writes lost after power failure,
after a single node crash combined with a pause or partition, and after bit errors in data files; the four issues
(nats-server #7549, #7556, #7564, #7567) were still open on 2026-11-11.

- PostgreSQL holds every fact of every stream, with the stream sequence it had. It is the archive, the place for
  questions JetStream cannot answer, and the source the working record is rebuilt from.
- It is written only by consumers of JetStream, never by a command handler, and it is never in the path of a
  command. With PostgreSQL down, commands still succeed and the copy catches up.
- The archive consumer acknowledges a message only after its commit.
- A projection is a set keyed by the identity the message carries, so replaying a stream into it changes nothing.

## Detect, stop, rebuild

A stream that lost messages looks healthy: its last sequence is simply earlier, and new writes reuse the numbers. An
aggregate has then silently gone back to an older state, and a revoked role or an ended organisation is live again.

- **Detect.** With delete and purge denied, a subject's sequence has no legitimate gap. The archive consumer alarms
  on a gap, on a sequence lower than one it holds, and on a different message at a sequence it holds.
- **Stop.** On that alarm, writes to the stream are refused until it is rebuilt. Failing closed is the point: the
  control plane must not act on state it knows to be stale.
- **Rebuild.** The stream is rebuilt from PostgreSQL by a written procedure, run as a drill and not first in an
  incident.

## Operating rules

1. `sync_interval: always`. A message is on disk before it is acknowledged; a control plane's write rate makes the
   cost irrelevant.
2. Three replicas in separate failure domains, on storage that checksums.
3. A replica is replaced one at a time, and only while the others report current. A node that comes back empty has
   forgotten what it acknowledged, and fsync does not protect against that.
4. Stream data is never deleted in response to an error state. Corruption or an orphaned stream stops and alarms.
5. The NATS server version is pinned, and the four issues above are followed.

## A message seen twice

Delivery is at least once ([messaging.md](messaging.md)). Three things keep a second delivery from changing anything:

- An aggregate's methods move it to a state and never count. A command handled again finds the state already there
  and gives the same reply.
- A creating command carries the identity of what it creates, so the second save with sequence `0` is refused.
- A publish that is retried carries the same `Nats-Msg-Id`, which the stream drops inside its duplicate window.

## What this accepts

- **A loss window.** A fact acknowledged by JetStream and not yet copied can be lost in a correlated failure. That
  is the price of keeping PostgreSQL out of the command path. The copy's lag is measured and alarmed on.
- **No transaction across aggregates.** A command that must change two is a process with steps, each safe to repeat.
- **An aggregate stays small.** Its state is one message, written whole on every save, and bounded by the server's
  maximum message size. An aggregate that grows with its members is a question for the domain model.
- **One aggregate cannot be erased.** See Open, on a person's data.
- **Reads by subject only.** Lists and searches come from the second copy, which lags.
- **Storage grows** with every save, by the full state.

## In code

Load, checked save and retry-on-conflict are one repository helper in `internal/platform`, written by the first
slice that stores an aggregate. That slice also proves the shape at the pinned server version: last message by
subject and the checked save on a stream that denies delete and purge. The archive consumer with its three alarms is
another helper, written by the first slice that needs the copy.

The repository port names neither store. A handler that writes to PostgreSQL, a repository that saves without an
expected sequence, or JetStream types above `adapters` is a finding. Because a message is a whole fact with whole
state, the record could move to PostgreSQL later by changing the helper alone.

**Why.** One dependency in the command path, and distributed concurrency from the server. State and its fact are one
write, so "saved but never published" cannot happen. A tenant's state is isolated by the same account that isolates
its messages, with no shared table where one tenant's rows could reach another. Keeping every message makes the
second copy complete and makes loss detectable, which a bucket's overwrites and purges would hide. Carrying the full
state keeps loading, saving and the code above the repository as simple as a key-value store, without the replay,
snapshots, projector and permanent event versions that event sourcing brings.

## Open

- **A person's data.** A stream that denies delete cannot erase one aggregate. Either personal data stays out of
  the facts and is held where it can be erased, or it is encrypted with a key per person that can be destroyed.
  Decided before a slice stores anything about a person.
- **A save that is more than one fact, or two aggregates from one command.** Either an atomic batch publish into one
  stream (ADR-50, server 2.12 or newer), or a process with repeatable steps. Decided by the first slice that needs it.
- **Reading an old state.** How the state's shape changes over time, given that the newest message of an idle
  aggregate may be years old.
- **Streams.** One per aggregate type or one per context, and whether retention is unlimited or a count per subject.
- **Views for readers.** Whether another context watches the stream or is given a derived key-value entry.
- **The second copy's layout**, and whether it is a schema or a database per tenant.
- **The clock.** Whether a scheduled message (ADR-51) or a periodic sweep fires a date held on a record. Firing one
  twice changes nothing, since each is a state and not a count.
