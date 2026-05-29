## 1. Access Control and Audit Foundations

- [ ] 1.1 Add Organizer-only RBAC middleware for admin routes
- [ ] 1.2 Implement immutable audit log storage and schema
- [ ] 1.3 Add audit log writer for ticket configuration changes

## 2. Concert Management

- [ ] 2.1 Implement concert CRUD endpoints for Organizer role
- [ ] 2.2 Implement SVG seating map upload, validation, and storage
- [ ] 2.3 Implement AI artist bio generation trigger and job status tracking

## 3. Ticket Configuration

- [ ] 3.1 Add ticket category, pricing, and quantity configuration endpoints
- [ ] 3.2 Enforce sale start timestamps and per-user purchase limits
- [ ] 3.3 Add admin UI for ticket configuration workflows

## 4. Analytics Read Model

- [ ] 4.1 Implement CQRS/read-replica pipeline for revenue and stats
- [ ] 4.2 Add admin analytics endpoints backed by read model
- [ ] 4.3 Add dashboard UI for revenue and real-time statistics

## 5. Testing and Operations

- [ ] 5.1 Add RBAC and audit logging tests for admin actions
- [ ] 5.2 Add integration tests for analytics read model isolation
- [ ] 5.3 Add operational docs for admin roles, audit retention, and data flow
