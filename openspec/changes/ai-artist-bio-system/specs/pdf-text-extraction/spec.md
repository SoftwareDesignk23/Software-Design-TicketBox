## ADDED Requirements

### Requirement: PDF Text Extraction
The system SHALL extract text from accepted PDF uploads before AI generation begins.

#### Scenario: Text PDF extracted
- **WHEN** a processing worker receives a text-based PDF
- **THEN** the system SHALL extract the text content and persist the extraction artifact linked to the upload

#### Scenario: PDF extraction fails
- **WHEN** text extraction fails due to a corrupt or unsupported PDF
- **THEN** the system SHALL mark extraction failed with a clear failure reason and SHALL NOT call the AI generation step

### Requirement: Extraction Quality Reporting
The system SHALL record extraction quality metadata such as character count, page count when available, empty page count when available, and low-text warnings.

#### Scenario: Low-text PDF extracted
- **WHEN** a PDF extraction produces less text than the configured minimum useful threshold
- **THEN** the system SHALL flag the extraction as low quality and expose the warning in job status

### Requirement: Extraction Artifact Persistence
The system SHALL persist extracted text separately from the original upload for inspection, retry, and downstream cleaning.

#### Scenario: Extraction succeeds
- **WHEN** PDF text extraction succeeds
- **THEN** the system SHALL store the extracted text artifact with upload ID, job ID, checksum, and extraction metadata

### Requirement: No AI Call Without Extracted Text
The system SHALL block AI summarization when no usable extracted text is available.

#### Scenario: Empty extraction result
- **WHEN** extraction produces no usable text
- **THEN** the system SHALL mark the job failed or needs-review and SHALL NOT submit an empty prompt to the AI provider
