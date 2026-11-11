---
audience: contributor, agent
---

# Persistence

Where state lives and how a change to it becomes a message. Nothing above `adapters` names JetStream or PostgreSQL;
a repository hides both. Claims about NATS here were checked in `nats-architecture-and-design@fac1b7e`.

The page has two parts. **What a slice builds now** is what a plan and a review are held to. **Planned, not built**
is the direction, each piece with the trigger that makes it due; a slice is not held to a piece before its trigger.

## What a slice builds now

The working record is a key-value bucket in JetStream. The control plane needs NATS to decide, store and publish a
command, and nothing else.

- **An aggregate is one key in a key-value bucket**, in the account of the tenant it belongs to. One bucket per
  aggregate type per context, with a history of 10, through the key-value client NATS ships.
- **The value is a fact and carries the aggregate's full state.** It is the CloudEvent of the fact that last changed
  the aggregate, with the state as `data`. Nothing is replayed to load an aggregate.
- **Concurrency is optimistic, by revision.** A repository creates with `Create`, which fails when the key exists,
  and saves with `Update` against the revision it loaded, which fails when another instance saved first (ADR-8). On
  a refusal the application service loads again and runs the command again, a bounded number of times. Any number
  of instances may handle commands for the same aggregate: no lock, no leader.
- **One save is one write.** It happened or it did not. There is no transaction across keys, which is the reason an
  invariant lives inside one aggregate.
- **Ending is a mark, not a removal.** An aggregate that ends is saved as a final fact. A repository has no delete
  and never purges.
- **The bucket is private to its context.** It holds the whole aggregate and is never exported to another account.
- **Command inboxes are streams** with one durable consumer shared by every instance of a service, so work spreads
  across instances and survives a restart.

### A message seen twice

Delivery is at least once ([messaging.md](messaging.md)). Three things keep a second delivery from changing anything:

- An aggregate's methods move it to a state and never count. A command handled again finds the state already there
  and gives the same reply.
- A creating command carries the identity of what it creates, so the second `Create` meets the existing key.
- A publish that is retried carries the same `Nats-Msg-Id`, which the stream drops inside its duplicate window.

### What this accepts

- **No transaction across aggregates.** A command that must change two is a process with steps, each safe to repeat.
- **An aggregate stays small.** Its state is one message, written whole on every save, and bounded by the server's
  maximum message size. An aggregate that grows with its members is a question for the domain model.
- **Reads by key only.**
- **The bucket forgets.** It keeps ten values per key, and a service that may save a key may also overwrite and
  purge it. Nothing built now depends on a key's history.

### In code

The repository is a thin layer over the key-value client in `internal/platform`: load with revision, create, update,
retry on conflict. It is written by the first slice that stores an aggregate.

The repository port names neither store. A handler that writes to PostgreSQL, a repository that saves without a
revision or purges, or JetStream types above `adapters` is a finding. Because a value is a whole fact with whole
state, the record could move to another store later by changing the helper alone.

**Why.** One dependency in the command path, and distributed concurrency from the server, through the client NATS
ships and documents. State and its fact are one write, so "saved but never published" cannot happen. A tenant's
state is isolated by the same account that isolates its messages, with no shared table where one tenant's rows could
reach another. Carrying the full state avoids the replay, snapshots, projector and permanent event versions that
event sourcing brings.

## Planned, not built

### A mirror that keeps everything

*Due with the first consumer that must not miss a fact: the second copy, or Audit's feed of integration events.*

Because a save is the fact, whatever must see every fact reads the record's stream, and a bucket with ten values per
key forgets. The server mirrors each bucket's stream into a second stream (ADR-59) that has its own retention, the
same order and sequence numbers, and accepts no publishes. The mirror keeps every message, never by age, and no
service holds a permission on it. Consumers that need every fact read the mirror, never the bucket. A bucket may
republish for live readers (ADR-28), but republish is at most once and nothing may depend on it.

- **It is there for completeness.** That an act cannot be hidden is Audit's job: the domain's audit decision has
  another party record every command with its actor and outcome, in another account. The mirror adds what Audit
  deliberately leaves out: what the state was, and a change made without a command.
- **It is still a reader.** A message removed from the bucket before the mirror read it is not copied, and the
  server records the skipped range. In one cluster the mirror lags by milliseconds and a history of 10 covers it.
