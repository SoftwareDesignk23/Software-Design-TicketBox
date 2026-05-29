## Why

TicketBox organizers need a fast, repeatable way to turn artist press kits and media PDFs into polished event-page biographies without manual copywriting. This change defines the upload, extraction, cleaning, AI generation, storage, and background processing contract needed to make artist bio generation reliable and auditable.

## What Changes

- Add organizer PDF upload for artist press releases, media kits, and source materials.
- Add secure file storage for uploaded PDFs and generated processing artifacts.
- Extract text from PDF files and report extraction quality or failure reasons.
- Clean extracted text by removing noise, normalizing whitespace, deduplicating repeated sections, and enforcing input limits.
- Generate structured artist bios with AI summarization and organizer-reviewable output.
- Process extraction and AI generation asynchronously through background jobs.
- Track job status, retries, errors, source file metadata, and generated bio versions.
- Update event artist bio drafts without automatically publishing unreviewed AI output.

## Capabilities

### New Capabilities
- `artist-pdf-upload-and-storage`: Covers PDF upload validation, secure file storage, metadata, access control, and file lifecycle.
- `pdf-text-extraction`: Covers PDF text extraction, extraction quality reporting, unsupported PDF handling, and error outcomes.
- `artist-text-cleaning`: Covers text normalization, noise removal, deduplication, chunking, and input safety limits before AI processing.
- `ai-artist-bio-generation`: Covers AI summarization, structured artist bio generation, draft persistence, confidence/quality metadata, and organizer review.
- `artist-bio-background-jobs`: Covers asynchronous processing, job state, retries, cancellation, progress updates, and failure recovery.

### Modified Capabilities
<!-- No modified capabilities; there are no archived baseline specs yet. -->

## Impact

- **Backend**: Adds upload endpoints, file storage adapters, PDF extraction workers, AI generation workers, job APIs, and event bio draft persistence.
- **Admin Dashboard**: Adds organizer upload flow, job progress/status display, generated draft preview, error states, and review/publish controls.
- **Data Model**: Adds uploaded artist source files, extraction results, cleaned text artifacts, bio generation jobs, generated bio drafts, and audit metadata.
- **Infrastructure**: Requires object/file storage, background queue workers, PDF extraction dependency, AI provider configuration, and worker observability.
- **Security**: Requires file type/size validation, malware-safe storage posture, organizer event authorization, prompt/input safeguards, and sensitive data redaction in logs.
