# Unified Onboarding Workflow Hub

## What & Why
Replace the current two-page PM workflow (inspection report page + separate owner report builder page) with a single unified onboarding workflow page. The page has a fixed vertical phase-tracker sidebar on the left and a tabbed content card on the right. Phases and sub-tasks are stored in the database and seeded with 7 default phases. An admin Phase Builder allows admins to rename, reorder, add/remove phases and sub-tasks, and set dependencies. PMs see a consistent, company-standard workflow they can execute but not modify.

## Done looks like

### Sidebar (left, fixed) — PM View
- Title: "Unit Onboarding Workflow" with a circular SVG progress ring showing completed/total phases (e.g., "3/7")
- Phases displayed vertically with connecting lines, numbered sequentially
- Default 7 phases (seeded on first run, editable by admin):
  - Phase 1: Questionnaire — system-driven from `owner_onboardings` status
  - Phase 2: Inspection Scheduled — system-driven from `inspection_tasks` status
  - Phase 3: Inspection Complete — system-driven from task status (SUBMITTED or later)
  - Phase 4: PM Review — system-driven from task status (REVIEWED) and report categorization
  - Phase 5: Owner Review — system-driven from owner report publish status and owner responses
  - Phase 6: Action Phase — manual sub-tasks: Keys, Contractors, Amazon, Cleaning, Photography
  - Phase 7: Rental Setup — manual sub-tasks: Floor Plan, Cleaner Tasks, Documentation
- Each phase shows a status indicator: gray circle (not started), blue pulsing dot (in progress), green checkmark (complete)
- Phases with dependencies can't start until their prerequisite is complete
- Clicking phases 1-5 auto-switches to the matching tab in the content card
- Clicking phases 6-7 expands them inline to show interactive sub-task checkboxes
- Current/next phase is visually highlighted
- Phases auto-update as work progresses

### Main Content Card (right) — PM View
- Dashboard-style card with rounded corners and soft shadows
- 4 horizontal tabs at the top:
  - Tab 1: **Executive Summary** — inspection results overview, unit details, stats, media grid, room-by-room findings
  - Tab 2: **Review & Categorize** — issue categorization, priority setting, quotes, bundles, cleaning task
  - Tab 3: **Owner Report Builder** — report preview, closing message, Amazon cart link, share/publish controls
  - Tab 4: **Owner Responses** — locked (grayed with lock icon + tooltip) until the report is published; then shows owner feedback on items
- Active tab is highlighted; only one tab's content visible at a time
- Sidebar phase clicks auto-switch to the matching tab

### Admin Phase Builder
- Accessible from the admin settings/navigation
- Shows the current workflow template as an ordered list of phases
- Admin can:
  - **Add a new phase** with a name and phase type (system-driven or manual)
  - **Remove a phase** (with confirmation)
  - **Rename any phase**
  - **Reorder phases** via drag-and-drop or up/down controls
  - **Add sub-tasks** to any manual phase (each sub-task has a name and becomes a checkbox for PMs)
  - **Remove sub-tasks**
  - **Set dependencies** between phases (e.g., "Owner Review" depends on "Inspection Complete")
  - System-driven phases show which data source drives their status (read-only info for the admin)
- The 7 default phases are seeded into the database on first run
- Changes apply to all onboarding workflows going forward

### Navigation & Routing
- URL stays as `/pm/inspection/:id` — phase/tab selection is internal state
- The separate `/pm/owner-report/:id` route redirects to `/pm/inspection/:id` with Review & Categorize tab active
- Only appears for onboarding inspections; full inspections keep the current layout
- Admin Phase Builder accessible at its own route in admin settings

### Responsive Behavior
- Desktop: two-column layout with fixed sidebar + scrollable main content
- Mobile: sidebar collapses to a compact horizontal progress bar or toggleable drawer; tabs scroll horizontally

## Out of scope
- Automated triggers that change manual phase status (phases 6-7 type are manual checkboxes only)
- Notifications or alerts when phases change
- Unit-level workflow view outside the inspection report page
- Per-unit workflow customization (all units use the same admin-defined template)
- Multiple workflow templates for different property types

## Tasks
1. **Database schema** — Add tables for: workflow phases (name, order, type system/manual, dependencies), phase sub-tasks (name, order, parent phase), and unit checklist progress (unit ID, sub-task ID, completed, completed date, completed-by user). Seed the 7 default phases and their sub-tasks.

2. **API endpoints** — Add endpoints for: reading the workflow template (phases + sub-tasks), admin CRUD for phases and sub-tasks (create, update, delete, reorder, set dependencies), and PM checklist toggle (mark sub-tasks complete/incomplete per unit). Phase/sub-task endpoints require ADMIN role; checklist toggle requires PM/ADMIN.

3. **Phase status derivation logic** — Build a utility that computes each phase's status (not_started / in_progress / complete) by combining system-driven data (inspection task, owner onboarding, owner report) with manual checklist data from the database. Respect dependency rules.

4. **Refactor existing pages into embeddable components** — Extract the inspection report content (executive summary, findings, media) and owner report builder content (review tab, report tab) into standalone components that render inside the tabbed card without their own page headers or navigation.

5. **Workflow sidebar component** — Create the vertical phase-tracker with numbered phases, connecting lines, color-coded status indicators, expandable sections for manual phases with interactive checkboxes, and the SVG progress ring.

6. **Tabbed content card** — Build the main card with 4 horizontal tabs, tab switching, locked tab 4 behavior, and active tab highlighting. Wire tab switching to sidebar phase clicks.

7. **Unified page layout and routing** — Assemble sidebar + tabbed card into the inspection report page for onboarding inspections. Add redirect from `/pm/owner-report/:id`. Handle responsive layout.

8. **Admin Phase Builder UI** — Build the admin page for managing the workflow template: list phases, add/rename/delete phases, drag-and-drop reorder, add/remove sub-tasks per phase, set phase dependencies, and display system-driven phase info.

9. **Data fetching and state coordination** — Fetch all required data and coordinate state between sidebar phases and tab selection, including auto-updating phase status as the PM completes work.

## Relevant files
- `client/src/pages/pm/inspection-report.tsx`
- `client/src/pages/pm/owner-report-builder.tsx`
- `shared/schema.ts`
- `server/routes.ts`
- `server/storage.ts`
