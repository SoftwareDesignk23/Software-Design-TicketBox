# tickets.md — Template

> This file maps directly to your OpenSpec `tasks.md` and can be imported into Linear, Jira, or GitHub Issues.
> Replace all `<...>` placeholders. Delete this line before saving.

---

# Tickets: <Change Name>

**OpenSpec change:** `<change-id>`
**Total Epics:** X | **Total Stories:** X | **Total Tasks:** X
**Sprint-ready estimate:** X days

---

## Epic [E-01]: Infrastructure & Foundation
**Phase:** 0
**Goal:** Set up all environments, pipelines, and base scaffolding.
**Stories:** [S-01], [S-02], [S-03]

---

### Story [S-01]: Provision environments and CI/CD
**Epic:** [E-01]
As a developer, I want dev/staging/prod environments and a working CI/CD pipeline so that I can deploy safely at any stage.

**Acceptance Criteria:**
- [ ] Dev, staging, and prod environments are accessible
- [ ] CI pipeline runs lint, type-check, and tests on every PR
- [ ] CD pipeline deploys to staging on merge to main
- [ ] Secrets managed via vault/env manager (not committed to repo)

**Estimate:** M (1 day)
**Dependencies:** None
**Stack:** Infra

#### Task [T-001]: Provision cloud resources (VPC, DB, compute)
**Story:** [S-01]
**What:** Create Terraform/Pulumi modules for VPC, RDS instance, ECS/container service
**Estimate:** 4h
**Notes:** Use existing org account; request quota increases in advance

#### Task [T-002]: Configure GitHub Actions CI pipeline
**Story:** [S-01]
**What:** Workflow for lint + typecheck + unit tests on PR; cache node_modules
**Estimate:** 2h
**Notes:** Use `actions/cache` for node_modules; fail fast on lint errors

#### Task [T-003]: Configure CD pipeline (staging auto-deploy)
**Story:** [S-01]
**What:** On merge to `main`, build Docker image, push to registry, deploy to staging
**Estimate:** 2h
**Notes:** Use OIDC auth to AWS (no long-lived keys); blue-green or rolling deploy

---

### Story [S-02]: Database schema and migrations
**Epic:** [E-01]
As a backend engineer, I want the initial DB schema in place so that all Phase 1 work can build on it.

**Acceptance Criteria:**
- [ ] All new tables/columns from spec are created via migration
- [ ] Migrations are reversible
- [ ] Schema reviewed and approved

**Estimate:** S (½ day)
**Dependencies:** [S-01] (DB instance must exist)
**Stack:** Backend / Infra

#### Task [T-004]: Write initial schema migrations
**Story:** [S-02]
**What:** Create migration files for <entity1>, <entity2> per spec data model
**Estimate:** 3h
**Notes:** Use Drizzle / Prisma / Alembic — match existing ORM

---

## Epic [E-02]: Core Backend
**Phase:** 1
**Goal:** Implement all API endpoints, business logic, and auth required by the spec.
**Stories:** [S-03], [S-04], [S-05]

---

### Story [S-03]: <Requirement name from spec>
**Epic:** [E-02]
As a <role from EARS requirement>, I want <capability> so that <benefit>.

**Acceptance Criteria:**
*(Derived directly from EARS GIVEN/WHEN/THEN scenarios)*
- [ ] GIVEN <precondition> WHEN <action> THEN <outcome>
- [ ] GIVEN <precondition> WHEN <action> THEN <outcome — error case>

**Estimate:** L (2-3 days)
**Dependencies:** [S-02]
**Stack:** Backend
**Priority:** High (MUST requirement)

#### Task [T-005]: Implement <domain service / use case>
**Story:** [S-03]
**What:** Business logic layer: validation, state transitions, persistence
**Estimate:** 4h
**Notes:** Keep domain logic pure (no HTTP concerns); test with unit tests

#### Task [T-006]: Expose <endpoint> REST/tRPC route
**Story:** [S-03]
**What:** Route handler, request validation (Zod), auth guard, response mapping
**Estimate:** 2h
**Notes:** Follow existing error response format in codebase

