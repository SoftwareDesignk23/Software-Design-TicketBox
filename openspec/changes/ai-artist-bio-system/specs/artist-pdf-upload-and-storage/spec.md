## ADDED Requirements

### Requirement: Organizer PDF Upload
The system SHALL allow authorized organizers to upload PDF source material for events they are permitted to manage.

#### Scenario: Authorized organizer uploads PDF
- **WHEN** an authorized organizer uploads a valid PDF for one of their events
- **THEN** the system SHALL store the file, create upload metadata, and create an artist bio processing job

#### Scenario: Unauthorized organizer uploads PDF
- **WHEN** an organizer attempts to upload a PDF for an event they are not permitted to manage
- **THEN** the system SHALL reject the upload without storing the file

### Requirement: PDF File Validation
The system SHALL validate uploaded files for PDF content type, configured maximum size, and supported file structure before accepting them for processing.

#### Scenario: Non-PDF file uploaded
- **WHEN** a user uploads a file that is not a supported PDF
- **THEN** the system SHALL reject the upload with a validation error and SHALL NOT create a processing job

#### Scenario: Oversized PDF uploaded
- **WHEN** a user uploads a PDF larger than the configured maximum size
- **THEN** the system SHALL reject the upload with a size validation error

### Requirement: Secure File Storage
The system SHALL store uploaded PDFs in configured file or object storage with access scoped to authorized backend and organizer workflows.

#### Scenario: PDF stored successfully
- **WHEN** a valid PDF upload is accepted
- **THEN** the system SHALL persist storage location, checksum, file size, original filename, uploader, event ID, and upload timestamp

### Requirement: File Lifecycle Tracking
The system SHALL track uploaded PDF lifecycle states including uploaded, processing, processed, failed, cancelled, and deleted.

#### Scenario: Upload processing starts
- **WHEN** a background job starts processing an uploaded PDF
- **THEN** the system SHALL mark the upload as processing and retain the source file metadata