- **It grows** with every save, by the full state.
- **To prove when it is built:** that it keeps what the bucket drops, and how a delete and a purge in the bucket
  arrive in it.

### PostgreSQL as the complete second copy

*Due when something needs history or SQL reads, and in any case before real data.*

JetStream is not trusted alone. Jepsen's analysis of NATS 2.12.1 found acknowledged writes lost after power failure,
after a single node crash combined with a pause or partition, and after bit errors in data files; the four issues
(nats-server #7549, #7556, #7564, #7567) were still open on 2026-11-11.

- PostgreSQL holds every message of every mirror, with the sequence it had. It is the archive, the place for
  questions JetStream cannot answer, and the source the bucket and the mirror are rebuilt from.
- It is written only by a consumer of the mirror, never by a command handler, and it is never in the path of a
  command. With PostgreSQL down for any length of time, commands still succeed and the copy catches up in full.
- The consumer acknowledges a message only after its commit. A projection is a set keyed by the identity the
  message carries, so replaying a mirror into it changes nothing.
- **A loss window is accepted.** A fact acknowledged by JetStream and not yet copied can be lost in a correlated
  failure. That is the price of keeping PostgreSQL out of the command path. The copy's lag is measured.

### Detect, stop, rebuild

*Due before real data.*

A stream that lost messages looks healthy: its last sequence is simply earlier, and new writes reuse the numbers. An
aggregate has then silently gone back to an older state, and a revoked role or an ended organisation is live again.

- **Detect.** The consumer of the mirror alarms on a skipped range, on a sequence lower than one it holds, and on a
  different message at a sequence it holds. A periodic comparison alarms when a key's newest revision in the bucket
  is not the mirror's newest for that key.
- **Stop.** On an alarm, writes to that bucket are refused until it is rebuilt.
- **Rebuild.** The bucket and the mirror are rebuilt from PostgreSQL by a written procedure, run as a drill.

### Operating rules

*Due at the first deployment that holds real data.*

1. `sync_interval: always`: a message is on disk before it is acknowledged.
2. Three replicas in separate failure domains, on storage that checksums.
3. A replica is replaced one at a time, and only while the others report current. A node that comes back empty has
   forgotten what it acknowledged.
4. Stream data is never deleted in response to an error state. Corruption or an orphaned stream stops and alarms.
5. The NATS server version is pinned, and the four issues above are followed.

### What another context is given

*Due with the first read from another context.*

A reader in another context or account never sees the record. It is given a **published entry**: a bucket of its
own, shaped for readers, derived from the record by a small projector. Another account watches a mirror of that
bucket, which is the shape the model's reads decision prefers (`domain/control-plane/decisions/reads.md`, "In NATS
terms"). A reader of many tenants consumes the facts instead of holding a mirror per tenant.

### Erasing a person's data

*Due before a slice stores anything about a person.*

A procedure, not a call: the key is purged in the bucket, an operator purges the subject in the mirror, and the rows
go from PostgreSQL. Who may run it and how the act is itself audited are not decided.

## Open

- **A save that is more than one fact, or two aggregates from one command.** Either an atomic batch publish into one
  stream (ADR-50, server 2.12 or newer), or a process with repeatable steps. Decided by the first slice that needs it.
- **Reading an old state.** How the state's shape changes over time, given that the value of an idle aggregate may
  be years old.
- **Mirrors.** One mirror per bucket, or one stream per context that sources every bucket in it; and whether a
  mirror lives in the tenant's account or in the installation's, where no credential of the tenant's can reach it.
- **Refusing a purge on the bucket itself.** A key's save, delete mark and purge are all messages on the same
  subject, told apart only by headers (ADR-8), so permissions cannot separate them. A bucket's stream created with
  rollups off would refuse every purge, but that is off the documented key-value path and unproven.
- **Deleting a tenant.** Deleting an account deletes its buckets and mirrors. The account goes only when the second
  copy and the audit record hold what it had; how that is signalled is not decided.
- **The audit record.** How append-only is enforced on a record that another party writes, and how a tenant's view
  of it is filtered into its own account.
- **The second copy's layout**, and whether it is a schema or a database per tenant.
- **The clock.** Whether a scheduled message (ADR-51) or a periodic sweep fires a date held on a record. Firing one
  twice changes nothing, since each is a state and not a count.
