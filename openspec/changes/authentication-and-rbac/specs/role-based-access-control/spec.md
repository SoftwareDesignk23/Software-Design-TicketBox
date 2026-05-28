## ADDED Requirements

### Requirement: Supported Roles
The system SHALL define and enforce the roles `AUDIENCE`, `ORGANIZER`, `CHECK_IN_STAFF`, and `ADMIN`.

#### Scenario: Role included in authenticated context
- **WHEN** a request is authenticated successfully
- **THEN** the system SHALL expose the user's normalized role to authorization middleware and route handlers

### Requirement: API Authorization Middleware
The system SHALL provide reusable API authorization middleware or guards that enforce authentication, required roles, and permission checks before protected handlers execute.

#### Scenario: Required role is allowed
- **WHEN** an authenticated user calls an endpoint requiring one of the user's roles
- **THEN** the system SHALL allow the handler to execute

#### Scenario: Required role is denied
- **WHEN** an authenticated user calls an endpoint that does not allow the user's role
- **THEN** the system SHALL reject the request with `403 Forbidden`

#### Scenario: Unauthenticated protected request denied
- **WHEN** an unauthenticated client calls an endpoint protected by authorization middleware
- **THEN** the system SHALL reject the request with `401 Unauthorized`

### Requirement: Audience Access
The system SHALL allow `AUDIENCE` users to access audience ticket browsing, reservation, checkout, profile, and owned-ticket workflows while blocking administrative, organizer, and check-in staff operations.

#### Scenario: Audience can access owned ticket flow
- **WHEN** an authenticated `AUDIENCE` user requests their own ticket or checkout workflow
- **THEN** the system SHALL authorize the request

#### Scenario: Audience blocked from organizer operation
- **WHEN** an authenticated `AUDIENCE` user requests an organizer event-management endpoint
- **THEN** the system SHALL reject the request with `403 Forbidden`

### Requirement: Organizer Event-Scoped Access
The system SHALL authorize `ORGANIZER` users for organizer operations only when the user is assigned to the target event or organization.

#### Scenario: Organizer accesses assigned event
- **WHEN** an authenticated `ORGANIZER` user requests an organizer endpoint for an event assigned to that user
- **THEN** the system SHALL authorize the request

#### Scenario: Organizer blocked from unassigned event
- **WHEN** an authenticated `ORGANIZER` user requests an organizer endpoint for an event not assigned to that user
- **THEN** the system SHALL reject the request with `403 Forbidden`

### Requirement: Check-In Staff Mobile Permission Validation
The system SHALL authorize mobile check-in scan and sync actions only for authenticated `CHECK_IN_STAFF` users assigned to the target event.

#### Scenario: Check-in staff can scan assigned event
- **WHEN** an authenticated `CHECK_IN_STAFF` user submits a scan or sync request for an assigned event
- **THEN** the system SHALL authorize the request and include the staff user id in the scan audit context

#### Scenario: Check-in staff blocked from unassigned event
- **WHEN** an authenticated `CHECK_IN_STAFF` user submits a scan or sync request for an unassigned event
- **THEN** the system SHALL reject the request with `403 Forbidden`

#### Scenario: Non-staff blocked from mobile check-in
- **WHEN** an authenticated user without the `CHECK_IN_STAFF` role submits a mobile check-in scan or sync request
- **THEN** the system SHALL reject the request with `403 Forbidden`

### Requirement: Admin Route Protection
The system SHALL protect admin dashboard routes and admin APIs so only authenticated `ADMIN` users can access admin-only capabilities.

#### Scenario: Admin can access admin route
- **WHEN** an authenticated `ADMIN` user opens an admin dashboard route or calls an admin API endpoint
- **THEN** the system SHALL authorize the request

#### Scenario: Non-admin blocked from admin route
- **WHEN** an authenticated non-admin user opens an admin dashboard route or calls an admin API endpoint
- **THEN** the system SHALL deny access and the client SHALL show an unauthorized or forbidden state

#### Scenario: Anonymous user redirected from admin route
- **WHEN** an unauthenticated user opens an admin dashboard route
- **THEN** the admin client SHALL redirect the user to login or display a sign-in-required state

### Requirement: Consistent Authorization Errors
The system SHALL return consistent authorization errors that clients can handle across web, admin, and mobile apps.

#### Scenario: Unauthorized response shape
- **WHEN** a protected API request fails because authentication is missing or invalid
- **THEN** the system SHALL return `401 Unauthorized` with a stable error code indicating authentication is required

#### Scenario: Forbidden response shape
- **WHEN** a protected API request fails because the authenticated user lacks a required role or permission
- **THEN** the system SHALL return `403 Forbidden` with a stable error code indicating insufficient permissions
