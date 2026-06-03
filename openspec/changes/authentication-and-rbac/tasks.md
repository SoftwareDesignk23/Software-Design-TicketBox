## 1. Backend Auth Foundation

- [x] 1.1 Add backend auth dependencies for JWT signing/verification, password hashing, configuration validation, and secure token generation
- [x] 1.2 Create AuthModule structure with controllers, services, guards, decorators, and test scaffolding
- [x] 1.3 Add user, role, refresh session, and event assignment data models or persistence adapters
- [x] 1.4 Add environment configuration for JWT issuer, audience, access token TTL, refresh token TTL, and signing secret/key material

## 2. Session Management

- [x] 2.1 Implement credential validation and login endpoint returning access token, refresh token, expiry, and user profile
- [x] 2.2 Implement refresh-token hashing, persistence, expiry validation, and session metadata
- [x] 2.3 Implement refresh-token rotation with reuse detection and token-family revocation
- [x] 2.4 Implement logout endpoint that revokes the active refresh session
- [x] 2.5 Implement current-user endpoint that restores authenticated user identity, role, and assignment summary

## 3. API Authorization

- [x] 3.1 Implement JWT authentication guard/middleware that validates token signature, issuer, audience, expiry, and subject
- [x] 3.2 Implement role metadata decorator and roles guard for `AUDIENCE`, `ORGANIZER`, `CHECK_IN_STAFF`, and `ADMIN`
- [x] 3.3 Implement event-scoped permission checks for organizer and check-in staff assignments
- [x] 3.4 Standardize `401 Unauthorized` and `403 Forbidden` error responses with stable error codes
- [x] 3.5 Apply auth/role guards to representative audience, organizer, admin, and mobile check-in API routes

## 4. Client Integration

- [x] 4.1 Add shared client auth service utilities for login, refresh, logout, current user, and authorization error handling
- [x] 4.2 Update web app auth state so audience flows can restore sessions and react to `401`/`403`
- [x] 4.3 Protect admin dashboard routes so anonymous users are redirected and non-admin users see forbidden state
- [x] 4.4 Update mobile check-in app session handling so scan/sync actions require authenticated `CHECK_IN_STAFF` identity

## 5. Verification

- [x] 5.1 Add backend unit tests for JWT validation, refresh rotation, logout revocation, and refresh-token reuse detection
- [x] 5.2 Add backend authorization tests for allowed and forbidden role combinations
- [x] 5.3 Add tests for organizer and check-in staff event assignment validation
- [ ] 5.4 Add client route/auth-state tests for admin protection and mobile permission failure handling
- [ ] 5.5 Run backend and affected UI test/lint commands and document any skipped checks
