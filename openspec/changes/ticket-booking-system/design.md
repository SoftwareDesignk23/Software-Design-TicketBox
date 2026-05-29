## Context

TicketBox already identifies high-throughput ticketing as a core platform need, but the booking path needs a more precise contract for inventory correctness under sale spikes. The booking engine must coordinate Redis, PostgreSQL, message/worker processing, WebSocket availability, and client queue states while guaranteeing that sold tickets never exceed configured capacity.

The core constraint is that hot-path inventory decisions cannot depend on long database locks during peak demand. Redis will act as the fast consistency gate for reservation attempts, while PostgreSQL remains the durable source for reservations, bookings, tickets, limit counters, and reconciliation.

## Goals / Non-Goals

**Goals:**
- Prevent overselling for each event ticket type under concurrent reservation, expiration, and purchase completion operations.
- Use Redis atomic operations for the reservation hot path, including stock checks, decrement/increment, user pending counters, and reservation TTL metadata.
- Apply distributed locks around critical cross-resource transitions such as purchase finalization, reservation expiration, and reconciliation repair.
- Use PostgreSQL optimistic locking and uniqueness constraints as durable safeguards when persisting inventory, reservations, bookings, and tickets.
- Enforce per-user ticket limits across active reservations and completed purchases.
- Shape extreme traffic with a queue-based booking flow that admits buyers into finite reservation windows.
- Publish real-time availability updates with enough ordering metadata for clients to avoid showing stale counts.

**Non-Goals:**
- Replacing payment authorization, capture, refund, or idempotency behavior already covered by payment-related changes.
- Defining full seat-map rendering or seat-picking UX beyond reservation consistency and expiration.
- Guaranteeing strict fairness between every buyer; the queue provides controlled admission, not a legal lottery system.
- Implementing a custom Redis replacement or database sharding strategy.

## Decisions

### Decision 1: Redis Lua Scripts as the Inventory Gate

Reservation attempts SHALL execute through Redis Lua scripts that atomically validate available inventory, per-user pending counts, queue admission tokens, and requested quantity before decrementing availability. The script returns a reservation token, expiration timestamp, remaining availability, and failure reason when applicable.

Alternatives considered:
- **Database row locks**: Simpler durability story, but hot events can exhaust connections and serialize too much work.
- **Application-level read/write logic**: Easier to code, but race-prone because checks and mutations are not atomic across instances.
- **Redis Lua scripts**: Chosen because Redis executes scripts atomically and keeps the high-contention decision in memory.

### Decision 2: PostgreSQL Optimistic Locking as the Durable Safety Net

Each ticket type inventory row SHALL include a version field updated during reservation persistence, expiration, and finalization. If a write detects a stale version, the service retries from the latest durable state or moves the reservation into a reconciliation-required state without issuing tickets.

Alternatives considered:
- **Trust Redis only**: Fast, but unsafe during process crashes, Redis failover, or missed expiration events.
- **Pessimistic database locks for every request**: Safe, but not viable during high concurrency.
- **Optimistic locking**: Chosen as the durable correctness layer that catches divergence while avoiding long-held locks.

### Decision 3: Short Distributed Locks for Cross-Resource Transitions

The system SHALL use bounded Redis distributed locks for transitions that touch multiple records or stores, including completing a reservation into a paid booking, releasing an expired reservation, and performing inventory reconciliation. Locks must have owner tokens, short TTLs, safe release semantics, and retry/backoff behavior.

Alternatives considered:
- **No locks with only idempotency**: Idempotency prevents duplicate client requests but does not serialize expiration versus checkout completion.
- **Long-lived locks**: Reduce race risk but create user-facing stalls and recovery hazards.
- **Short locks plus optimistic database writes**: Chosen to minimize contention while preserving a second correctness check.

### Decision 4: Queue Admission Before Reservation During Hot Sales

When event demand exceeds configured thresholds, users enter a Redis-backed queue and receive admission leases before they can reserve tickets. A lease grants a short reservation-attempt window and rate-limits retries. Queue state is separate from reservation state so users who abandon their turn do not hold inventory.

Alternatives considered:
- **Allow all users to hit reservation endpoints**: Maximizes immediacy but overloads Redis, API workers, and clients during spikes.
- **Static waiting room only**: Reduces traffic but does not connect admission to inventory and reservation windows.
- **Queue leases**: Chosen because they control concurrency and produce clear client states.

### Decision 5: Availability Events Use Monotonic Versions

Every availability mutation SHALL emit an event with event ID, ticket type ID, remaining count, reserved count, sold count, and monotonically increasing inventory version. Clients ignore updates older than the newest version they have applied.

Alternatives considered:
- **Client polling only**: Simple but too stale for hot sales and creates additional load.
- **Unversioned WebSocket updates**: Real-time but vulnerable to out-of-order delivery.
- **Versioned events**: Chosen so clients can recover from reconnects and avoid stale displays.

## Risks / Trade-offs

- **[Risk] Redis failover can lose recent volatile reservation state** -> Mitigation: persist reservation records quickly, enable Redis persistence/replication, and run reconciliation that compares Redis counters with durable reservations and bookings.
- **[Risk] Expiration workers may lag during traffic spikes** -> Mitigation: use reservation `expires_at` scans, Redis TTL/keyspace notifications where available, and metrics for expiration lag.
- **[Risk] Queue users may see tickets become unavailable after admission** -> Mitigation: queue admission grants the right to attempt reservation, not a stock guarantee, and clients receive explicit sold-out or insufficient-stock failures.
- **[Risk] Distributed locks can block progress if owners crash** -> Mitigation: locks use short TTLs, owner tokens, heartbeat-free bounded work, and idempotent retry paths.
- **[Risk] Real-time availability may briefly differ from durable database state** -> Mitigation: publish from accepted inventory mutations, include versions, and reconcile periodically.

## Migration Plan

1. Add inventory version fields, reservation status fields, queue entry storage, user limit counters, and audit tables.
2. Introduce Redis key schema and Lua scripts behind a feature flag for selected events.
3. Implement reservation APIs, expiration workers, finalization transitions, and reconciliation jobs.
4. Add queue admission endpoints and enable queue mode for high-demand sale windows.
5. Add versioned availability events and client subscription handling.
6. Run concurrency and fault-injection tests before enabling the booking engine for public ticket sales.
7. Roll back by disabling queue/reservation feature flags for new reservations, draining active reservations until expiration or completion, and preserving durable booking records.

## Open Questions

- What default reservation TTL should be used for normal sales versus high-demand sales?
- Should per-user ticket limits apply per event, per ticket type, or both for the first implementation?
- Which Redis deployment topology will be used in production: Sentinel, Cluster, or managed Redis with scripting guarantees?
