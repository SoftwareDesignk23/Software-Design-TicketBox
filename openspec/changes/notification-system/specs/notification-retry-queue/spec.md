## ADDED Requirements

### Requirement: Retryable Delivery Failure
The system SHALL retry transient notification delivery failures using backoff and jitter until the configured maximum attempt count is reached.

#### Scenario: Email provider temporary failure
- **WHEN** an email provider returns a retryable temporary failure
- **THEN** the system SHALL schedule the notification job for retry with an increased attempt count and future retry time

### Requirement: Non-Retryable Delivery Failure
The system SHALL stop retrying notification jobs that fail due to non-retryable validation, recipient, template, or provider errors.

#### Scenario: Invalid recipient email
- **WHEN** an email job fails because the recipient email address is invalid
- **THEN** the system SHALL mark the job failed without adding it to the retry queue

### Requirement: Dead-Letter Handling
The system SHALL move notification jobs to a dead-letter state after retry attempts are exhausted.

#### Scenario: Retry attempts exhausted
- **WHEN** a retryable notification job reaches the configured maximum attempts without successful delivery
- **THEN** the system SHALL move the job to dead-letter state with failure context for operational review

### Requirement: Delivery Attempt Audit
The system SHALL record every delivery attempt with attempt number, provider, response classification, timestamps, and final state.

#### Scenario: Delivery retried twice
- **WHEN** a notification job is attempted three total times
- **THEN** the system SHALL record all three attempts with their provider outcomes and retry decisions

### Requirement: Manual Replay Eligibility
The system SHALL preserve enough job metadata for authorized operators to replay eligible dead-lettered notifications.

#### Scenario: Operator replays dead-lettered job
- **WHEN** an authorized operator replays an eligible dead-lettered notification
- **THEN** the system SHALL create a new delivery attempt using the original notification metadata and record the replay action
