---
name: openspec-planning
description: >
  Use this skill whenever the user wants to create a detailed development plan from an OpenSpec proposal or spec document.
  Triggers include: "plan this spec", "create a plan from my proposal", "break down this openspec", "plan this feature",
  "create implementation plan", "build a plan from spec", "planning from proposal", "turn this spec into tasks",
  "how do I implement this spec", "sprint plan for this change", or any time the user pastes or references an OpenSpec
  proposal.md, tasks.md, spec-delta.md, or design.md. Also trigger when the user mentions "opsx:propose" output or 
  says they're using OpenSpec / spec-driven development and wants planning help.
  Produces: a full planning document (phases, milestones, estimates, risks) + a structured ticket list (Epics → Stories → Tasks)
  covering frontend, backend, and infrastructure — all derived from the spec.
---

# OpenSpec Planning Skill

Transforms an OpenSpec proposal or spec into a **complete, actionable development plan** for a full-stack product build:

- A rich planning document (phases, milestones, estimates, risks, dependencies)
- A structured ticket breakdown (Epic → Story → Task hierarchy)

## When You're Invoked

The user will provide one or more of:

- `proposal.md` — why/what/impact summary
- `spec-delta.md` or `specs/` — EARS-format requirement changes
- `design.md` — technical approach
- `tasks.md` — a rough checklist (if they have one already)
- Or just a natural-language description of what they're building via OpenSpec

If the user hasn't given you enough context to plan, ask ONE clarifying question before proceeding (see §Clarifying Questions).

---

## Step 1 — Parse the Spec

Before writing anything, mentally extract:

| Field                           | Where to find it                                          |
| ------------------------------- | --------------------------------------------------------- |
| **Change name / feature title** | Proposal heading or change folder name                    |
| **Why** (motivation)            | `proposal.md` → Why section                               |
| **What** (scope)                | `proposal.md` → What section + spec deltas ADDED/MODIFIED |
| **Out of scope**                | `proposal.md` → Out of scope or REMOVED deltas            |
| **Tech stack**                  | `design.md` or infer from codebase context user gives     |
| **Requirements**                | `spec-delta.md` — each `### Requirement:` block           |
| **Scenarios / acceptance**      | `spec-delta.md` — GIVEN/WHEN/THEN blocks                  |
| **Rough tasks already listed**  | `tasks.md` if provided                                    |

If spec deltas use EARS format (`MUST`, `SHALL`, `SHOULD`, `MAY`), honour that priority ordering when planning.

---

## Step 2 — Produce the Planning Document

Output a Markdown file called `plan.md` (save to working directory and present to user).

Follow the structure in `references/plan-template.md` exactly.

Key sections:

1. **Overview** — 2-3 sentences: what's being built, why, expected outcome
2. **Scope** — in-scope (from spec deltas ADDED/MODIFIED) vs out-of-scope
3. **Phases** — see Phase Design rules below
4. **Milestone table** — dates relative to start (Week N), deliverables, owner hints
5. **Risk & Dependency Register** — at least 3 risks with mitigation; flag external deps
6. **Tech Stack & Architecture Notes** — summarise from `design.md` or infer; highlight decisions
7. **Definition of Done** — derived from the EARS scenarios / acceptance criteria in the spec

### Phase Design Rules

Always split into at least these phases for a full-stack build. Add more if the spec is large.

| Phase | Name                 | Focus                                                                 |
| ----- | -------------------- | --------------------------------------------------------------------- |
| 0     | Foundation           | Infra setup, env, CI/CD, DB schema, base API skeleton                 |
| 1     | Core Backend         | Domain logic, API endpoints, auth, data models                        |
| 2     | Core Frontend        | UI components, screens, client-side state, API wiring                 |
| 3     | Integration & Polish | E2E flows, error handling, edge cases, UX polish                      |
| 4     | Testing & Hardening  | Unit/integration/E2E tests, load testing if relevant, security review |
| 5     | Deploy & Launch      | Staging deploy, smoke tests, prod deploy, monitoring, rollback plan   |

