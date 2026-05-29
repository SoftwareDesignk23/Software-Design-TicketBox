## 1. Gateway and Redis Setup

- [ ] 1.1 Provision Redis cluster and deploy Lua limiter scripts
- [ ] 1.2 Add gateway configuration for limit tiers and per-endpoint rules
- [ ] 1.3 Implement feature flags for gradual enforcement

## 2. Rate Limiting Algorithms

- [ ] 2.1 Implement token bucket limiter for general read endpoints
- [ ] 2.2 Implement sliding window limiter for checkout, seat reservation, and payment initiation
- [ ] 2.3 Enforce combined IP and user ID limits for authenticated requests

## 3. Anti-Bot Protections

- [ ] 3.1 Implement heuristic scoring for interaction speed and repetitive patterns
- [ ] 3.2 Integrate CAPTCHA routing or drop policy for flagged traffic
- [ ] 3.3 Add allowlist and safe-burst exemptions for trusted clients

## 4. Gateway Responses and Resilience

- [ ] 4.1 Standardize 429 responses with accurate `Retry-After` headers
- [ ] 4.2 Add circuit breaker behavior for Redis latency or outage
- [ ] 4.3 Add observability metrics for limiter hits, blocks, and CAPTCHA events

## 5. Testing and Validation

- [ ] 5.1 Add unit tests for token bucket and sliding window logic
- [ ] 5.2 Add integration tests for Redis Lua atomicity under concurrency
- [ ] 5.3 Run load tests for spike traffic and bot simulations
