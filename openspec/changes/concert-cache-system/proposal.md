## Why

Major concert drops will push tens of thousands of concurrent users to read-heavy endpoints, and the primary database cannot sustain that load. A distributed caching layer is required now to prevent outages while keeping ticket availability eventually consistent.

## What Changes

- Introduce a Redis-backed cache-aside layer for concert listings, details, and ticket availability reads.
- Add tiered TTL policies for static concert metadata versus highly dynamic availability counts.
- Trigger proactive cache invalidation or decrement events after successful ticket transactions.
- Add thundering herd protection for hot keys and graceful degradation when Redis is unavailable.

## Capabilities

### New Capabilities
- `concert-cache-system`: Redis cache-aside read layer with TTL tiers, invalidation, herd protection, and degradation safeguards.

### Modified Capabilities
- None.

## Impact

- New Redis cluster dependency and cache client integration in read paths.
- Updates to ticket transaction flow to emit cache invalidation events.
- Operational controls for rate limiting or waiting room when cache is down.
