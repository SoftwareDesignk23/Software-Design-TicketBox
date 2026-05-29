## 1. Data Model and Storage

- [ ] 1.1 Define VIP guest list tables for guests, import jobs, and row errors
- [ ] 1.2 Add idempotency key constraints and indexes for fast lookups
- [ ] 1.3 Add migration scripts for new tables and constraints

## 2. Ingestion Pipeline

- [ ] 2.1 Implement import job creation service for scheduled and manual triggers
- [ ] 2.2 Implement CSV parsing with row validation and batch splitting
- [ ] 2.3 Implement worker batch processing with partial commit handling
- [ ] 2.4 Implement idempotent upsert logic for VIP guest records
- [ ] 2.5 Implement row error logging and import job status updates
- [ ] 2.6 Implement retry logic with exponential backoff for transient errors

## 3. Admin Portal and API

- [ ] 3.1 Add API endpoint for manual CSV upload and job creation
- [ ] 3.2 Add API endpoint to reprocess failed rows by job
- [ ] 3.3 Add Admin UI for upload, job status, and error review

## 4. Scheduling and Operations

- [ ] 4.1 Implement nightly poller to detect CSV drops and enqueue jobs
- [ ] 4.2 Add metrics and logs for import throughput, failures, and retries
- [ ] 4.3 Add retention policy for stored CSV files and row error logs

## 5. Testing and Documentation

- [ ] 5.1 Add unit tests for CSV validation and idempotency logic
- [ ] 5.2 Add integration tests for worker batch processing and partial failures
- [ ] 5.3 Document CSV schema requirements and operational runbooks
