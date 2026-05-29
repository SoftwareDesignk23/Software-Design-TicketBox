## ADDED Requirements

### Requirement: Distributed Redis rate limiting
The system SHALL execute distributed rate limiting at the API gateway using Redis Lua scripts to ensure atomic counter updates across multiple gateway instances.

#### Scenario: Atomic update
- **WHEN** multiple gateway instances update a shared rate limit key concurrently
- **THEN** the Lua script enforces a consistent limit without race conditions

### Requirement: Token bucket burst tolerance
The system SHALL apply a token bucket algorithm for general read endpoints to allow short bursts without false positives.

#### Scenario: Burst traffic
- **WHEN** a client sends a brief burst of requests within the burst capacity
- **THEN** requests are allowed until the bucket is depleted

### Requirement: Sliding window limits for sensitive endpoints
The system SHALL enforce sliding window throttling for checkout, seat reservation, and payment initiation endpoints.

#### Scenario: Sustained abuse
- **WHEN** requests exceed the sliding window limit for a sensitive endpoint
- **THEN** the gateway rejects the request with HTTP 429

### Requirement: Multi-dimensional throttling
The system SHALL enforce rate limits by IP address and by authenticated user ID, applying both limits before allowing access.

#### Scenario: IP and user limits
- **WHEN** a request exceeds either the IP limit or the user ID limit
- **THEN** the gateway rejects the request with HTTP 429

### Requirement: Anti-bot heuristics and challenge routing
The system SHALL detect non-human interaction speed or repetitive request patterns and route flagged traffic to CAPTCHA or drop it.

#### Scenario: Bot-like behavior
- **WHEN** traffic matches bot heuristics
- **THEN** the gateway routes the request to CAPTCHA or drops it

### Requirement: Standardized gateway rejection
The system SHALL return HTTP 429 with accurate `Retry-After` headers at the gateway, without forwarding requests to backend services.

#### Scenario: Rate limit exceeded
- **WHEN** a rate limit is exceeded at the gateway
- **THEN** the response includes HTTP 429 and a `Retry-After` header indicating when to retry
