---
audience: contributor, agent
last-verified: 2026-11-12 @ 4a37a95
---

# Observability

How a running service tells an operator what it is doing. What is decided is its log.

## The log

- A service writes its log to stderr, one JSON object per line, and writes nothing else there. Every line has `time`,
  `level` and `msg`.
- There is one logger. It is made in `main` and handed down.
- Whatever would write around the logger is given a handler that logs through it: the NATS client's own errors, the
  HTTP server's error log, any library that would otherwise print for itself.
- A line never carries a secret. What a line may carry of a message is decided in
  [messaging](messaging.md#the-envelope).

One thing is outside the rule. A panic that nothing recovers is written by the Go runtime as plain text as the
process dies. A service does not do that on purpose, and nothing can be done about its form.

**Why.** There is no shell on a node. An operator has the log, read through a tool that expects every line to
parse, and the line that does not parse arrives exactly when something has gone wrong: a client that cannot connect,
a server that cannot accept.

The system tests hold a product to this: the helper that reads a container's log fails the test on a line that is
not one JSON object with those three fields.

## Planned, not built

- **The fields a handled message's line carries**: the tenant, the message's id and type, the resource. Due with
  the first slice that handles a message.
- **Traces**, carried through the envelope from one service to the next. Due with the first slice in which one
  service calls another.
- **Metrics.** Due with the first slice that has a handler to measure.
