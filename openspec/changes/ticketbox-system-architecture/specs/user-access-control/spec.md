## ADDED Requirements

### Requirement: Role-Based Authorization
The system SHALL authorize access to application features and endpoints based on the authenticated user's role (AUDIENCE, ORGANIZER, or STAFF).

#### Scenario: Audience Accessing Event Booking
- **WHEN** an authenticated user with the AUDIENCE role requests to book a ticket
- **THEN** the system SHALL allow the request to proceed

#### Scenario: Audience Blocked from Admin Dashboard
- **WHEN** an authenticated user with the AUDIENCE role attempts to access an endpoint reserved for ORGANIZER roles (e.g., event setup)
- **THEN** the system SHALL reject the request with a 403 Forbidden error

#### Scenario: Staff Accessing Ticket Scan Endpoint
- **WHEN** an authenticated user with the STAFF role requests to execute a ticket scan check-in
- **THEN** the system SHALL authorize the operation and log the scanner's staff identifier
