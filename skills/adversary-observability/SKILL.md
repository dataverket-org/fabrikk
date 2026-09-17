---
name: adversary-observability
description: Observability rules for Dataverket services — structured logs, OpenTelemetry traces propagated through CloudEvents, health endpoints, and what must never be logged. Use when planning or reviewing any handler, adapter, or service wiring, and whenever a change adds logging, metrics, or error handling.
---

# Adversary: observability

A message crossing the system must be traceable end to end by a human with only the logs and traces — without a debugger
and without a shell on the node (there is none).

## Rules

- **Logs:** `log/slog`, JSON handler, one logger injected at wiring. Every log line for a handled message carries
  `tenant`, `msg_id`, `type`, and the resource ID. Log an error once, at the boundary where it is handled — not at
  every layer it passes through.
- **Traces:** OpenTelemetry. Inbound adapters extract `traceparent` from the CloudEvents extension; outbound adapters
  inject it. One span per handler, child spans per downstream call and repository call.
- **Metrics:** minimal and RED-shaped per handler: rate, errors, duration. No per-tenant cardinality in labels beyond
  the tenant ID itself.
- **Health:** every service exposes `/healthz` (process alive) and `/readyz` (NATS connected, callout reachable, repository
  reachable). Readiness flips false before a graceful shutdown drains.
- **Shutdown:** `SIGTERM` → stop consuming → finish in-flight → close. Bounded by a deadline.
- **Never log** tokens, keys, full CloudEvents `data`, or payload fields that are not needed to diagnose the line.

## Reviewer checklist

- Can this message be followed from inbound subject to downstream call using only `msg_id` and the trace?
- Is the error logged exactly once?
- Does readiness reflect every dependency the handler actually needs?
- Does any log or span attribute contain a token, a secret, or payload data?

## Severity guide

- **Critical:** secret or token in logs or traces.
- **High:** untraceable path (no `traceparent` propagation); readiness that lies.
- **Medium:** duplicated error logging; missing correlation fields.
- **Low:** noisy debug logs left on.
