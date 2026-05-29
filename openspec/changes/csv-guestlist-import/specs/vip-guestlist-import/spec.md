## ADDED Requirements

### Requirement: Scheduled and manual import triggers
The system SHALL support scheduled detection of nightly CSV drops and manual CSV uploads from the Admin portal, creating an import job for each file.

#### Scenario: Scheduled nightly drop
- **WHEN** a new CSV file is detected in the configured nightly drop location
- **THEN** the system creates an import job and enqueues it for background processing

#### Scenario: Manual upload
- **WHEN** an admin uploads a CSV file in the Admin portal
- **THEN** the system creates an import job and enqueues it for background processing

### Requirement: Asynchronous batch processing
The system SHALL process VIP guest list imports asynchronously via background workers, splitting each file into batches of configurable size.

#### Scenario: Worker processes batch
- **WHEN** a worker receives an import job
- **THEN** it processes rows in batches and persists progress per batch

### Requirement: Row validation and isolation
The system SHALL validate each row for required fields and data formats, isolating invalid rows without stopping the import.

#### Scenario: Invalid row encountered
- **WHEN** a row is missing required data or has malformed values
- **THEN** the system records the row error and continues processing remaining rows

### Requirement: Idempotent duplicate handling
The system SHALL ensure idempotent processing by detecting duplicates within the file and against existing VIP records using a deterministic idempotency key.

#### Scenario: Duplicate row within file
- **WHEN** a row has the same idempotency key as a prior row in the same file
- **THEN** the system skips or updates the record without creating a duplicate

#### Scenario: Duplicate row across imports
- **WHEN** a row matches an existing VIP record from a prior import
- **THEN** the system upserts the record without creating a duplicate

### Requirement: Partial failure handling
The system SHALL commit valid rows even when other rows in the same batch fail validation or persistence.

#### Scenario: Mixed valid and invalid rows in batch
- **WHEN** a batch contains both valid and invalid rows
- **THEN** valid rows are committed and invalid rows are recorded as errors

### Requirement: Import history and audit logging
The system SHALL maintain an import ledger with totals, successes, failures, timestamps, and per-row error reasons for each import job.

#### Scenario: Import job completion
- **WHEN** an import job finishes processing
- **THEN** the ledger records total rows, success count, failure count, and error details

### Requirement: Retry mechanisms
The system SHALL automatically retry transient database errors and allow admins to manually re-trigger processing for failed rows after correction.

#### Scenario: Transient database error
- **WHEN** a row fails due to a transient database error
- **THEN** the system retries the row according to a backoff policy

#### Scenario: Manual reprocess
- **WHEN** an admin requests reprocessing of failed rows
- **THEN** the system re-enqueues those rows using the same idempotency logic
