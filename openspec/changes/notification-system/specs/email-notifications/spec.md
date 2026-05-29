## ADDED Requirements

### Requirement: Email Notification Delivery
The system SHALL deliver email notifications for jobs routed to the email channel using the configured email provider adapter.

#### Scenario: Email delivery accepted
- **WHEN** an email notification job has a valid recipient email address and rendered template
- **THEN** the system SHALL send the email through the configured provider and record the accepted provider response

### Requirement: Email Template Rendering
The system SHALL render email subject and body from versioned templates using validated template variables.

#### Scenario: Template variables valid
- **WHEN** an email job contains all required variables for its template
- **THEN** the system SHALL render the email subject and body before delivery

#### Scenario: Template variables missing
- **WHEN** an email job is missing required template variables
- **THEN** the system SHALL fail the job as non-retryable and record the validation error

### Requirement: Email Delivery State
The system SHALL track email delivery states for queued, sending, accepted, failed, retrying, and dead-lettered jobs.

#### Scenario: Provider accepts email
- **WHEN** the email provider accepts a send request
- **THEN** the system SHALL mark the delivery attempt accepted and update the job final state according to provider response semantics

### Requirement: Email Recipient Preferences
The system SHALL respect recipient email notification preferences for non-critical notification categories.

#### Scenario: User opted out of optional emails
- **WHEN** an optional email notification is routed to a user who opted out of that category
- **THEN** the system SHALL skip email delivery and record the preference-based skip reason
