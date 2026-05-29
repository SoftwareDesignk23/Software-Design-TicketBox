## Context

TicketBox currently has separate web, admin-dashboard, mobile-checkin, and NestJS backend apps, with user-facing flows still largely demo/mock oriented. This change establishes the shared security contract needed before booking, organizer, admin, and mobile gate workflows can be trusted.

The backend must be the authorization source of truth. Client-side route protection improves UX, but API guards must reject unauthorized requests even when clients are bypassed or stale.

## Goals / Non-Goals

**Goals:**
- Authenticate users with short-lived JWT access tokens and refresh-token rotation.
- Persist refresh sessions in a revocable, hashed form.
- Support `AUDIENCE`, `ORGANIZER`, `CHECK_IN_STAFF`, and `ADMIN` roles.
- Enforce reusable authorization checks in backend middleware/guards.
- Protect admin, organizer, and mobile check-in operations with role and event-scope validation.
- Return consistent `401 Unauthorized` and `403 Forbidden` responses for all clients.

**Non-Goals:**
- Third-party OAuth/social login.
- Full user self-service account management beyond login/logout/refresh.
- Fine-grained billing/payment permissions.
- Enterprise SSO, MFA, or passwordless login.
- Offline ticket QR signature verification, except where mobile permission validation gates scan/sync API access.

## Decisions

### Use short-lived JWT access tokens plus rotated refresh tokens

Access tokens will contain only stable authorization claims: subject, role, token version/session id, issued-at, expiry, issuer, and audience. Refresh tokens will be opaque random secrets stored only as hashes server-side and rotated on every refresh.

Alternatives considered:
- Long-lived JWT-only sessions: simpler, but hard to revoke and risky for mobile devices.
- Server-only sessions: easier revocation, but less portable across web/admin/mobile clients and APIs.

### Keep role names explicit and normalized

Roles will be represented as `AUDIENCE`, `ORGANIZER`, `CHECK_IN_STAFF`, and `ADMIN`. `CHECK_IN_STAFF` is intentionally distinct from generic `STAFF` so gate permissions do not accidentally include unrelated operational staff.

Alternatives considered:
- Use `STAFF`: shorter, but ambiguous once more staff functions exist.
- Use numeric role ids in tokens: compact, but less readable and easier to misconfigure across clients.

### Enforce RBAC with NestJS decorators and guards

Backend endpoints will use metadata decorators such as required roles and, where needed, permission resolvers for event-scoped access. A JWT auth guard will authenticate the request first; a roles/permissions guard will then enforce route requirements.

Alternatives considered:
- Per-controller manual checks: flexible, but duplicated and easy to miss.
- API gateway-only authorization: useful later, but the service must still protect itself.

### Model event-scoped permissions for organizers and check-in staff

Global role is not enough for event operations. Organizer and check-in staff actions must also verify assignment to the requested event. Admins may bypass event assignment only for admin-approved routes.

Alternatives considered:
- Give all organizers access to all organizer endpoints: simple, but leaks event management.
- Encode all event ids in JWTs: avoids DB lookups, but tokens become stale when assignments change.

### Treat client route protection as advisory

Web, admin, and mobile apps will keep auth state, redirect unauthenticated users, and hide unauthorized surfaces. These checks do not replace API authorization.

Alternatives considered:
- Client-only route protection during early development: quick, but creates false confidence and security gaps.

## Risks / Trade-offs

- Refresh token theft -> Hash stored refresh tokens, rotate on use, revoke token family on reuse detection, and prefer secure storage per client platform.
- Stale permissions after role or event assignment changes -> Keep access token TTL short and perform event-scope checks server-side.
- Excess guard complexity -> Centralize decorators, claims parsing, and error formatting in one auth module.
- Mobile device clock skew -> Validate tokens server-side for API calls and allow a small leeway for expiry checks where appropriate.
- Admin lockout during seed/migration -> Provide a documented admin bootstrap/seed path and rollback procedure.

## Migration Plan

1. Add auth dependencies, configuration, and environment validation for JWT issuer/audience/secrets.
2. Add user, role, refresh session, and event assignment persistence.
3. Implement login, refresh, logout, and current-user endpoints.
4. Add JWT auth guard, roles guard, and event-permission validation helpers.
5. Apply guards to admin, organizer, audience, and mobile check-in API routes as those routes are introduced.
6. Update web/admin/mobile clients to store session state and handle `401`/`403` responses.
7. Rollback by removing guarded-route wiring and disabling auth module registration while preserving schema migrations for later cleanup.

## Open Questions

- Should `ADMIN` be allowed to perform organizer actions directly, or only through admin-specific endpoints?
- What password policy and account bootstrap process should be used for the first admin?
- Which storage adapter will be used for refresh sessions in the first implementation: database only, Redis only, or database plus Redis cache?
