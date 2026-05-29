## ADDED Requirements

### Requirement: AI Bio Draft Generation
The system SHALL generate a structured artist biography draft from cleaned source text using the configured AI provider.

#### Scenario: AI bio generated
- **WHEN** cleaned source text is available for an artist bio job
- **THEN** the system SHALL request AI summarization and persist a generated bio draft linked to the event, upload, and job

### Requirement: Structured Bio Output
The system SHALL validate AI output against a configured structure before saving it as a draft.

#### Scenario: AI returns valid structured bio
- **WHEN** the AI provider returns output matching the expected bio schema
- **THEN** the system SHALL save the draft with title or headline, short bio, long bio, highlights when available, and generation metadata

#### Scenario: AI returns invalid structure
- **WHEN** the AI provider returns output that does not match the expected bio schema
- **THEN** the system SHALL retry if configured or mark the generation failed with validation details

### Requirement: Organizer Review Before Publish
The system SHALL save generated bios as drafts and require organizer action before replacing public event bio content.

#### Scenario: Draft generated successfully
- **WHEN** AI generation succeeds
- **THEN** the system SHALL make the generated bio available for organizer review without automatically publishing it

### Requirement: Generation Metadata
The system SHALL record generation metadata including provider, model when available, prompt/template version, source artifact IDs, output version, and completion timestamp.

#### Scenario: Bio draft saved
- **WHEN** a generated bio draft is persisted
- **THEN** the system SHALL store the generation metadata needed for audit and troubleshooting

### Requirement: AI Failure Handling
The system SHALL expose clear generation failure states for provider errors, validation errors, safety rejections, and input limit failures.

#### Scenario: AI provider unavailable
- **WHEN** the AI provider is unavailable during generation
- **THEN** the system SHALL mark the job retryable or failed according to retry policy and expose the failure reason in job status
