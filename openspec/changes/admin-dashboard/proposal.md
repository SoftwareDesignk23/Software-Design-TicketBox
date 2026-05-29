## Why

Organizers need a secure internal dashboard to manage concert lifecycles and revenue while public ticket sales are under heavy load. The admin workload must be isolated from the primary transactional database to avoid performance and locking impact.

## What Changes

- Add an RBAC-protected admin portal restricted to Organizer role for concert management and analytics.
- Provide concert CRUD, seating map uploads, and AI artist bio generation triggers.
- Add granular ticket configuration for categories, pricing, inventory, sale timing, and per-user limits.
- Serve revenue and real-time stats from read-optimized pipelines (CQRS, read replicas, or async aggregation).
- Maintain immutable audit logs of all admin actions that change ticket configuration.

## Capabilities

### New Capabilities
- `admin-dashboard`: Secure organizer dashboard with concert management, ticket configuration, analytics, and audit logging.

### Modified Capabilities
- None.

## Impact

- New admin UI surface and backend endpoints with strict RBAC.
- Analytics read model or replica to prevent load on primary database.
- New audit logging storage and compliance considerations.
