## ADDED Requirements

### Requirement: Text Normalization
The system SHALL normalize extracted PDF text before AI processing by standardizing whitespace, line breaks, punctuation spacing, and page-boundary artifacts.

#### Scenario: Extracted text contains irregular spacing
- **WHEN** extracted text includes repeated whitespace, broken line wraps, or page separators
- **THEN** the system SHALL produce cleaned text with normalized readable formatting

### Requirement: Noise Removal
The system SHALL remove configurable boilerplate and noisy sections that are not useful for artist bio generation.

#### Scenario: Press kit footer repeated
- **WHEN** extracted text contains repeated page footers or headers
- **THEN** the system SHALL remove or de-emphasize repeated noise before AI summarization

### Requirement: Text Deduplication
The system SHALL detect and reduce duplicate paragraphs or repeated sections before AI processing.

#### Scenario: Duplicate biography section
- **WHEN** extracted text contains the same paragraph multiple times
- **THEN** the system SHALL keep one useful copy in the cleaned artifact

### Requirement: AI Input Bounds
The system SHALL enforce configured character, token, and chunk limits before sending cleaned text to the AI provider.

#### Scenario: Cleaned text exceeds AI input limit
- **WHEN** cleaned text exceeds the configured AI input limit
- **THEN** the system SHALL chunk or summarize the input according to the configured strategy and record truncation or chunking metadata

### Requirement: Cleaned Artifact Persistence
The system SHALL persist cleaned text artifacts with links to the extraction artifact and generation job.

#### Scenario: Cleaning succeeds
- **WHEN** text cleaning completes successfully
- **THEN** the system SHALL persist the cleaned artifact and make it available to the AI generation step
