## Context

TicketBox checkout depends on limited-time reservations, so payment processing must be resilient, idempotent, and unambiguous. VNPAY and MoMo introduce redirect/deeplink flows, asynchronous provider notifications, provider-specific signatures, timeout rules, and settlement states that must be normalized before bookings are finalized.

The payment service should own provider communication, payment state transitions, idempotency records, webhook verification, timeout handling, and exactly-once booking finalization. Booking inventory and reservation ownership remains in the booking system; payment completion calls into booking finalization only after verified successful settlement.

## Goals / Non-Goals

**Goals:**
- Integrate VNPAY and MoMo using provider adapters behind a shared payment service interface.
- Require idempotency keys on payment creation and finalize paths to prevent duplicate charges and duplicate booking finalization.
- Verify all provider returns, webhooks, and IPNs before changing payment or booking state.
- Handle payment timeouts by moving attempts to terminal or pending-review states and coordinating reservation release.
- Apply bounded retries only for transient failures and never retry unsafe charge creation without idempotency protection.
- Use per-provider circuit breakers to fail fast and offer alternate provider or retry-later states.
- Provide graceful user-facing payment states: pending, paid, failed, expired, provider unavailable, and requires retry.

**Non-Goals:**
- Building wallet balances, stored payment instruments, refunds, chargebacks, or reconciliation payouts.
- Replacing provider settlement dashboards or financial accounting systems.
- Defining the full booking reservation engine beyond the integration points needed to finalize or release reservations.
- Supporting additional providers beyond VNPAY and MoMo in this change.

## Decisions

### Decision 1: Provider Adapter Interface

VNPAY and MoMo integrations SHALL implement a shared provider adapter interface for creating payment requests, verifying callbacks, mapping statuses, and querying transaction status. Provider-specific fields remain encapsulated in adapter modules, while payment state transitions use normalized internal statuses.

Alternatives considered:
- **Provider logic embedded in checkout controller**: Faster to start, but makes signatures, retries, and status mapping difficult to test.
- **Separate service per provider**: Clean isolation, but heavier than needed for two providers.
- **Shared adapter interface**: Chosen because it keeps provider details testable while preserving one payment lifecycle.

### Decision 2: Idempotency at Payment Creation and Finalization

Every payment creation request SHALL include an idempotency key scoped to user, reservation, amount, currency, and provider. The service stores request fingerprint and response outcome so duplicates return the original result or current pending state. Booking finalization also uses a durable uniqueness constraint on reservation ID and successful provider transaction ID.

Alternatives considered:
- **Client-side duplicate prevention**: Insufficient because retries, refreshes, network timeouts, and direct API calls can duplicate requests.
- **Provider transaction IDs only**: Too late for duplicate create attempts before a provider reference exists.
- **Idempotency records plus database constraints**: Chosen for end-to-end duplicate prevention.

### Decision 3: Verified Webhooks as the Source of Settlement Truth

Redirect returns SHALL update the user-facing state only after signature verification, but final payment success SHOULD be confirmed by verified webhook/IPN or provider status query when callback ordering is uncertain. Webhook processing is idempotent and records raw event metadata with sensitive values redacted.

Alternatives considered:
- **Trust browser redirect return**: Unsafe because redirects can be tampered with or skipped.
- **Trust webhook only and ignore returns**: Secure but poor user experience after redirect.
- **Verified returns plus webhook/status confirmation**: Chosen to balance UX and settlement correctness.

### Decision 4: Timeout Worker Coordinates with Reservation Expiration

Payment attempts SHALL have explicit `expires_at` timestamps derived from reservation TTL and provider constraints. A timeout worker marks unpaid attempts expired and calls booking reservation release when the reservation is still pending. Late successful webhooks are handled through a conflict path that prevents duplicate ticket issuance and flags the payment for review if the reservation is no longer valid.

Alternatives considered:
- **Let providers time out naturally**: Leaves reservations stuck and clients confused.
- **Expire only in booking service**: Payment attempts remain ambiguous.
- **Payment timeout worker with booking coordination**: Chosen because payment and reservation states both need terminal outcomes.

### Decision 5: Bounded Retries and Circuit Breakers

Provider calls SHALL use classified retry policies: retry network timeouts and transient 5xx responses with exponential backoff, but do not retry validation errors, signature failures, or confirmed provider declines. Each provider has an independent circuit breaker that opens after configured failure thresholds and returns graceful degraded states.

Alternatives considered:
- **Retry all failures**: Risks duplicate or harmful provider calls.
- **No retries**: Causes avoidable checkout failures during brief network instability.
- **Classified retries plus circuit breakers**: Chosen for resilience without unsafe repetition.

## Risks / Trade-offs

- **[Risk] Provider callback ordering differs between VNPAY and MoMo** -> Mitigation: webhook processing is idempotent, returns are verified, and provider status query can reconcile pending attempts.
- **[Risk] Late success arrives after reservation expiration** -> Mitigation: prevent booking finalization when reservation is invalid and mark the payment for review or configured remediation.
- **[Risk] Circuit breaker blocks a provider during a partial outage** -> Mitigation: breakers are per provider, expose retry-after metadata, and allow alternate provider selection when available.
- **[Risk] Signature verification bugs can reject valid payments** -> Mitigation: add provider fixture tests, sandbox contract tests, and operational logging with sensitive data redacted.
- **[Risk] Duplicate webhook delivery creates repeated state transitions** -> Mitigation: store provider event IDs or derived event hashes and process each verified event idempotently.

## Migration Plan

1. Add payment tables for attempts, idempotency records, provider transactions, webhook events, and normalized payment states.
2. Implement provider adapter configuration for VNPAY and MoMo sandbox credentials.
3. Add payment creation endpoints behind feature flags and require idempotency keys.
4. Add verified return and webhook/IPN endpoints for both providers.
5. Add timeout worker, retry policies, circuit breakers, and graceful degraded responses.
6. Integrate successful payment finalization with booking reservation completion.
7. Enable provider flows in sandbox, then production by provider and event.
8. Roll back by disabling provider feature flags for new payment creation while continuing to process verified callbacks for in-flight attempts.

## Open Questions

- What are the production reservation/payment timeout values for VNPAY and MoMo checkout windows?
- Should users be allowed to switch providers for the same reservation after a provider circuit opens?
- What manual review workflow should handle late successful payments after reservation expiration?
