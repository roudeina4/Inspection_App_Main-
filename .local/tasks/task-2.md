---
title: Unified Onboarding Workflow Hub with Admin Phase Builder
---
# Unit Onboarding Workflow Status Bar

## What & Why
Add a vertical phase-tracker sidebar to the PM's onboarding inspection report page. When a PM opens an onboarding inspection, they see a left-side status bar showing exactly where the unit stands in the full onboarding workflow — from questionnaire through rental setup. Each phase is numbered, color-coded (gray/blue/green), and expandable to show sub-tasks. A progress ring next to the title ("Unit Onboarding Workflow") shows overall completion (e.g., "3/7"). This gives PMs instant visual workflow tracking without digging through multiple pages.

## Done looks like
- On the PM inspection report page, when viewing an onboarding inspection, a vertical status bar appears on the left side of the content area
- Title reads "Unit Onboarding Workflow" with a circular progress ring showing completed/total phases (e.g., "3/7")
- Seven numbered phases displayed vertically:
  - Phase 1: Questionnaire — auto-derived from `owner_onboardings` status (PENDING/IN_PROGRESS/COMPLETED)
  - Phase 2: Inspection Scheduled — auto-derived from `inspection_tasks` existence and status (ASSIGNED)
  - Phase 3: Inspection Complete — auto-derived from task status (SUBMITTED/REVIEWED)
  - Phase 4: PM Review — auto-derived from task status (REVIEWED) and owner report status (DRAFT/FINALIZED)
  - Phase 5: Owner Review — auto-derived from owner report publish status and owner response counts
  - Phase 6: Action Phase — manual checklist sub-tasks: Keys, Contractors, Amazon, Cleaning, Photography
  - Phase 7: Rental Setup — manual checklist sub-tasks: Floor Plan, Cleaner Tasks, Documentation
- Each phase shows a status indicator: gray circle (not started), blue pulsing dot (in progress), green checkmark (complete)
- Clicking a phase header expands it to show details: dates, sub-task checkboxes, contextual info (e.g., "Owner response pending" or "Completed on Mar 12")
- Phases 6 and 7 sub-tasks are interactive checkboxes that PMs can toggle; state is persisted to a new database table
- The main report content shifts right to accommodate the sidebar on desktop; on mobile, the status bar collapses to a compact horizontal progress indicator or is hidden behind a toggle
- The status bar only appears for onboarding inspections (not full inspections)

## Out of scope
- Automated triggers that change phase status (e.g., auto-scheduling contractors) — phases 6-7 are manual checkboxes only
- Notifications or alerts when phases change
- Unit-level workflow view outside the inspection report page
- Editing phase definitions or adding custom phases

## Tasks
1. **Database schema for manual checklist** — Add a `unit_onboarding_checklist` table to store PM-toggled sub-task states for phases 6-7, keyed by unit ID and task name, with completed boolean, completed date, and completed-by user ID.

2. **API endpoints for checklist** — Add GET and PATCH endpoints for reading and toggling checklist items for a given unit. Endpoints require PM/ADMIN role.

3. **Phase derivation logic** — Build a shared utility that takes the inspection task, owner onboarding, owner report, and checklist data, and computes the status of each of the 7 phases (not_started / in_progress / complete) plus sub-task details.

4. **Status bar UI component** — Create the vertical phase-tracker component with numbered phases, color-coded status indicators, expandable sections, interactive checkboxes for phases 6-7, and the SVG progress ring with completion counter.

5. **Layout integration** — Modify the inspection report page to show a two-column layout (status bar + main content) for onboarding inspections only. Handle responsive behavior: full sidebar on desktop, collapsible on mobile.

6. **Data fetching and wiring** — Fetch all required data (owner onboarding status, owner report status, checklist items) on the inspection report page and pass to the status bar component.

## Relevant files
- `client/src/pages/pm/inspection-report.tsx`
- `shared/schema.ts`
- `server/routes.ts`
- `server/storage.ts`