#### Task [T-007]: Write unit + integration tests for <domain service>
**Story:** [S-03]
**What:** Unit tests for service, integration test for the full route with DB
**Estimate:** 2h
**Notes:** Use test DB; seed fixtures

---

## Epic [E-03]: Core Frontend
**Phase:** 2
**Goal:** Build all screens and components, wired to the backend.
**Stories:** [S-06], [S-07]

---

### Story [S-06]: <Screen / feature name>
**Epic:** [E-03]
As a <user role>, I want <UI capability> so that <benefit>.

**Acceptance Criteria:**
- [ ] Screen renders correctly on desktop and mobile (≥375px)
- [ ] Loading and error states are handled
- [ ] Calls the correct API endpoint from [S-03]/[S-04]
- [ ] Passes accessibility audit (WCAG AA)

**Estimate:** L (2-3 days)
**Dependencies:** [S-03] (API contract must be stable — mock if needed)
**Stack:** Frontend

#### Task [T-010]: Build <component name> component
**Story:** [S-06]
**What:** React component with props, Storybook story, unit test
**Estimate:** 3h
**Notes:** Follow design system tokens; no inline styles

#### Task [T-011]: Wire <screen> to API
**Story:** [S-06]
**What:** React Query / SWR hook for data fetching; optimistic updates if spec requires
**Estimate:** 2h
**Notes:** Handle 401 → redirect to login; 4xx → inline error message

#### Task [T-012]: Write Playwright E2E test for <happy path>
**Story:** [S-06]
**What:** E2E test covering the primary EARS scenario for this screen
**Estimate:** 2h
**Notes:** Use page object model; seed test data via API

---

## Epic [E-04]: Testing & Hardening
**Phase:** 4
**Goal:** Achieve coverage targets, security review, and performance validation.
**Stories:** [S-08], [S-09]

---

### Story [S-08]: Test coverage and quality gate
**Epic:** [E-04]
As a tech lead, I want ≥80% unit test coverage and a full E2E suite so that we can release confidently.

**Acceptance Criteria:**
- [ ] Unit test coverage ≥ 80% on backend services
- [ ] All E2E tests passing in CI
- [ ] No P0/P1 bugs open

**Estimate:** M (1 day)
**Dependencies:** All Phase 1-3 stories done
**Stack:** Full-stack

#### Task [T-020]: Coverage audit and gap-fill
**Story:** [S-08]
**What:** Run coverage report; write missing tests for uncovered branches
**Estimate:** 4h

---

## Epic [E-05]: Deploy & Launch
**Phase:** 5
**Goal:** Ship to production with monitoring, rollback, and stakeholder sign-off.
**Stories:** [S-10], [S-11]

---

### Story [S-10]: Production deploy and monitoring
**Epic:** [E-05]
As a tech lead, I want a production deploy with alerts so that I can detect and respond to issues.

**Acceptance Criteria:**
- [ ] Deployed to production and smoke-tested
- [ ] Error rate and latency alerts configured
- [ ] Rollback runbook documented and tested on staging

**Estimate:** M (1 day)
**Dependencies:** Phase 4 complete; staging smoke-test passed
**Stack:** Infra / Full-stack

#### Task [T-021]: Configure observability (logs, metrics, alerts)
**Story:** [S-10]
**What:** Datadog/Sentry setup; alert on error rate >1% or p99 latency >500ms
**Estimate:** 3h

#### Task [T-022]: Write rollback runbook
**Story:** [S-10]
**What:** Document: how to detect rollback trigger, steps to roll back DB + app, who to notify
**Estimate:** 1h

---

## Summary

| | Count | Raw estimate |
|---|---|---|
| Epics | X | — |
| Stories | X | Xd |
| Tasks | X | Xh |

| | Days |
|---|---|
| Total raw estimate | X |
| Buffer (20%) | X |
| **Sprint-ready estimate** | **X** |
| Suggested team size | N engineers |
| Suggested sprint length | N × 1-week sprints |

> **Next step:** Copy this file to `openspec/changes/<change-id>/tasks.md` to track progress alongside your spec.
> When all tasks are checked off, run `/opsx:archive` to close the change.