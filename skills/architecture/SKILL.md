---
name: architecture
description: The one architecture pattern for all Dataverket Go code — tactical DDD inside bounded contexts, event-driven messaging over NATS with CloudEvents, adapters at the edge. Use this whenever planning, writing, or reviewing Go code in a Dataverket repository, even for small changes, so vocabulary and structure stay consistent everywhere.
---

# Architecture: Go, tactical DDD, event-driven

One pattern, one vocabulary, everywhere. Consistency is what lets anyone — human or agent — navigate any
implementation top-down starting from these words. Examples below are from a small **bike-rental** domain on purpose:
copy the *shape*, never the domain.

## Vocabulary

| Term | Meaning | Go shape |
|---|---|---|
| Bounded context | One service's model and language. One Go module directory per context. | `internal/<context>/` |
| Value object | Immutable, compared by value, validated on construction. | struct with unexported fields, `New…` returns `(T, error)` |
| Entity | Has identity, mutable state, invariants. | struct with `ID` value object |
| Aggregate | Consistency boundary. All writes go through its methods; methods record domain events. | struct with `events []Event`, `Events()` drains |
| Domain event | A fact, past tense, produced by an aggregate. | struct implementing `Event` |
| Command / intent | An instruction, imperative, authorized by a token. Never a disguised request/reply. | CloudEvent with imperative type |
| Repository | Loads/saves one aggregate type. Hides JetStream vs PostgreSQL. | interface in `domain`, impls in `adapters` |
| Application service | One use case: load → call aggregate → save → publish. No business rules. | func or small struct in `app` |
| Inbound adapter | NATS subscription → decode CloudEvent → application service. | `adapters/nats` |
| Downstream port | Interface to an external system (radosgw, incus…). Comes with in-memory fake, contract suite, compose fragment. | interface in `domain` or `app`, impls in `adapters/<system>` |

## Package layout

```
cmd/<service>/main.go                 wiring only
internal/<context>/domain/            value objects, entities, aggregates, events, ports
internal/<context>/app/               application services
internal/<context>/adapters/nats/     inbound + outbound messaging
internal/<context>/adapters/postgres/ repositories, projections
internal/<context>/adapters/<system>/ downstream port implementations + fakes
internal/platform/                    shared: cloudevents envelope, callout client, otel, config
```

Dependencies point inward: `adapters → app → domain`. `domain` imports nothing from `adapters`.

## Examples

### Value object

```go
type Duration struct{ minutes int }

func NewDuration(minutes int) (Duration, error) {
	if minutes <= 0 {
		return Duration{}, fmt.Errorf("duration: must be positive, got %d", minutes)
	}
	return Duration{minutes: minutes}, nil
}

func (d Duration) Minutes() int          { return d.minutes }
func (d Duration) Equal(o Duration) bool { return d.minutes == o.minutes }
```

### Aggregate emitting a domain event

```go
type Rental struct {
	id      RentalID
	bike    BikeID
	endedAt time.Time
	events  []Event
}

type RentalEnded struct {
	Rental  RentalID
	Bike    BikeID
	EndedAt time.Time
}

func (RentalEnded) Type() string { return "no.dataverket.rental.rental.ended" }

func (r *Rental) End(at time.Time) error {
	if !r.endedAt.IsZero() {
		return ErrAlreadyEnded
	}
	r.endedAt = at
	r.events = append(r.events, RentalEnded{Rental: r.id, Bike: r.bike, EndedAt: at})
	return nil
}

func (r *Rental) Events() []Event { ev := r.events; r.events = nil; return ev }
```

### Repository (interface in domain, in-memory impl for tests)

```go
type RentalRepository interface {
	Get(ctx context.Context, id RentalID) (*Rental, error)
	Save(ctx context.Context, r *Rental) error
}

type memRentals struct{ m map[RentalID]*Rental }

func (s *memRentals) Get(_ context.Context, id RentalID) (*Rental, error) {
	r, ok := s.m[id]
	if !ok {
		return nil, ErrNotFound
	}
	return r, nil
}
func (s *memRentals) Save(_ context.Context, r *Rental) error { s.m[r.id] = r; return nil }
```

