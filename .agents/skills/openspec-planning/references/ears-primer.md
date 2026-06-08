# EARS Format Primer

EARS = **Easy Approach to Requirements Syntax**. OpenSpec spec deltas use EARS to write unambiguous requirements.

## Keywords & Priority Mapping

| Keyword | Meaning | Ticket Priority |
|---|---|---|
| `MUST` / `SHALL` | Mandatory — non-negotiable | **High** — always a Story |
| `SHOULD` | Preferred — default unless explicitly excluded | **Medium** — a Story |
| `MAY` / `CAN` | Optional — permitted but not required | **Low** — a Story if time allows |
| `MUST NOT` / `SHALL NOT` | Prohibited — hard constraint | **High** — acceptance criteria |

## EARS Sentence Patterns

**Ubiquitous** (always true):
> The system SHALL validate input on every API call.

**Event-driven** (when something happens):
> WHEN a user submits the login form, the system SHALL check credentials within 500ms.

**State-driven** (while in a state):
> WHILE a user session is active, the system SHALL refresh the access token every 15 minutes.

**Conditional** (if an option is enabled):
> IF two-factor authentication is enabled, the system MUST require an OTP on every login.

**Optional feature**:
> WHERE dark mode is supported, the system MAY persist the user's theme preference.

## GIVEN/WHEN/THEN Scenarios

Each EARS requirement typically has one or more acceptance scenarios:

```
#### Scenario: OTP required
- GIVEN a user with 2FA enabled
- WHEN the user submits valid credentials
- THEN the system presents an OTP challenge
- AND the session is not created until OTP is verified
```

**How to use in tickets:** Each scenario maps directly to an acceptance criterion (`- [ ]`) in the Story. Write the criterion in plain English derived from the scenario — don't copy verbatim, paraphrase for the ticket context.

## Delta Sections

In `spec-delta.md`, requirements are organised under:

| Section | Meaning |
|---|---|
| `## ADDED Requirements` | New behaviour — must be fully implemented |
| `## MODIFIED Requirements` | Existing behaviour changing — implement the new version |
| `## REMOVED Requirements` | Behaviour being deleted — ensure it's removed cleanly |

## Example → Ticket Mapping

**Spec delta:**
```markdown
## ADDED Requirements
### Requirement: Email Verification
The system MUST send a verification email when a new user registers.

#### Scenario: Verification email sent
- GIVEN a new user completes registration
- WHEN the system creates the account
- THEN a verification email is sent within 30 seconds
```

**Resulting Story:**
```markdown
### Story [S-05]: Email verification on registration
As a new user, I want to receive a verification email so that my account is confirmed.

Acceptance Criteria:
- [ ] A verification email is sent within 30 seconds of account creation
- [ ] The email contains a unique, time-limited verification link (expires 24h)
- [ ] Clicking the link marks the account as verified
- [ ] Attempting to log in before verification shows a clear prompt

Estimate: M (1 day)
Priority: High (MUST)
Stack: Backend + Frontend (email template)
```