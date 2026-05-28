## ADDED Requirements

### Requirement: JWT Access Token Authentication
The system SHALL authenticate protected API requests using signed JWT access tokens with issuer, audience, subject, role, issued-at, and expiration claims.

#### Scenario: Valid access token accepted
- **WHEN** a client calls a protected API endpoint with a valid unexpired access token
- **THEN** the system SHALL authenticate the request and attach the authenticated user identity and role to the request context

#### Scenario: Missing access token rejected
- **WHEN** a client calls a protected API endpoint without an access token
- **THEN** the system SHALL reject the request with `401 Unauthorized`

#### Scenario: Invalid access token rejected
- **WHEN** a client calls a protected API endpoint with an expired, malformed, wrong-audience, wrong-issuer, or invalid-signature access token
- **THEN** the system SHALL reject the request with `401 Unauthorized`

### Requirement: Login Issues Token Pair
The system SHALL issue a short-lived JWT access token and a refresh token after successful credential validation.

#### Scenario: Successful login
- **WHEN** a user submits valid login credentials
- **THEN** the system SHALL return an access token, refresh token, access token expiry, and authenticated user profile including role

#### Scenario: Failed login
- **WHEN** a user submits invalid login credentials
- **THEN** the system SHALL reject the request with `401 Unauthorized` without revealing whether the account exists

### Requirement: Refresh Token Rotation
The system SHALL rotate refresh tokens whenever a client requests a new access token.

#### Scenario: Refresh succeeds
- **WHEN** a client submits a valid active refresh token
- **THEN** the system SHALL revoke the submitted refresh token and return a new access token and new refresh token

#### Scenario: Reused refresh token rejected
- **WHEN** a client submits a refresh token that was already rotated or revoked
- **THEN** the system SHALL reject the request with `401 Unauthorized` and revoke the affected refresh token family

### Requirement: Refresh Token Storage
The system SHALL store refresh tokens only as server-side hashes with session metadata.

#### Scenario: Refresh session persisted
- **WHEN** a refresh token is issued
- **THEN** the system SHALL persist a hashed token value with user id, session id or token family id, expiry, creation time, and revocation status

#### Scenario: Expired refresh token rejected
- **WHEN** a client submits an expired refresh token
- **THEN** the system SHALL reject the request with `401 Unauthorized`

### Requirement: Logout Revokes Session
The system SHALL allow an authenticated user to revoke the active refresh session during logout.

#### Scenario: Logout succeeds
- **WHEN** an authenticated user logs out with an active refresh session
- **THEN** the system SHALL revoke the refresh session and prevent that refresh token from issuing new access tokens

### Requirement: Current User Session
The system SHALL provide an authenticated current-user endpoint for clients to restore session state.

#### Scenario: Current user returned
- **WHEN** a client calls the current-user endpoint with a valid access token
- **THEN** the system SHALL return the authenticated user's id, display identity, role, and relevant assignment summary
