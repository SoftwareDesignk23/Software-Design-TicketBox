## Why

Ticket release surges and bot traffic will overwhelm backend APIs within seconds unless the platform enforces distributed rate limiting and anti-bot protections. We need a multi-layered gateway defense now to preserve fair access and keep the system stable under extreme load.

## What Changes

- Introduce distributed Redis-backed rate limiting with atomic Lua scripts at the API gateway.
- Implement token bucket limits for burst tolerance and sliding window limits for sustained protection on sensitive endpoints.
- Enforce multi-dimensional throttling by IP and authenticated user ID.
- Add anti-bot heuristics with CAPTCHA routing for suspicious traffic.
- Standardize gateway 429 responses with accurate `Retry-After` headers.

## Capabilities

### New Capabilities
- `api-protection-system`: Gateway rate limiting and anti-bot protections with distributed enforcement and standardized rejection behavior.

### Modified Capabilities
- None.

## Impact

- New Redis dependency and Lua rate limiter scripts at the gateway layer.
- Changes to gateway routing to include CAPTCHA and waiting behavior for flagged traffic.
- Updated API error contracts for 429 responses on protected endpoints.
