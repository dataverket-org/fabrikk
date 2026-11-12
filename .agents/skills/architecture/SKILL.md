---
name: architecture
description: The one architecture pattern for Dataverket Go code — tactical DDD inside bounded contexts, with dependencies pointing inward. Vocabulary, package layout, dependency direction and one example. Use whenever planning, writing or reviewing Go code in a Dataverket repository, so words and structure stay the same everywhere.
---

# Architecture: Go, tactical DDD

One pattern and one vocabulary, so anyone can find their way through any service from these words. This skill names
no technology and no domain noun:

- what the stack is (messages, state, identity, the log) is decided in `design/messaging.md`,
  `design/persistence.md`, `design/identity.md` and `design/observability.md`;
- the domain's nouns and rules are the Dataverket domain model in `domain/`, which is authoritative. Go identifiers
  use its words and no others; a word or rule it lacks is proposed in the plan, never chosen silently in code.

## Vocabulary

| Term | Meaning | Go shape |
|---|---|---|
| Bounded context | One model and its language | `internal/<context>/` |
| Value object | Immutable, compared by value, validated on construction | struct with unexported fields; `New…` returns `(T, error)` |
| Aggregate | Consistency boundary: every write goes through its methods, which record domain events | struct with `Events()` |
| Domain event | A fact, past tense, recorded by an aggregate | struct implementing the context's `Event` |
| Repository | Loads and saves one aggregate type, with the events it recorded; hides the store | interface in `domain`, implementations in `adapters` |
| Application service | One use case: load, call the aggregate, save. No business rules | func or small struct in `app` |
| Adapter | Where a transport or an external system meets the application | `adapters/<system>/` |
| Port | An interface to an external system, owned by the code that uses it | interface in `domain` or `app` |

## Package layout

```
<product>/cmd/<service>/main.go                 wiring only
<product>/internal/<context>/domain/            value objects, aggregates, events, ports
<product>/internal/<context>/app/               application services
<product>/internal/<context>/adapters/<system>/ one directory per technology or external system
<product>/internal/platform/                    mechanism shared by the contexts: config, connections, health
```

A package is created when a slice has something to put in it, not before.

## Dependency direction

`adapters → app → domain`. `domain` imports nothing from `app` or `adapters`, and nothing above `adapters` names a
technology. Wiring happens once, in `cmd/<service>/main.go`.

## One example

From a bike-rental domain on purpose: copy the shape, never the domain.

```go
// domain: the aggregate, the closed set of its events, and its repository.
type Rental struct {
	id      RentalID
	endedAt time.Time
	events  []Event
}

//sumtype:decl
type Event interface{ isEvent() }

type RentalEnded struct {
	Rental  RentalID
	EndedAt time.Time
}

func (RentalEnded) isEvent() {}

func (r *Rental) End(at time.Time) error {
	if !r.endedAt.IsZero() {
		return ErrAlreadyEnded
	}
	r.endedAt = at
	r.events = append(r.events, RentalEnded{Rental: r.id, EndedAt: at})
	return nil
}

type RentalRepository interface {
	Get(ctx context.Context, id RentalID) (*Rental, error)
	Save(ctx context.Context, r *Rental) error
}

// app: one use case. The rule is in the aggregate, the store behind the interface.
type EndRental struct {
	Rentals RentalRepository
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
	return uc.Rentals.Save(ctx, r)
}
```

`//sumtype:decl` marks a closed set, so `task check` fails a `switch` that misses a case.
