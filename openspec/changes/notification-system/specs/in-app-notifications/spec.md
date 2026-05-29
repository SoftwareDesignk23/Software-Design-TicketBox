## ADDED Requirements

### Requirement: In-App Notification Creation
The system SHALL create persisted in-app notifications for eligible recipients when notification jobs target the in-app channel.

#### Scenario: Booking confirmation notification
- **WHEN** a booking confirmation event is routed to the in-app channel for a user
- **THEN** the system SHALL create an in-app notification with recipient, type, title, body, metadata, unread state, and creation timestamp

### Requirement: In-App Notification Retrieval
The system SHALL expose recipient-scoped APIs for retrieving in-app notifications and unread counts.

#### Scenario: User loads notification list
- **WHEN** an authenticated user requests their notification list
- **THEN** the system SHALL return only notifications addressed to that user ordered by newest first

#### Scenario: User loads unread count
- **WHEN** an authenticated user requests their unread notification count
- **THEN** the system SHALL return the number of unread notifications addressed to that user

### Requirement: In-App Read State
The system SHALL allow recipients to mark in-app notifications as read without affecting other recipients.

#### Scenario: User marks notification read
- **WHEN** a recipient marks one of their unread notifications as read
- **THEN** the system SHALL update that notification to read state and reduce the recipient's unread count

### Requirement: In-App Recipient Isolation
The system SHALL prevent users from reading or modifying notifications that do not belong to them.

#### Scenario: User accesses another recipient notification
- **WHEN** a user attempts to read or modify another user's notification
- **THEN** the system SHALL reject the request with a forbidden response
