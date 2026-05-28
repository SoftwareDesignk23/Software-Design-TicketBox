## ADDED Requirements

### Requirement: CSV Guest List Synchronization
The Admin Dashboard SHALL support uploading a CSV file containing event guest names, emails, and ticket types, and synchronizing it with the backend database.

#### Scenario: Successful CSV Synchronization
- **WHEN** an organizer uploads a valid CSV file of guests
- **THEN** the system SHALL parse the CSV, validate each record, insert the guest details as active tickets in the database, and issue free ticket JWTs to their emails

#### Scenario: Malformed CSV Error Handling
- **WHEN** an organizer uploads a CSV with missing email headers or invalid email formats
- **THEN** the system SHALL reject the upload, execute a transaction rollback, and return a report detailing the specific row errors

### Requirement: AI-Generated Artist Bio from PDF
The system SHALL support extracting text from an uploaded PDF file and utilizing an LLM integration to generate a structured artist biography for the event page.

#### Scenario: Successful AI Bio Generation
- **WHEN** an organizer uploads a valid PDF press release or media kit for an artist
- **THEN** the system SHALL extract the PDF text contents, run a background AI processing job to synthesize a structured biography, update the event's bio field in the database, and notify the organizer's admin panel via WebSockets
