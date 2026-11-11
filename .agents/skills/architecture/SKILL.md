---
name: architecture
description: The one architecture pattern for all Dataverket Go code — tactical DDD inside bounded contexts: value objects, aggregates, domain events, repositories, application services, ports and adapters, with dependencies pointing inward. Use this whenever planning, writing, or reviewing Go code in a Dataverket repository, even for small changes, so vocabulary and structure stay consistent everywhere.
---

# Architecture: Go, tactical DDD

One pattern, one vocabulary, everywhere. Consistency is what lets anyone — human or agent — navigate any
implementation top-down starting from these words. Examples below are from a small **bike-rental** domain on purpose:
copy the *shape*, never the domain.

## Three sources, one each

| What | Where | Rule |
|---|---|---|
| **Pattern words**: value object, aggregate, port, application service | this skill | Names no technology and no domain noun |
| **The stack**: how a message is shaped, where state lives, how a connection is identified | `design/messaging.md`, `design/persistence.md`, `design/identity.md` | Read the page before planning or reviewing anything it covers |
| **The domain's nouns and rules** | the Dataverket domain model, `domain/` (`design/products.md` says how to read it) | Go identifiers, message types and subjects use its words and no others |

The model is authoritative over this skill where they differ. `domain/README.md` lists the rules that
bind every slice. A word the glossary lacks, or a rule a design page does not state, is never a choice made silently
in a plan or in code: the plan proposes the model change (`planning-conventions.md`) and the human decides.

## Vocabulary

| Term | Meaning | Go shape |
|---|---|---|
| Bounded context | One model and its language. One package directory per context. | `internal/<context>/` |
| Value object | Immutable, compared by value, validated on construction. | struct with unexported fields, `New…` returns `(T, error)` |
| Entity | Has identity, mutable state, invariants. | struct with `ID` value object |
| Aggregate | Consistency boundary. All writes go through its methods; methods record domain events. | struct with `events []Event`, `Events()` drains |
| Domain event | A fact, past tense, recorded by an aggregate. Stays inside its context. | struct implementing `Event` |
| Integration event | A fact published across a context boundary; the model's integration contract lists every one. | message with a past-tense type |
| Command | An instruction, imperative, sent by an actor; answered by a reply. | message with an imperative type |
| Reply | The answer to a command or a query: success or failure with the ids. Never an event. | message, past tense of the verb |
| Repository | Loads and saves one aggregate type, with the events it recorded. Hides the store. | interface in `domain`, impls in `adapters` |
| Application service | One use case: load → call aggregate → save. No business rules. | func or small struct in `app` |
| Inbound adapter | Transport message → verify → decode → application service. | `adapters/<transport>` |
| Downstream port | Interface to an external system. Comes with in-memory fake, contract suite, compose fragment. | interface in `domain` or `app`, impls in `adapters/<system>` |

## Package layout

```
cmd/<service>/main.go                 wiring only
internal/<context>/domain/            value objects, entities, aggregates, events, ports
internal/<context>/app/               application services
internal/<context>/adapters/<system>/ one directory per technology or external system, with its fakes
internal/platform/                    shared mechanism, written once: the envelope, the repository's load and
                                      save, token verification, otel, config (the design pages say what each does)
```

Dependencies point inward: `adapters → app → domain`. `domain` imports nothing from `adapters`. Nothing above
`adapters` names a technology.

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

### Aggregate recording a domain event

```go
type Rental struct {
	id      RentalID
	bike    BikeID
	endedAt time.Time
	events  []Event
}

// Event is the closed set of things that can happen to a rental.
//
//sumtype:decl
type Event interface{ isEvent() }

type RentalEnded struct {
	Rental  RentalID
	Bike    BikeID
	EndedAt time.Time
}

func (RentalEnded) isEvent() {}

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

`Save` takes the aggregate with the events it recorded, as one unit, and fails with `ErrConflict` when the aggregate
changed since it was loaded; the application service then loads and runs the command again. How the real store does
both is the stack's (`design/persistence.md`).

```go
type RentalRepository interface {
	Get(ctx context.Context, id RentalID) (*Rental, error)
	Save(ctx context.Context, r *Rental) error
}

type memRentals struct {
	m      map[RentalID]*Rental
	Events []Event // what was recorded, for assertions
}

