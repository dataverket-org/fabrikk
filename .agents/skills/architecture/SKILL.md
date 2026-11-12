---
name: architecture
description: The one architecture pattern for Dataverket Go code — tactical DDD inside bounded contexts, with dependencies pointing inward. Vocabulary, package layout, dependency direction and one example. Use whenever planning, writing or reviewing Go code in a Dataverket repository, so words and structure stay the same everywhere.
---

# Architecture: Go, tactical DDD

One pattern and one vocabulary, so anyone can find their way through any service from these words. This skill names
no technology and no domain noun:

- what the stack is (messages, state, identity) is decided in `design/messaging.md`, `design/persistence.md` and
  `design/identity.md`;
- the domain's nouns and rules are the Dataverket domain model in `domain/`, which is authoritative. Go identifiers
  use its words and no others; a word or rule it lacks is proposed in the plan, never chosen silently in code.

## Vocabulary

| Term | Meaning | Go shape |
|---|---|---|
| Bounded context | One model and its language | `internal/<context>/` |
| Value object | Immutable, compared by value, validated on construction | struct with unexported fields; `New…` returns `(T, error)` |
| Identity | Which one, of one kind. Two kinds never share a type, and none travels as a `string` | a value object for each kind: `RentalID`, `BikeID` |
| Proof | That a decision was made, and what it was about. The function that acts takes it; only the package that decides can fill one in | struct with unexported fields; the deciding function returns it |
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

## Where a rule lives

A rule the compiler holds is one nobody has to remember, an agent least of all. A rule goes in the first of these
that can hold it:

1. **A type.** The wrong kind of identity, or an act with no proof, does not compile.
2. **The lint**, in `task check`: a `switch` over a closed set that misses a case, an import a package may not have.
3. **A check in a function body**, pinned by a unit test.

Two rules always go in a type: which thing something is, and that a decision was made. Go lets anyone write the
empty value of a type, so a type narrows a mistake to that one value and does not remove it: an identity's empty
value is valid nowhere, and the function that acts checks that the proof is about the thing it acts on. For any
other rule a type is a choice. A status that no decision stands behind is a field, and a type made for its own sake
is one more thing to read.

## One example

From a bike-rental domain on purpose: copy the shape, never the domain.

```go
// domain: the aggregate, the closed set of its events, a decision, and its repository.
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

type RentalRefunded struct{ Rental RentalID }

func (RentalEnded) isEvent()    {}
func (RentalRefunded) isEvent() {}

func (r *Rental) End(at time.Time) error {
	if !r.endedAt.IsZero() {
		return ErrAlreadyEnded
	}
	r.endedAt = at
	r.events = append(r.events, RentalEnded{Rental: r.id, EndedAt: at})
	return nil
}

// A decision is a type. Only this package can fill a RefundApproved in, so
// a refund nobody approved cannot be written with one that names a rental.
type RefundApproved struct{ rental RentalID }

func (r *Rental) ApproveRefund(by Staff) (RefundApproved, error) {
	if !by.MayRefund() {
		return RefundApproved{}, ErrNotAllowed
	}
	return RefundApproved{rental: r.id}, nil
}

func (r *Rental) Refund(approved RefundApproved) error {
	if approved.rental != r.id {
		return ErrNotApproved
	}
	r.events = append(r.events, RentalRefunded{Rental: r.id})
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
