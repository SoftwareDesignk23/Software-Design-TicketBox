## ADDED Requirements

### Requirement: Organizer-only RBAC
The system SHALL allow only authenticated users with the Organizer role to access admin dashboard features, including concert management and revenue analytics.

#### Scenario: Organizer access
- **WHEN** an Organizer requests the admin dashboard
- **THEN** access is granted to management and analytics features

#### Scenario: Non-organizer access
- **WHEN** a non-Organizer user requests the admin dashboard
- **THEN** access is denied

### Requirement: Concert lifecycle management
The system SHALL allow Organizers to create, update, and cancel concerts, including uploading SVG seating maps and triggering AI artist bio generation.

#### Scenario: Create concert
- **WHEN** an Organizer submits a new concert with a seating map
- **THEN** the system creates the concert and stores the seating map

#### Scenario: Trigger bio generation
- **WHEN** an Organizer requests artist bio generation
- **THEN** the system enqueues the AI bio generation job and shows status

### Requirement: Granular ticket configuration
The system SHALL allow Organizers to define ticket categories, pricing, quantities, sale start times, and per-user purchase limits.

#### Scenario: Configure ticket categories
- **WHEN** an Organizer defines ticket categories and limits
- **THEN** the system persists the configuration and enforces the limits on sales

### Requirement: Asynchronous analytics and CQRS
The system SHALL serve real-time statistics and revenue dashboards from a read-optimized model that does not query the primary write database.

#### Scenario: Analytics query
- **WHEN** the admin dashboard requests revenue statistics
- **THEN** the system responds from the read model or replica without hitting the primary write database

### Requirement: Configuration audit trail
The system SHALL record immutable audit logs for all administrative actions affecting ticket quantities, pricing, and release times.

#### Scenario: Ticket configuration change
- **WHEN** an Organizer updates ticket pricing or quantities
- **THEN** the system writes an immutable audit entry with before/after values
