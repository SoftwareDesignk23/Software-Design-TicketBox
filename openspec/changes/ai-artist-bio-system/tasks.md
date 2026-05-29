## 1. Data Model and Configuration

- [ ] 1.1 Add data models or persistence adapters for artist PDF uploads, extraction artifacts, cleaned text artifacts, bio generation jobs, generated drafts, and audit metadata
- [ ] 1.2 Add configuration validation for file size limits, allowed MIME types, storage backend, queue names, retry policy, AI provider credentials, and prompt/template versions
- [ ] 1.3 Add storage adapter abstraction for original PDFs and derived processing artifacts
- [ ] 1.4 Add organizer event authorization checks for upload, job status, retry, cancel, and draft review APIs
- [ ] 1.5 Add sensitive data redaction for upload metadata, extracted text snippets, AI prompts, and provider errors in logs

## 2. PDF Upload and Storage

- [ ] 2.1 Implement organizer PDF upload API that validates event access before accepting files
- [ ] 2.2 Validate PDF content type, file extension, maximum size, and supported file structure
- [ ] 2.3 Store accepted PDFs with checksum, original filename, file size, uploader, event ID, and upload timestamp
- [ ] 2.4 Create initial artist bio processing job after successful PDF storage
- [ ] 2.5 Track upload lifecycle states for uploaded, processing, processed, failed, cancelled, and deleted

## 3. Text Extraction and Cleaning

- [ ] 3.1 Implement PDF text extraction worker that persists extracted text artifacts and extraction metadata
- [ ] 3.2 Record extraction quality metadata including character count, page count when available, empty page count when available, and low-text warnings
- [ ] 3.3 Fail extraction with clear reasons for corrupt, unsupported, encrypted, or empty PDFs
- [ ] 3.4 Implement text cleaning for whitespace normalization, page-boundary cleanup, repeated header/footer removal, and duplicate paragraph reduction
- [ ] 3.5 Enforce AI input bounds through chunking, truncation, or staged summaries and record related metadata
- [ ] 3.6 Persist cleaned text artifacts linked to extraction artifacts and jobs

## 4. AI Bio Generation

- [ ] 4.1 Implement AI provider abstraction for structured artist bio generation from cleaned source text
- [ ] 4.2 Add prompt/template handling with expected output schema validation
- [ ] 4.3 Generate structured bio drafts with headline, short bio, long bio, highlights when available, and generation metadata
- [ ] 4.4 Persist generated drafts without automatically publishing them to public event content
- [ ] 4.5 Handle AI provider errors, schema validation failures, safety rejections, and input-limit failures with clear job status outcomes
- [ ] 4.6 Add organizer review and publish integration points for generated bio drafts

## 5. Background Job Processing

- [ ] 5.1 Implement asynchronous job pipeline stages for queued, extracting, cleaning, generating, completed, failed, retrying, and cancelled
- [ ] 5.2 Return job status metadata immediately after accepted uploads
- [ ] 5.3 Implement retry behavior for retryable extraction, storage, cleaning, and AI generation failures
- [ ] 5.4 Implement safe job cancellation for queued or cancellable in-progress jobs
- [ ] 5.5 Expose job status API with progress, warnings, failure reasons, and generated draft references
- [ ] 5.6 Add worker metrics for queue depth, processing duration, extraction failures, AI failures, retries, cancellations, and generated drafts

## 6. Admin Dashboard Integration

- [ ] 6.1 Add organizer upload UI for artist PDF source material
- [ ] 6.2 Add job progress and status display for queued, processing, completed, failed, retrying, and cancelled jobs
- [ ] 6.3 Add extraction warning and failure display for low-text, corrupt, unsupported, or empty PDFs
- [ ] 6.4 Add generated bio draft preview with source/upload metadata
- [ ] 6.5 Add organizer actions for retrying failed jobs, cancelling jobs, and publishing approved drafts where supported

## 7. Verification

- [ ] 7.1 Add upload validation tests for authorized organizer access, unauthorized access, non-PDF files, oversized PDFs, and successful storage
- [ ] 7.2 Add PDF extraction tests for text PDFs, corrupt PDFs, unsupported PDFs, empty extraction, and low-text warnings
- [ ] 7.3 Add text cleaning tests for whitespace normalization, repeated header/footer removal, deduplication, and input bound handling
- [ ] 7.4 Add AI generation tests for valid structured output, invalid schema output, provider failure, safety rejection, and draft persistence
- [ ] 7.5 Add background job tests for stage transitions, retry behavior, cancellation, failure recovery, and status API output
- [ ] 7.6 Add admin dashboard tests for upload flow, status display, error states, draft preview, and review actions
- [ ] 7.7 Run affected backend, worker, and admin client test/lint commands and document any skipped checks