### Application service

```go
type EndRental struct {
	Rentals RentalRepository
	Publish func(ctx context.Context, ev ...Event) error
	Now     func() time.Time
}

func (uc EndRental) Handle(ctx context.Context, id RentalID) error {
	r, err := uc.Rentals.Get(ctx, id)
	if err != nil {
		return fmt.Errorf("end rental %s: %w", id, err)
	}
	if err := r.End(uc.Now()); err != nil {
		return err
	}
	if err := uc.Rentals.Save(ctx, r); err != nil {
		return err
	}
	return uc.Publish(ctx, r.Events()...)
}
```

### Inbound NATS adapter

```go
func (a *Adapter) onEndRental(msg *nats.Msg) {
	ctx, ce, err := a.envelope.Decode(msg) // verifies token, tenant claim, jti/nbf/exp
	if err != nil {
		a.reject(msg, err) // log once, nak/term; never process
		return
	}
	var cmd EndRentalCommand
	if err := ce.DataAs(&cmd); err != nil {
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

### Downstream port with fake and contract suite

```go
// domain
type LockController interface {
	Unlock(ctx context.Context, bike BikeID) error
	Lock(ctx context.Context, bike BikeID) error
}

// adapters/lockctl: fake with fault injection
type Fake struct{ Locked map[BikeID]bool; FailNext error }

func (f *Fake) Unlock(_ context.Context, b BikeID) error {
	if f.FailNext != nil { err := f.FailNext; f.FailNext = nil; return err }
	f.Locked[b] = false
	return nil
}

// contract suite runs against every implementation
func RunContract(t *testing.T, newImpl func(t *testing.T) LockController) {
	t.Run("unlock then lock is idempotent", func(t *testing.T) { /* ... */ })
	t.Run("unknown bike is an error", func(t *testing.T) { /* ... */ })
}
```

The real implementation passes `RunContract` against the compose fragment; the fake passes the same suite in tier 0.

## Messaging rules

- Every message on NATS is a **CloudEvent** (structured JSON, CloudEvents 1.0: `_reference/cloudevents-spec`). No bare payloads.
- `type` is reverse-DNS: `no.dataverket.<context>.<aggregate>.<event>`. Events are past tense (`…ended`); commands are imperative (`…end`).
- `source` and `subject` carry the global resource ID of the aggregate. `id` is unique per message and used for replay protection.
- Required extensions: `tenant`, `traceparent`. Commands additionally carry the authorization token in the envelope, never in `data`.
- Subjects are tenant-scoped inside the tenant's NATS account and follow the subject-naming ADR. Never put secrets or tokens in subjects.
- A command produces zero or more events. Request/reply exists only for synchronous reads via NATS services; never fake it with an event pair.

## Tenancy structure

- Tenant = NATS account = Zitadel organization. No account imports or exports between tenants.
- Every service pins its tenant at startup. Every handler rejects a message whose `tenant` claim does not match the pinned tenant, whatever subject it arrived on.
- The security adversary owns the enforcement checklist; this skill owns the shape.

## Persistence

- JetStream holds event streams and durable command inboxes. PostgreSQL holds projections and query models.
- Repositories decide which. Nothing above `adapters` names either technology.

## Go idioms

- Constructors return `(T, error)`; validate at the boundary once, trust inside.
- Unexported fields, small exported surfaces. Interfaces are defined by the consumer, next to its use.
- `context.Context` is the first parameter. Errors are wrapped with `%w` and sentinel errors live in `domain`.
- No frameworks, no DI containers, no code generation beyond what the repo already has. Standard library first.
- No package-level mutable state. Wiring happens once, in `cmd/<service>/main.go`.
