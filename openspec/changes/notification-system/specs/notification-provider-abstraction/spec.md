## ADDED Requirements

### Requirement: Provider Adapter Contract
The system SHALL define provider adapter contracts for validating payload capability, sending messages, mapping provider responses, and exposing retryability metadata.

#### Scenario: Provider sends supported payload
- **WHEN** a provider adapter receives a payload matching its supported channel and capability metadata
- **THEN** the adapter SHALL send the message and return a normalized provider response

### Requirement: Email Provider Implementation
The system SHALL include an email provider implementation behind the provider adapter contract.

#### Scenario: Email adapter configured
- **WHEN** the email provider credentials and sender configuration are valid
- **THEN** the system SHALL use the email adapter for email notification jobs

### Requirement: Future SMS Compatibility
The provider abstraction SHALL support future SMS provider implementations without requiring notification producers to change event payloads.

#### Scenario: SMS provider added later
- **WHEN** an SMS provider adapter is introduced in a future change
- **THEN** existing domain event producers SHALL NOT need provider-specific fields to dispatch SMS notifications

### Requirement: Future Zalo OA Compatibility
The provider abstraction SHALL support future Zalo OA provider implementations with provider-specific metadata isolated to routing and provider configuration.

#### Scenario: Zalo OA provider added later
- **WHEN** a Zalo OA provider adapter is introduced in a future change
- **THEN** notification routing SHALL be able to target Zalo OA without changing existing domain event contracts

### Requirement: Provider Configuration Validation
The system SHALL validate provider configuration at startup or deployment time before dispatch workers process jobs.

#### Scenario: Missing email provider secret
- **WHEN** required email provider credentials are missing
- **THEN** the system SHALL fail configuration validation or disable email dispatch with a clear operational error
