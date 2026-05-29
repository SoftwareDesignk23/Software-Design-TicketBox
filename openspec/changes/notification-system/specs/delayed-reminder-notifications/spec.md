## ADDED Requirements

### Requirement: Scheduled Reminder Creation
The system SHALL create scheduled reminder jobs with due timestamps, recipient data, template keys, channel routing, and cancellation keys.

#### Scenario: Event reminder scheduled
- **WHEN** an event reminder is configured for 24 hours before event start
- **THEN** the system SHALL create scheduled reminder jobs due at the configured reminder time for eligible recipients

### Requirement: Delayed Reminder Dispatch
The system SHALL enqueue due reminder jobs into the normal notification delivery pipeline.

#### Scenario: Reminder becomes due
- **WHEN** a scheduled reminder reaches its due timestamp
- **THEN** the system SHALL enqueue notification jobs for configured channels and recipients

### Requirement: Reminder Cancellation
The system SHALL cancel scheduled reminders when their source event, booking, reservation, or payment state makes the reminder no longer valid.

#### Scenario: Reservation paid before reminder
- **WHEN** a payment reminder exists for a reservation that is completed before the reminder due time
- **THEN** the system SHALL cancel or skip the reminder before delivery

### Requirement: Reminder Eligibility Recheck
The system SHALL re-check reminder eligibility immediately before dispatch.

#### Scenario: Event cancelled before dispatch
- **WHEN** an event is cancelled after reminders were scheduled but before dispatch
- **THEN** the system SHALL skip the reminder and record the skip reason
