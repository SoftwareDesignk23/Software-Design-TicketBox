## ADDED Requirements

### Requirement: Cache-aside read flow
The system SHALL implement cache-aside reads for concert listings, concert details, and ticket availability, reading from Redis first and populating Redis on cache miss.

#### Scenario: Cache hit
- **WHEN** a client requests concert details and the Redis cache contains the entry
- **THEN** the system returns the cached response without querying the database

#### Scenario: Cache miss
- **WHEN** a client requests concert details and the Redis cache does not contain the entry
- **THEN** the system queries the database, returns the response, and writes the entry to Redis

### Requirement: Tiered TTL policies
The system SHALL apply long TTLs to concert listings and metadata, and short TTLs to ticket availability counts, with TTLs configurable per resource type.

#### Scenario: Listing TTL
- **WHEN** a listing entry is cached
- **THEN** the system sets a long TTL for the cache key

#### Scenario: Availability TTL
- **WHEN** an availability entry is cached
- **THEN** the system sets a short TTL for the cache key

### Requirement: Proactive availability invalidation
The system SHALL trigger asynchronous cache invalidation or decrement events upon successful ticket transactions for the affected concert and seating inventory.

#### Scenario: Ticket purchase
- **WHEN** a ticket transaction completes successfully
- **THEN** the system emits an event to invalidate or decrement the related availability cache key

### Requirement: Thundering herd protection
The system SHALL prevent concurrent cache rebuilds for the same key using distributed mutex locks or stale-while-revalidate behavior.

#### Scenario: Hot key expiry
- **WHEN** a popular cache key expires under high concurrency
- **THEN** only one request performs a database rebuild while others wait or receive a stale response

### Requirement: Graceful degradation on cache failure
The system SHALL enforce aggressive rate limiting on database reads or route users to a waiting room when the Redis cluster is unavailable or unhealthy.

#### Scenario: Redis outage
- **WHEN** Redis is unreachable or reports unhealthy status
- **THEN** the system activates database read rate limiting or waiting room routing
