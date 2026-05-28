## 1. Backend Auth Foundation

- [ ] 1.1 Add backend auth dependencies for JWT signing/verification, password hashing, configuration validation, and secure token generation
- [ ] 1.2 Create AuthModule structure with controllers, services, guards, decorators, and test scaffolding
- [ ] 1.3 Add user, role, refresh session, and event assignment data models or persistence adapters
- [ ] 1.4 Add environment configuration for JWT issuer, audience, access token TTL, refresh token TTL, and signing secret/key material

## 2. Session Management

- [ ] 2.1 Implement credential validation and login endpoint returning access token, refresh token, expiry, and user profile
- [ ] 2.2 Implement refresh-token hashing, persistence, expiry validation, and session metadata
- [ ] 2.3 Implement refresh-token rotation with reuse detection and token-family revocation
- [ ] 2.4 Implement logout endpoint that revokes the active refresh session
- [ ] 2.5 Implement current-user endpoint that restores authenticated user identity, role, and assignment summary

## 3. API Authorization

- [ ] 3.1 Implement JWT authentication guard/middleware that validates token signature, issuer, audience, expiry, and subject
- [ ] 3.2 Implement role metadata decorator and roles guard for `AUDIENCE`, `ORGANIZER`, `CHECK_IN_STAFF`, and `ADMIN`
- [ ] 3.3 Implement event-scoped permission checks for organizer and check-in staff assignments
- [ ] 3.4 Standardize `401 Unauthorized` and `403 Forbidden` error responses with stable error codes
- [ ] 3.5 Apply auth/role guards to representative audience, organizer, admin, and mobile check-in API routes

## 4. Client Integration

- [ ] 4.1 Add shared client auth service utilities for login, refresh, logout, current user, and authorization error handling
- [ ] 4.2 Update web app auth state so audience flows can restore sessions and react to `401`/`403`
- [ ] 4.3 Protect admin dashboard routes so anonymous users are redirected and non-admin users see forbidden state
- [ ] 4.4 Update mobile check-in app session handling so scan/sync actions require authenticated `CHECK_IN_STAFF` identity

## 5. Verification

- [ ] 5.1 Add backend unit tests for JWT validation, refresh rotation, logout revocation, and refresh-token reuse detection
- [ ] 5.2 Add backend authorization tests for allowed and forbidden role combinations
- [ ] 5.3 Add tests for organizer and check-in staff event assignment validation
- [ ] 5.4 Add client route/auth-state tests for admin protection and mobile permission failure handling
- [ ] 5.5 Run backend and affected UI test/lint commands and document any skipped checks
