## Context

TicketBox organizers often have artist source material in PDF press kits, bios, and media releases. The system should transform those uploads into event-ready artist biography drafts without blocking the admin UI or forcing organizers to understand extraction and AI processing details.

The pipeline has several stages: upload and store PDF, extract text, clean and chunk text, generate a structured bio through an AI provider, persist the result as a draft, and notify or expose job status to the organizer. Each stage must be observable and retryable because PDF quality and AI provider availability vary.

## Goals / Non-Goals

**Goals:**
- Accept organizer PDF uploads for events they are authorized to manage.
- Store original PDFs and processing artifacts with metadata and lifecycle tracking.
- Extract text from uploaded PDFs and report extraction quality and failure reasons.
- Clean extracted text before AI processing by removing noise, normalizing content, and enforcing token/input limits.
- Generate structured artist biography drafts with AI summarization.
- Process extraction and generation through background jobs with status, retries, cancellation, and progress updates.
- Keep generated AI output as organizer-reviewable drafts before publication.

**Non-Goals:**
- Automatically publishing AI-generated bios without organizer review.
- Building a general-purpose document management system.
- Supporting every file type; this change is scoped to PDFs.
- Training or hosting a custom AI model.
- Guaranteeing perfect factual accuracy from source material without organizer verification.

## Decisions

### Decision 1: Store Original File and Derived Artifacts

The system SHALL store the original PDF plus metadata for extracted text, cleaned text, and generated bio drafts. Derived artifacts are linked to the upload and job so failures can be inspected and jobs can be retried without requiring another upload.

Alternatives considered:
- **Only store generated bio**: Minimal storage, but impossible to debug extraction and generation issues.
- **Only store PDF and recompute everything**: Saves derived storage but makes retries slower and less predictable.
- **Store original and derived artifacts**: Chosen for auditability, retry efficiency, and organizer trust.

### Decision 2: Background Job Pipeline

PDF extraction, cleaning, and AI generation SHALL run asynchronously after upload. The upload endpoint creates an upload record and job, then returns immediately with job status metadata.

Alternatives considered:
- **Synchronous processing during upload**: Simple UX for small PDFs, but risks request timeouts and poor admin responsiveness.
- **One monolithic worker step**: Easier to wire, but makes partial retries and diagnostics harder.
- **Stage-based background pipeline**: Chosen because each stage has distinct failure modes and retry rules.

### Decision 3: Clean and Bound Text Before AI Calls

Extracted text SHALL be cleaned, deduplicated, normalized, and chunked before AI summarization. The AI input must respect configured size limits and preserve source metadata needed for traceability.

Alternatives considered:
- **Send raw extracted text directly**: Fastest to build, but noisy PDFs can degrade output and exceed model limits.
- **Manual organizer editing before AI**: Useful later, but slows the first automation pass.
- **Automated cleaning before AI**: Chosen to improve output consistency while keeping review after generation.

### Decision 4: Generated Bios Are Drafts

AI-generated artist bios SHALL be saved as drafts requiring organizer review or explicit publish action before replacing public event content.

Alternatives considered:
- **Auto-publish generated bio**: Fast, but unsafe for hallucinations, wrong tone, or extracted source errors.
- **Discard output unless copied manually**: Safe, but poor workflow.
- **Persist reviewable drafts**: Chosen to balance productivity and editorial control.

### Decision 5: Provider-Agnostic AI Generation Boundary

The AI generation worker SHALL call an internal AI provider abstraction that accepts cleaned input and expected output schema. Provider details, model choice, retryability, and safety settings remain behind this boundary.

Alternatives considered:
- **Hard-code provider calls in job worker**: Direct, but difficult to swap providers or test safely.
- **Build full prompt orchestration framework now**: More flexible than needed.
- **Provider abstraction with schema validation**: Chosen for testability and future model/provider changes.

## Risks / Trade-offs

- **[Risk] Scanned PDFs may have little or no extractable text** -> Mitigation: detect low extraction quality, fail with actionable reason, and leave room for OCR support in a future enhancement.
- **[Risk] AI output may contain factual errors or unsupported claims** -> Mitigation: save output as draft, include source metadata, and require organizer review before publish.
- **[Risk] Large PDFs can exceed model input limits** -> Mitigation: enforce upload limits, clean/chunk text, summarize chunks, and report truncation metadata.
- **[Risk] AI provider downtime can block generation** -> Mitigation: background jobs use retry policies and expose failed/retryable status.
- **[Risk] Uploaded files may contain sensitive or malicious content** -> Mitigation: validate file type/size, store outside executable paths, restrict access, and redact sensitive logs.

## Migration Plan

1. Add upload and artifact data models for PDFs, extracted text, cleaned text, generation jobs, and bio drafts.
2. Add file storage adapter and PDF upload API protected by organizer event authorization.
3. Add background job queue and stage-based workers for extraction, cleaning, and AI generation.
4. Add admin dashboard upload, job status, and generated draft preview flows.
5. Add retry/cancel/status APIs for organizer-visible job control.
6. Enable generation for selected organizer events behind a feature flag.
7. Roll back by disabling new uploads and allowing existing jobs to complete, fail, or be cancelled without deleting source files.

## Open Questions

- Which object storage provider should be used first for uploaded PDFs?
- Should OCR for scanned PDFs be included in the first implementation or deferred?
- What default tone and length should generated artist bios use for TicketBox event pages?