func (s *memRentals) Get(_ context.Context, id RentalID) (*Rental, error) {
	r, ok := s.m[id]
	if !ok {
		return nil, ErrNotFound
	}
	return r, nil
}

func (s *memRentals) Save(_ context.Context, r *Rental) error {
	s.m[r.id] = r
	s.Events = append(s.Events, r.Events()...)
	return nil
}
```

### Application service

```go
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

The inbound adapter's shape is in `design/messaging.md`, because it is where the pattern meets the transport.

## Compile-time invariants

A rule that lives in a type is a compile error the agent gets for free. A rule that lives in a function body is a
prompt someone has to remember. Prefer the type whenever Go allows it.

- **Identities are distinct types.** Every identity is its own named type with a validating constructor,
  `ParseBikeID(s string) (BikeID, error)`, and an unexported field, so a value never exists unvalidated and cannot
  be made by conversion outside its package. Passing a `BikeID` where a `RentalID` is expected must not compile. An
  identity never crosses a package boundary as a `string`.
- **A decision produces a type, not a bool.** A function that may act only after a decision takes a proof type whose
  fields are unexported and whose only constructor is in the package that decides: `Unlock(ctx, PaidRental)`, never
  `Unlock(ctx, rental, paid bool)`. Nothing outside that package can construct the proof, so the unauthorized call
  cannot be written. The proof carries what the decision was about, so it cannot be reused for another act.
- **Closed sets are sealed interfaces.** One struct per case, an unexported marker method, and `//sumtype:decl` on
  the interface, as `Event` above. Every `switch` over one lists every case and has no `default`. A constant enum
  is covered the same way; prefer the sealed interface when cases carry data.
- **State is a type where the transition is a decision.** `DraftRental → PaidRental`, each produced only by the
  function that performs the transition. Where a transition decides nothing, a status field on one struct is fine;
  multiplying types for their own sake is a simplicity finding.
- **What is open by design stays open.** Ports and repositories are never marked `//sumtype:decl`.

These rules apply to code a slice writes or touches. A slice does not rewrite other code to meet them.

Go has no REPL to try a domain model in before it is wired up. The tier-0 table-driven tests over the domain package
are the substitute.

## Go idioms

- Constructors return `(T, error)`; validate at the boundary once, trust inside.
- Unexported fields, small exported surfaces. Interfaces are defined by the consumer, next to its use.
- `context.Context` is the first parameter. Errors are wrapped with `%w` and sentinel errors live in `domain`.
- No frameworks, no DI containers, no code generation beyond what the repository already has. Standard library first.
- No package-level mutable state. Wiring happens once, in `cmd/<service>/main.go`.

## Checked, not reviewed

`task check` runs golangci-lint with the repository's `.golangci.yml`, so a reviewer does not spend a finding on
what it decides:

- **Today:** every `switch` over a sealed interface marked `//sumtype:decl`, and over a constant enum, covers every
  case, and a `default` arm does not count as covering one. A missing case fails the loop like a compile error.
- **From the first product on:** the dependency direction (`domain` imports no `adapters`, `app` imports no
  `adapters`), and which package may import the transport and the database drivers. Until that lint exists they are
  review findings.

## Reviewer checklist

- Is a write made outside an aggregate's methods? Is a business rule in an application service or an adapter?
- Does every interface have a consumer next to it?
- Does a name, a command, an event or a rule appear that the model's design for that context does not state, or
  states differently? Is a model change in the code that the plan did not propose?
- Does the change follow the design pages it touches, and does it change a page it contradicts?
- Is a reply published as an event, or an event pair standing in for a reply?
- For every rule the change introduces or touches: is it enforced by a type, by the linter, or by a function body?
  A rule the compiler or the linter could own, held in a body instead, is a finding.
- Does the code match the plan's `invariants`? Is a closed set left unmarked, so the linter cannot see it?

## Severity guide

For where a rule is enforced:

- **High:** the rule guards isolation or authorization and is held in a body: a raw `string` identity crossing a
  package boundary, a `bool` or a status check standing in for a proof type, a handler comparing message type
  strings. Also a runtime check that the plan's `invariants` did not list as runtime.
- **Medium:** any other rule kept in a body when a type or a sealed interface would hold it; an identity made by
  conversion instead of its constructor.
- **Not a finding:** a status field for a transition that decides nothing.
