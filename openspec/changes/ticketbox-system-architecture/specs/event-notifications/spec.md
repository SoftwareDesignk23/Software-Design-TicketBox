## ADDED Requirements

### Requirement: Asynchronous Notification Delivery
The system SHALL decouple notification triggers from core user request threads by publishing events to RabbitMQ/Kafka message brokers for asynchronous delivery.

#### Scenario: Payment Confirmed Notification Triggered
- **WHEN** the Payment Service updates a payment status to SUCCESS
- **THEN** it SHALL emit a `booking.confirmed` event to the message broker, which is consumed by the Notification Service to trigger email and push notifications

### Requirement: Retry Mechanism with Dead-Letter Queues (DLQ)
The Notification Service SHALL support robust error handling by retrying failed email deliveries before moving them to a Dead-Letter Queue (DLQ).

#### Scenario: Temporary SMTP Failure Retries
- **WHEN** the Notification Service encounters a temporary network timeout while sending an email
- **THEN** it SHALL retry sending the email up to 3 times with exponential backoff before sending it to a dead-letter queue (DLQ) for manual inspection
