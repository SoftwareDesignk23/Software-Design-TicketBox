## Context

Ticket releases will generate extreme bursts of traffic, and malicious bots will target scarce SVIP inventory. The API gateway must enforce distributed rate limits and bot defenses to protect backend services and ensure fair access.

## Goals / Non-Goals

**Goals:**
- Enforce distributed rate limiting with Redis Lua scripts for atomicity across gateways.
- Support token bucket burst tolerance and sliding window protection for sensitive endpoints.
- Apply multi-dimensional throttling by IP and authenticated user ID.
- Detect bot-like behavior and route to CAPTCHA or drop traffic.
- Return standardized 429 responses with accurate `Retry-After` headers at the gateway.

**Non-Goals:**
- Solving all fraud or account takeover risks.
- Blocking all automation at the network edge without application context.
- Replacing existing authentication or payment security controls.

## Decisions

- **Gateway enforcement:** Apply rate limiting and bot filtering at the API gateway to prevent load from reaching backend services.
  - *Alternatives considered:* Application-level throttling only. Rejected due to backend overload risk.
- **Redis Lua scripts:** Use Lua scripts for atomic rate limit updates across multiple gateway instances.
  - *Alternatives considered:* Simple Redis INCR with EXPIRE. Rejected due to race conditions and TTL drift.
- **Token bucket for bursty reads:** Apply token bucket on general read endpoints to allow short bursts without false positives.
  - *Alternatives considered:* Fixed window for all endpoints. Rejected due to poor burst handling.
- **Sliding window for sensitive endpoints:** Use sliding window limits for checkout, seat reservation, and payment initiation to prevent sustained abuse.
  - *Alternatives considered:* Token bucket on all endpoints. Rejected due to weaker sustained limits.
- **Multi-dimensional limits:** Combine IP and user ID rate limits with configurable weights; treat unauthenticated traffic as IP-only.
  - *Alternatives considered:* IP-only enforcement. Rejected due to shared IP false positives and account abuse risk.
- **Anti-bot heuristics:** Score traffic based on interaction speed, repeat patterns, and request entropy; route flagged traffic to CAPTCHA or drop.
  - *Alternatives considered:* CAPTCHA for all. Rejected due to poor user experience and load.

## Risks / Trade-offs

- **Risk:** False positives block legitimate users. → **Mitigation:** Separate burst limits for assets, soft thresholds with CAPTCHA before hard blocks.
- **Risk:** Redis latency adds gateway overhead. → **Mitigation:** Connection pooling, local caching of limiter config, and fast-fail circuits.
- **Risk:** Attackers rotate IPs and accounts. → **Mitigation:** Combine IP and user ID limits with heuristic scoring and device fingerprinting.
- **Risk:** Misconfigured `Retry-After` causes client churn. → **Mitigation:** Use limiter state to compute accurate retry times.

## Migration Plan

1. Provision Redis cluster and deploy Lua limiter scripts.
2. Add gateway middleware for token bucket and sliding window limits behind feature flags.
3. Integrate heuristic scoring and CAPTCHA routing for flagged traffic.
4. Enable 429 response standardization and observability metrics.
5. Gradually enable limits for read endpoints, then sensitive endpoints; monitor error rates.
6. Rollback: disable gateway limiter flags and heuristic enforcement.

## Open Questions

- Final thresholds for IP and user ID limits during peak releases.
- CAPTCHA provider selection and integration details.
- Device fingerprinting strategy and data retention policy.
