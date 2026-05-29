## Context

The admin dashboard serves organizers managing high-profile concerts while public sales are ongoing. Admin workloads must be secured with strict RBAC and isolated from the primary transactional database to avoid performance impact during peak traffic.

## Goals / Non-Goals

**Goals:**
- Provide secure Organizer-only access for concert CRUD, ticket configuration, and revenue analytics.
- Isolate analytics and reporting from the primary write database via CQRS, read replicas, or async aggregation.
- Support seating map uploads and AI artist bio generation triggers.
- Maintain immutable audit logs for configuration changes.

**Non-Goals:**
- Providing admin access to Audience or Ticket Checker roles.
- Real-time, strongly consistent analytics under peak load.
- Replacing existing public-facing ticketing flows.

## Decisions

- **Strict RBAC at every layer:** Enforce Organizer role checks at the gateway, API, and data access layers.
  - *Alternatives considered:* UI-only gating. Rejected due to insufficient security.
- **CQRS/analytics read model:** Use an async aggregation pipeline or read replica for revenue and real-time statistics.
  - *Alternatives considered:* Running analytics on primary DB. Rejected due to lock and performance risks.
- **Seating map ingestion pipeline:** Store SVG seating maps in object storage with validation and versioning.
  - *Alternatives considered:* Storing large SVG blobs in primary DB. Rejected due to size and performance concerns.
- **Audit log immutability:** Append-only audit log with signed entries to ensure traceability for ticket configuration changes.
  - *Alternatives considered:* Mutable audit records. Rejected due to compliance and integrity needs.
- **Async bio generation:** Trigger AI artist bio generation via background jobs with status tracking in the admin UI.
  - *Alternatives considered:* Inline synchronous generation. Rejected due to latency and failure isolation.

## Risks / Trade-offs

- **Risk:** Analytics lag behind real-time sales. → **Mitigation:** Low-latency event aggregation and refresh indicators.
- **Risk:** Overly restrictive RBAC blocks admins. → **Mitigation:** Role testing and emergency break-glass policy.
- **Risk:** Audit log growth increases storage costs. → **Mitigation:** Retention policies with archival storage.
- **Risk:** SVG uploads introduce security issues. → **Mitigation:** Sanitization and MIME validation.

## Migration Plan

1. Add RBAC middleware and Organizer role enforcement.
2. Deploy analytics read model or read replica infrastructure.
3. Implement concert CRUD, ticket configuration, and audit logging endpoints.
4. Add seating map upload pipeline and AI bio generation jobs.
5. Enable admin UI modules behind feature flags, then roll out to organizers.
6. Rollback: disable admin UI flags and API routes; retain audit data.

## Open Questions

- Final analytics strategy: CQRS pipeline versus read replica.
- Latency targets for revenue dashboard updates.
- Audit log retention period and compliance requirements.
