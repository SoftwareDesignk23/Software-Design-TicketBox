## Why

TicketBox needs enforceable authentication and authorization before protected booking, organizer, admin, and check-in workflows can safely move beyond mock/demo behavior. A shared JWT and RBAC contract prevents each client and API module from inventing its own access rules.

## What Changes

- Add JWT-based authentication with short-lived access tokens and refresh-token rotation.
- Define application roles for `AUDIENCE`, `ORGANIZER`, `CHECK_IN_STAFF`, and `ADMIN`.
- Protect admin and organizer routes from unauthorized users at both UI routing and API layers.
- Validate mobile check-in permissions before allowing staff devices to scan or sync event tickets.
- Add reusable API authorization middleware/guards that enforce authentication, role requirements, and event-scoped permissions.
- Standardize unauthorized/forbidden responses so web, admin, and mobile clients can handle auth failures consistently.

## Capabilities

### New Capabilities
- `authentication-and-session-management`: Covers login, JWT access tokens, refresh tokens, logout, token rotation, and session invalidation.
- `role-based-access-control`: Covers role definitions, route/API authorization, admin protection, organizer permissions, audience access, and mobile check-in staff validation.

### Modified Capabilities
<!-- No modified capabilities; this change introduces a dedicated auth and RBAC contract for implementation. -->

## Impact

- **Backend**: Adds auth modules, JWT signing/verification, refresh token persistence, authorization decorators/guards/middleware, and protected endpoint tests.
- **Web App**: Uses auth state for audience login/session handling and protected user flows.
- **Admin Dashboard**: Requires authenticated `ADMIN` or allowed organizer roles before rendering protected routes.
- **Mobile Check-In App**: Requires authenticated `CHECK_IN_STAFF` identity and event-scoped permission validation for scan/sync actions.
- **Data Model**: Adds or updates users, roles, refresh tokens/sessions, and staff event assignments.
- **Security**: Requires secret/key management, token expiry policies, refresh-token hashing, and consistent `401 Unauthorized` / `403 Forbidden` behavior.
