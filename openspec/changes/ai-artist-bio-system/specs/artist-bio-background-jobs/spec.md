## ADDED Requirements

### Requirement: Asynchronous Processing Pipeline
The system SHALL process PDF extraction, text cleaning, and AI bio generation asynchronously after upload.

#### Scenario: Upload accepted
- **WHEN** a valid PDF upload is accepted
- **THEN** the system SHALL enqueue a background processing job and return job status metadata without waiting for extraction or AI generation to complete

### Requirement: Job State Tracking
The system SHALL track artist bio job states including queued, extracting, cleaning, generating, completed, failed, retrying, and cancelled.

#### Scenario: Job stage changes
- **WHEN** a worker starts a new processing stage
- **THEN** the system SHALL update the job state and progress metadata

### Requirement: Job Retry
The system SHALL retry retryable extraction, cleaning, storage, or AI generation failures according to configured retry policy.

#### Scenario: Retryable AI failure
- **WHEN** AI generation fails due to a transient provider error
- **THEN** the system SHALL schedule a retry without requiring another PDF upload

### Requirement: Job Cancellation
The system SHALL allow authorized organizers to cancel queued or in-progress artist bio jobs when cancellation is safe.

#### Scenario: Organizer cancels queued job
- **WHEN** an authorized organizer cancels a queued artist bio job
- **THEN** the system SHALL mark the job cancelled and prevent later processing stages from running

### Requirement: Job Status Visibility
The system SHALL expose job status, progress, warnings, failure reasons, and generated draft availability to authorized organizers.

#### Scenario: Organizer checks job status
- **WHEN** an authorized organizer requests artist bio job status
- **THEN** the system SHALL return current state, progress metadata, warnings, errors, and draft reference when available
