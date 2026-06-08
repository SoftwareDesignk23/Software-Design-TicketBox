# plan.md — Template

> Replace all `<...>` placeholders. Delete this line before saving.

---

# Plan: <Change Name>

**Generated from:** OpenSpec change `<change-id>`
**Date:** <YYYY-MM-DD>
**Status:** Draft

---

## 1. Overview

<2-3 sentences: what is being built, why, and what success looks like.>

---

## 2. Scope

### In Scope
- <Derived from ADDED/MODIFIED spec deltas or proposal What section>
- ...

### Out of Scope
- <Derived from REMOVED deltas or proposal Out of Scope section>
- ...

### Assumptions
- <Any assumption made due to ambiguous spec — e.g. "Assumed Postgres 15+">
- ...

---

## 3. Phases & Timeline

> All durations assume a team of <N> engineers. Adjust proportionally.

| Phase | Name | Duration | Cumulative |
|---|---|---|---|
| 0 | Foundation | Xd | Xd |
| 1 | Core Backend | Xd | Xd |
| 2 | Core Frontend | Xd | Xd |
| 3 | Integration & Polish | Xd | Xd |
| 4 | Testing & Hardening | Xd | Xd |
| 5 | Deploy & Launch | Xd | Xd |
| — | **Total** | **Xd** | — |

---

### Phase 0 — Foundation
**Goal:** Establish the infrastructure, environments, and skeleton that all later phases build on.

**Deliverables:**
- [ ] Dev / staging / prod environments provisioned
- [ ] CI/CD pipeline configured
- [ ] Database schema migrations for new entities
- [ ] Base API skeleton (routing, auth middleware, error handling)
- [ ] Feature flags set up (if applicable)

**Duration:** X working days
**Depends on:** Nothing (can start immediately)
**Risks:** Environment provisioning delays if cloud account setup is pending

---

### Phase 1 — Core Backend
**Goal:** Implement all domain logic, API endpoints, and data persistence required by the spec.

**Deliverables:**
- [ ] <List each API endpoint or service from the spec>
- [ ] Data models and migrations
- [ ] Auth/permission logic
- [ ] Unit tests for business logic

**Duration:** X working days
**Depends on:** Phase 0 complete
**Risks:** <e.g. "Third-party API integration may have undocumented rate limits">

---

### Phase 2 — Core Frontend
**Goal:** Build all user-facing screens and wire them to the backend API.

**Deliverables:**
- [ ] <List each screen/component from the spec>
- [ ] Client-side state management
- [ ] API integration
- [ ] Loading/error states

**Duration:** X working days
**Depends on:** Phase 1 API contracts finalised (can run in parallel once API contracts are agreed)
**Risks:** Design handoff delays; API contract changes mid-phase

---

### Phase 3 — Integration & Polish
**Goal:** Validate end-to-end flows, handle edge cases, and deliver production-quality UX.

**Deliverables:**
- [ ] E2E happy-path flows working
- [ ] Edge cases and error handling from EARS scenarios covered
- [ ] Accessibility audit
- [ ] Performance optimisations (if spec requires)

**Duration:** X working days
**Depends on:** Phases 1 & 2 feature-complete
**Risks:** Scope creep from discovered edge cases

---

### Phase 4 — Testing & Hardening
**Goal:** Achieve test coverage targets and security sign-off.

**Deliverables:**
- [ ] Unit test coverage ≥ X%
- [ ] Integration test suite passing
- [ ] E2E test suite passing
- [ ] Security review / pen test (if required)
- [ ] Load test results (if spec requires SLA)

**Duration:** X working days
**Depends on:** Phase 3 complete
**Risks:** Discovered defects may require Phase 1/2 rework

---

### Phase 5 — Deploy & Launch
**Goal:** Ship to production safely with monitoring and rollback capability.

**Deliverables:**
- [ ] Staging deploy + smoke test sign-off
- [ ] Production deploy
- [ ] Monitoring dashboards and alerts configured
- [ ] Rollback runbook documented
- [ ] Stakeholder sign-off

**Duration:** X working days
**Depends on:** Phase 4 complete
**Risks:** Production config drift from staging

---

## 4. Milestones

| Milestone | Target (Week from start) | Deliverable | Owner |
|---|---|---|---|
| Environments ready | Week 1 | Phase 0 complete | Infra lead |
| Backend API shipped | Week X | Phase 1 complete | Backend lead |
| Frontend feature-complete | Week X | Phase 2 complete | Frontend lead |
| Internal QA sign-off | Week X | Phase 4 complete | QA lead |
| Production launch | Week X | Phase 5 complete | Tech lead |

---

## 5. Risk & Dependency Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | <Technical risk, e.g. DB migration complexity> | Medium | High | Spike in Phase 0; review with DBA |
| R2 | <External dependency, e.g. third-party API contract> | Low | High | Mock API in Phase 1; confirm contract Week 1 |
| R3 | <Scope/estimation risk, e.g. spec requirements expand> | Medium | Medium | Weekly spec review; change requests go through OpenSpec propose |
| R4 | <Infra risk, e.g. cloud region limits> | Low | Medium | Pre-provision limits; quota request in Phase 0 |

**External Dependencies:**
- <Service/team name>: needed for <what>, expected by <when>
- ...

---

## 6. Tech Stack & Architecture Notes

| Layer | Technology | Notes |
|---|---|---|
| Frontend | <e.g. Next.js 14 / React 18> | <e.g. App Router; Tailwind for styling> |
| Backend | <e.g. Node.js / Express / tRPC> | <e.g. Deployed on Railway / Fly / ECS> |
| Database | <e.g. PostgreSQL 15 via Supabase> | <e.g. Drizzle ORM; migrations via drizzle-kit> |
| Auth | <e.g. Clerk / NextAuth / custom JWT> | |
| Infra | <e.g. AWS ECS + RDS + CloudFront> | <e.g. Terraform for IaC> |
| CI/CD | <e.g. GitHub Actions> | |
| Observability | <e.g. Datadog / Sentry / Grafana> | |

**Key Architecture Decisions:**
- <Decision 1 from design.md, e.g. "Event-driven notifications via BullMQ to avoid blocking API">
- <Decision 2>

---

## 7. Definition of Done

A feature is **done** when:
- [ ] All acceptance criteria from the corresponding Story tickets are met
- [ ] Spec scenarios (GIVEN/WHEN/THEN) pass as automated tests
- [ ] Code reviewed and merged to main
- [ ] Deployed to staging and smoke-tested
- [ ] No P0/P1 bugs open
- [ ] Monitoring alerts configured
- [ ] `openspec/changes/<change-id>/tasks.md` is fully checked off
- [ ] Spec archived via `/opsx:archive`

---

## 8. Open Questions

| # | Question | Owner | Due |
|---|---|---|---|
| Q1 | <Unresolved spec ambiguity> | <person> | <date> |