# TicketBox Engineering & Design System Rules

## Project Context

TicketBox is a high-scale concert ticketing platform inspired by real-world Vietnamese mega-events such as:

- Anh Trai Say Hi
- Anh Trai Vượt Ngàn Chông Gai
- Chị Đẹp Đạp Gió Rẽ Sóng
- Em Xinh Say Hi

The system must support:

- massive traffic spikes
- fair ticket purchasing
- anti-scalping
- real-time inventory
- resilient payment flows
- offline QR check-in
- admin management
- mobile-first experience

This repository is a monorepo containing:

- frontend web applications
- React Native mobile applications
- backend services
- shared packages
- design system
- infrastructure configuration

---

# Global Engineering Philosophy

Every implementation must prioritize:

1. Scalability
2. Reliability
3. User experience
4. Consistency
5. Maintainability
6. Production readiness

Avoid:

- quick hacks
- duplicated business logic
- inconsistent UI
- tightly coupled services
- magic values
- unclear naming

All code must be:

- typed
- modular
- composable
- testable
- observable

---

# Monorepo Structure

Expected architecture:

apps/
ui/
admin-dashboard/
web/
mobile-checkin/
backend/

packages/
ui/
api/
types/
config/
eslint-config/
tsconfig/

blueprint/
proposal.md
design.md
specs/

Rules:

- shared logic belongs in packages/
- business rules must never be duplicated
- frontend apps consume shared packages
- API types should be centralized
- reusable UI primitives belong in packages/ui

---

# Frontend Rules

Frontend stack:

- React
- Next.js
- React Native
- TypeScript
- Tailwind
- Zustand or Redux Toolkit
- React Query / TanStack Query

## Frontend Architecture

Use feature-first structure.

Example:

src/
features/
shared/
components/
hooks/
services/
stores/
screens/
layouts/

Avoid:

- giant component files
- deeply nested prop drilling
- business logic inside UI components

Prefer:

- reusable hooks
- container/presentation separation
- composition over inheritance

---

# UI / UX Philosophy

The UI must feel:

- premium
- cinematic
- responsive
- modern
- event-focused
- emotionally exciting

Inspired by:

- Spotify
- Apple Music
- Ticketmaster
- Netflix
- modern concert branding

Avoid:

- generic admin templates
- bootstrap-looking UI
- overcrowded layouts
- random colors
- inconsistent spacing

Prioritize:

- visual hierarchy
- spacing rhythm
- responsive scaling
- accessibility
- loading states
- empty states
- skeletons
- motion feedback

---

# Impeccable Integration Rules

Impeccable is the primary UI refinement workflow.

When generating or refining UI:

- always prefer Impeccable-driven workflows
- UI quality is mandatory
- never leave raw AI-generated layouts unrefined

Preferred workflow:

1. /impeccable shape
2. /impeccable craft
3. /impeccable layout
4. /impeccable typeset
5. /impeccable animate
6. /impeccable harden
7. /impeccable polish
8. /impeccable audit

Mandatory UI quality checks:

- spacing consistency
- typography hierarchy
- responsive behavior
- touch target sizing
- overflow handling
- dark mode compatibility
- animation smoothness
- accessibility
- loading UX
- empty state UX
- error state UX

Never:

- generate UI without refinement
- mix unrelated visual styles
- use random spacing
- use inconsistent shadows/radius
- create inaccessible color contrast

---

# Mobile App Rules

Mobile app is React Native.

Primary responsibilities:

- ticket browsing
- QR ticket access
- offline check-in
- push notifications

Requirements:

- offline-first mindset
- optimistic UI
- local persistence
- smooth animations
- low-memory awareness

Must support:

- intermittent network
- retry synchronization
- temporary offline check-in records

Avoid:

- large unnecessary re-renders
- blocking rendering work
- oversized component trees

---

# Backend Rules

Backend stack:

- NestJS
- PostgreSQL
- Redis
- Message Broker
- Prisma or TypeORM

Architecture style:

- modular monolith initially
- service-oriented boundaries
- event-driven integration where needed

Critical concerns:

- ticket overselling prevention
- idempotent payment processing
- anti-bot protections
- concurrency control
- cache consistency

Must implement:

- RBAC
- rate limiting
- cache-aside
- idempotency key handling
- retry policies
- graceful degradation
- circuit breaker patterns

Avoid:

- shared mutable state
- fat controllers
- business logic in routes
- synchronous heavy processing

Prefer:

- queues
- domain services
- transactional boundaries
- background jobs

---

# Database Rules

Primary database:

- PostgreSQL

Caching:

- Redis

Rules:

- use migrations
- avoid destructive schema changes
- index critical lookup paths
- use transactions for ticket purchase flows

Critical flows requiring strong consistency:

- ticket reservation
- payment confirmation
- inventory updates
- per-user ticket limits

---

# API Rules

API design:

- REST-first
- predictable naming
- versioned endpoints

Must include:

- validation
- DTO typing
- structured error responses
- request tracing
- logging

Never expose:

- internal errors
- stack traces
- sensitive information

---

# Security Rules

Must implement:

- JWT authentication
- RBAC authorization
- rate limiting
- request validation
- secure secrets handling
- anti-replay protections

Sensitive operations:

- payment
- ticket issuance
- admin mutation
- QR validation

must always be protected.

---

# Performance Rules

The platform must tolerate:

- 80,000+ concurrent users during ticket release

Prioritize:

- caching
- pagination
- lazy loading
- code splitting
- virtualization
- optimized queries

Frontend goals:

- fast first paint
- responsive interactions
- low bundle size

Backend goals:

- graceful degradation under pressure
- stable latency
- no cascading failures

---

# Design System Rules

All reusable UI must use shared tokens.

Shared tokens:

- spacing
- colors
- typography
- border radius
- shadows
- animations

Never hardcode:

- random hex colors
- arbitrary spacing
- inconsistent font sizes

Use semantic naming:

- primary
- secondary
- destructive
- success
- warning

not:

- blue1
- redBright
- coolShadow

---

# Naming Conventions

Use:

- clear domain-driven names
- singular entity naming
- explicit action verbs

Good:

- reserveTicket
- confirmPayment
- issueETicket

Bad:

- doThing
- handleStuff
- tempData

---

# Git & Collaboration Rules

Commits must be:

- small
- atomic
- descriptive

Prefer:
feat:
fix:
refactor:
perf:
docs:

Pull requests must include:

- screenshots
- architectural reasoning
- edge cases handled

---

# Documentation Rules

Every major feature requires:

- architecture notes
- flow explanation
- API documentation
- edge case documentation

Important flows:

- payment
- ticket reservation
- QR validation
- offline sync

must be explicitly documented.

---

# AI Collaboration Rules

When generating code:

- prioritize maintainability over speed
- explain architectural decisions
- avoid hidden abstractions
- avoid hallucinated APIs
- preserve existing conventions

Before introducing new dependencies:

- justify the need
- compare alternatives
- evaluate bundle/runtime impact

When uncertain:

- ask for clarification instead of guessing

---

# Final Quality Standard

Every feature must feel:

- production-grade
- scalable
- visually polished
- technically defendable

This project should resemble:

- a startup-grade ticketing platform
- not a temporary university demo.