For each phase provide:

- **Goal** (1 sentence)
- **Deliverables** (bullet list)
- **Estimated duration** (in working days or weeks, conservative)
- **Key dependencies** (what must be done first)
- **Risks specific to this phase**

---

## Step 3 — Produce the Ticket List

Output a Markdown file called `tickets.md` (save and present alongside `plan.md`).

Follow the structure in `references/tickets-template.md`.

### Hierarchy

```
Epic (large area of work, maps to a Phase or a domain)
└── Story (user-facing or developer-facing deliverable, ~1-5 days)
    └── Task (concrete implementation unit, ~2-8 hours)
```

### Ticket Format

**Epic:**

```
## Epic: [E-01] <Title>
Phase: <phase number>
Goal: <one sentence>
Stories: [S-01], [S-02], ...
```

**Story:**

```
### Story [S-01]: <Title>
Epic: [E-01]
As a <role>, I want <capability> so that <benefit>.
Acceptance Criteria:
- [ ] <derived from EARS scenario 1>
- [ ] <derived from EARS scenario 2>
Estimate: <S/M/L/XL — S=½d, M=1d, L=2-3d, XL=5d>
Dependencies: <story IDs or none>
Stack: <Frontend | Backend | Infra | Full-stack>
```

**Task:**

```
#### Task [T-001]: <Title>
Story: [S-01]
What: <specific implementation action>
Estimate: <hours>
Notes: <tech detail, gotcha, or reference>
```

### Coverage Rules

Every EARS requirement `MUST` → at least one Story with full acceptance criteria derived from its scenarios.
Every EARS requirement `SHALL` → at least one Story.
Every EARS requirement `SHOULD` → a Story flagged `Priority: Medium`.
Infra work gets its own Epic even if not explicitly in the spec.
Frontend and backend tasks are separate Tasks within the same Story when they're tightly coupled.

### Estimates

Provide realistic estimates. Add **20% buffer** to raw estimates for a total sprint-ready figure at the bottom of `tickets.md`:

```
## Summary
Total raw estimate: X days
Buffer (20%): Y days
Sprint-ready estimate: Z days
Suggested team size: N engineers
Suggested sprint length: N weeks
```

---

## Step 4 — Consistency Check

Before finishing, verify:

- [ ] Every spec delta requirement has at least one ticket
- [ ] Every Phase has at least one Epic
- [ ] No ticket references a technology not in the stack section
- [ ] DoD in `plan.md` matches acceptance criteria in the Stories
- [ ] Risk register covers at least: (a) a technical risk, (b) a dependency/third-party risk, (c) a scope/estimation risk

If anything is missing, add it silently before presenting output.

---

## Clarifying Questions

Ask at most ONE of these if critical info is missing:

- **Stack unknown**: "What's your tech stack? (e.g. Next.js + Node + Postgres + AWS, or similar)"
- **Team size unknown** (ask only if estimate depends on parallelism): "How many engineers will work on this?"
- **Spec is ambiguous on scope**: "The spec doesn't clarify X — should I treat it as in-scope or a follow-up?"

Never ask more than one question. Make reasonable assumptions and note them in the plan.

---

## Output Checklist

- [ ] `plan.md` saved and presented
- [ ] `tickets.md` saved and presented
- [ ] Both files are consistent with each other
- [ ] Summary section in `tickets.md` includes total estimate + team/sprint suggestion
- [ ] User told: "You can copy `tickets.md` directly into Linear/Jira or your OpenSpec `tasks.md`"

---

## Reference Files

- `references/plan-template.md` — Full plan.md template with all sections and example content
- `references/tickets-template.md` — Full tickets.md template with example Epic/Story/Task
- `references/ears-primer.md` — Quick reference for reading EARS-format requirements
