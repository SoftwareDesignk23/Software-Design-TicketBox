## 1. Payment Foundation

- [ ] 1.1 Add payment module structure with provider adapter interfaces, normalized payment states, and shared payment errors
- [ ] 1.2 Add configuration validation for VNPAY and MoMo credentials, callback URLs, timeout values, retry budgets, and circuit breaker thresholds
- [ ] 1.3 Add payment, payment attempt, provider transaction, webhook event, and idempotency persistence models or adapters
- [ ] 1.4 Add database uniqueness constraints for idempotency keys, provider transaction references, reservation finalization, and webhook event deduplication
- [ ] 1.5 Add sensitive payment data redaction utilities for logs and audit records

## 2. Provider Integrations

- [ ] 2.1 Implement VNPAY adapter for signed payment URL creation, return verification, status mapping, and amount/reference validation
- [ ] 2.2 Implement MoMo adapter for signed payment request creation, redirect/deeplink payload handling, IPN verification, and status mapping
- [ ] 2.3 Add payment creation API that validates reservations, requires idempotency keys, and delegates to the selected provider adapter
- [ ] 2.4 Add return handling endpoints for VNPAY and MoMo that verify provider data and expose normalized user-facing payment state
- [ ] 2.5 Add provider status query helpers for pending or uncertain payment attempts

## 3. Idempotency and Duplicate Prevention

- [ ] 3.1 Implement idempotency middleware or service that stores request fingerprints and cached outcomes for payment creation
- [ ] 3.2 Reject reused idempotency keys when the request fingerprint differs from the original request
- [ ] 3.3 Ensure duplicate payment creation requests return the existing attempt without creating a second provider transaction
- [ ] 3.4 Implement exactly-once booking finalization using transactional state checks and durable uniqueness constraints
- [ ] 3.5 Handle duplicate successful provider events without issuing duplicate tickets

## 4. Webhooks and Security

- [ ] 4.1 Implement VNPAY webhook/IPN processing with signature verification, amount/reference checks, idempotent event handling, and audit logging
- [ ] 4.2 Implement MoMo IPN processing with signature verification, amount/reference checks, idempotent event handling, and audit logging
- [ ] 4.3 Add replay protection using provider event IDs, transaction references, or derived event hashes
- [ ] 4.4 Add freshness validation or quarantine behavior for stale provider events where provider payloads include timestamps
- [ ] 4.5 Ensure rejected webhooks never mutate payment or booking state

## 5. Resilience, Timeouts, and Degradation

- [ ] 5.1 Implement payment timeout worker that expires unpaid attempts and coordinates reservation release
- [ ] 5.2 Implement late-success handling that prevents automatic ticket issuance after payment or reservation expiration
- [ ] 5.3 Add classified retry policies for transient provider failures with bounded exponential backoff
- [ ] 5.4 Add independent circuit breakers for VNPAY and MoMo payment creation, status query, and webhook-dependent provider calls
- [ ] 5.5 Add graceful degraded responses for provider unavailable, delayed confirmation, pending settlement, retryable failure, and alternate-provider options
- [ ] 5.6 Add metrics and alerts for provider failures, circuit states, timeout counts, duplicate events, webhook verification failures, and manual-review cases

## 6. Client and Booking Integration

- [ ] 6.1 Integrate successful verified payments with booking reservation completion
- [ ] 6.2 Integrate failed, cancelled, or expired payments with booking reservation release rules
- [ ] 6.3 Update web checkout flow to handle VNPAY redirect URLs and MoMo redirect/deeplink payloads
- [ ] 6.4 Update checkout UI state handling for pending, paid, failed, expired, provider unavailable, and requires-review outcomes
- [ ] 6.5 Add client behavior for retrying safely with the same idempotency key where appropriate

## 7. Verification

- [ ] 7.1 Add provider adapter unit tests using VNPAY and MoMo signed fixture payloads
- [ ] 7.2 Add payment creation idempotency tests for duplicate requests and conflicting idempotency payloads
- [ ] 7.3 Add webhook verification tests for valid signatures, invalid signatures, replayed events, stale events, amount mismatches, and duplicate delivery
- [ ] 7.4 Add timeout and late-success tests that prove expired reservations do not issue tickets automatically
- [ ] 7.5 Add retry and circuit breaker tests for transient failures, non-retryable declines, open circuits, and half-open recovery
- [ ] 7.6 Add integration tests proving successful VNPAY and MoMo payments finalize bookings exactly once
- [ ] 7.7 Run affected backend and checkout client test/lint commands and document any skipped checks
