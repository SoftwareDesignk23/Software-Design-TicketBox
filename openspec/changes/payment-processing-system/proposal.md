## Why

TicketBox needs a resilient payment system that can process Vietnamese payment methods without duplicate charges, stuck reservations, or cascading failures when providers are slow or unavailable. This change defines provider integrations, timeout handling, idempotency, retry, circuit breaker, graceful degradation, and webhook verification contracts for production checkout.

## What Changes

- Add VNPAY payment creation, redirect/return handling, query validation, and settlement status mapping.
- Add MoMo payment creation, redirect/deeplink handling, IPN/webhook processing, and settlement status mapping.
- Require idempotency keys for payment creation and confirmation paths to prevent duplicate payment attempts.
- Add payment timeout handling that expires unpaid attempts and releases or marks associated reservations according to booking rules.
- Add retry strategy for transient provider and network failures with bounded attempts and safe retry classification.
- Add circuit breakers per provider to fail fast during provider instability and protect checkout resources.
- Add graceful degradation so users receive clear retry, alternate-provider, pending, or provider-unavailable states instead of ambiguous checkout failures.
- Add verified webhooks/IPNs using provider signatures, request freshness checks, replay protection, and stable event processing.
- Prevent duplicate payment records, duplicate provider requests, and duplicate booking finalization.

## Capabilities

### New Capabilities
- `vnpay-payment-integration`: Covers VNPAY payment request creation, signed redirect URLs, return handling, provider status mapping, and verification.
- `momo-payment-integration`: Covers MoMo payment request creation, redirect/deeplink handling, IPN/webhook handling, provider status mapping, and verification.
- `payment-idempotency-and-duplicates`: Covers idempotency keys, duplicate payment prevention, provider request deduplication, and exactly-once booking finalization.
- `payment-resilience-and-timeouts`: Covers payment timeout handling, retry strategy, circuit breakers, graceful degradation, and provider availability behavior.
- `payment-webhook-security`: Covers webhook/IPN signature verification, replay protection, request freshness, and idempotent event processing.

### Modified Capabilities
<!-- No modified capabilities; there are no archived baseline specs yet. -->

## Impact

- **Backend**: Adds payment provider adapters, payment APIs, webhook endpoints, idempotency middleware/storage, circuit breaker policies, timeout workers, and provider-specific tests.
- **Data Model**: Adds or updates payments, payment attempts, provider transactions, webhook events, idempotency records, timeout timestamps, and booking finalization links.
- **Infrastructure**: Requires provider credentials/secrets, callback URL configuration, secure webhook routing, observability for provider health, and scheduled timeout processing.
- **Clients**: Web checkout handles VNPAY redirects, MoMo redirects/deeplinks, pending states, retries, timeout messages, and provider-unavailable fallbacks.
- **Security**: Requires signature verification, secret rotation support, replay protection, sensitive data redaction, and auditable payment state transitions.
