## Context

Concert release spikes will generate extreme read traffic to listing, detail, and availability endpoints. Direct reads to the primary database will fail under load, so a Redis-backed cache layer must shield the database while keeping availability eventually consistent.

## Goals / Non-Goals

**Goals:**
- Serve read-heavy endpoints from Redis using cache-aside with tiered TTLs.
- Keep availability data eventually consistent with proactive invalidation or decrement events.
- Prevent thundering herd on hot keys and provide graceful degradation when Redis is impaired.
- Isolate caching concerns from core transactional flows.

**Non-Goals:**
- Real-time, strongly consistent availability at all times.
- Replacing the primary database for writes.
- Eliminating all read traffic to the database under total cache outage.

## Decisions

- **Cache-aside integration:** Implement cache-aside in the read paths with Redis as the primary read source and the database as the fallback on cache miss.
  - *Alternatives considered:* Write-through caching. Rejected due to higher coupling and added write latency.
- **Tiered TTLs:** Long TTLs for static listings and metadata, short TTLs for availability counts; allow per-resource TTL configuration.
  - *Alternatives considered:* Single TTL for all resources. Rejected due to stale availability risk.
- **Availability updates:** Emit asynchronous invalidation or decrement events after successful ticket transactions to update cache quickly.
  - *Alternatives considered:* Periodic batch refresh only. Rejected due to lag during spikes.
- **Herd protection:** Use distributed mutex locks with timeout for rebuilds, combined with stale-while-revalidate for hot keys.
  - *Alternatives considered:* No protection and rely on database scaling. Rejected due to spike amplification.
- **Graceful degradation:** When Redis is unavailable, enforce aggressive rate limiting on database reads and route overflow to a waiting room feature.
  - *Alternatives considered:* Direct fallback to database for all requests. Rejected due to overload risk.
- **Key design and versioning:** Use namespaced keys with version tokens to enable bulk invalidation per event or release.
  - *Alternatives considered:* Deleting keys by pattern. Rejected due to Redis cluster inefficiency.

## Risks / Trade-offs

- **Risk:** Stale availability counts during spikes. → **Mitigation:** Short TTLs plus transaction-driven invalidations.
- **Risk:** Redis cluster saturation. → **Mitigation:** Capacity planning, request sampling, and circuit breakers.
- **Risk:** Lock contention slows popular keys. → **Mitigation:** Short lock TTLs, stale responses, and jittered backoff.
- **Risk:** Waiting room harms conversion. → **Mitigation:** Use only on cache failure with clear messaging and short retry windows.

## Migration Plan

1. Provision Redis cluster and networking, add client libraries and config.
2. Add cache-aside logic to listing, detail, and availability read paths behind feature flags.
3. Implement invalidation events from ticket transactions and cache consumers.
4. Enable herd protection and rate limiting for cache misses.
5. Gradually ramp traffic to cache-enabled endpoints; monitor cache hit rate, latency, and DB reads.
6. Rollback: disable cache feature flags and event consumers.

## Open Questions

- Final TTL values for listings, details, and availability during peak events.
- Waiting room implementation details and existing infrastructure integration.
- Redis cluster sizing and multi-region strategy.
