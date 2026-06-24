# Tabbed PM Inspection Report + Sequential Phase Dependencies

## Objective
Two changes in one task:

1. **Tabbed Layout**: Restructure the PM inspection report page into a 4-tab layout to eliminate confusing navigation. Currently the PM has to click through to separate pages (e.g., clicking "Owner Report" button to reach the review/categorize page), which feels like a maze. This task consolidates everything into tabs on one page.

2. **Sequential Phase Dependencies**: Fix the workflow sidebar so phases are dependent on each other. Currently phase 1 and phase 3 can show as "complete" while phase 2 is still "not started" — that's wrong. Phases must be sequential: a phase can only be complete if all previous phases are complete. If phase 2 isn't done, phase 3 should show as locked/not started regardless of its own data.

---

## Part A: The 4 Tabs

### Tab 1: Executive Summary
Current content from the top of `inspection-report.tsx`:
- Unit details row (unit name, date, inspector, status)
- Summary stats card (Good/Damages/Missing/Replacement counts + progress bar)
- Unit Documentation section (onboarding-only: keys, amenities)
- Issues Summary table (problem items with Room, Item, Status, Condition, Action)
- Inspection Walkthrough (room-by-room table with all items, media, conditions)

### Tab 2: Review and Categorize
Bring the content from `owner-report-builder.tsx` inline as a tab instead of a separate page:
- The Review/Edit interface where PM categorizes inspection responses into Damage, Missing, Replacement, Good
- Item configuration dialogs (priority, quotes, vendor details, costs)
- Bundles tab content (grouping items into service packages)
- Remove the need to click "Owner Report" button to navigate away

### Tab 3: Owner Report Builder
The owner report preview — what the owner will see:
- Professional branded report layout
- Categorized items (High Priority Damages, Maintenance, Missing Items)
- Media evidence galleries
- Cost summary
- Publish to Owner button
- Share/copy link controls

### Tab 4: Owner Responses
Owner response tracking:
- Which items have been responded to by the owner
- Response status per item (Leave as is, I'll replace, Please fix, Proceed with purchase)
- Owner comments
- Overall response progress

### Tab UI Behavior
- Tabs displayed horizontally at the top of the content area (below the page header, above content)
- Selected tab: colored/teal background with white text
- Unselected tabs: light grey background
- Tab state persists while navigating within the page
- Mobile: tabs should be scrollable horizontally if needed
- The workflow sidebar (from Task #2) remains on the left side, independent of tabs

### Sidebar ↔ Tab Linking & Progressive Tab Visibility
The sidebar phases control which tabs are visible AND clicking a phase switches to its tab. The PM only sees tabs relevant to where they are in the workflow.

**Tab visibility rules based on workflow progress:**
- Phase 1-2 complete (Inspection Completed, Report Review not done yet) → Only **Executive Summary** tab visible
- Phase 2 reached (Report Review in progress or complete) → Unlocks **Review & Categorize** and **Owner Report Builder** tabs
- Phase 3 complete (Owner Report Sent / published) → Unlocks **Owner Responses** tab
- All 4 tabs visible once phases 1-3 are complete

**Clicking a phase in the sidebar:**
- Phase 1 "Inspection Completed" → switches to Executive Summary
- Phase 2 "Report Review" → switches to Review & Categorize
- Phase 3 "Owner Report Sent" → switches to Owner Report Builder
- Phase 4 "Owner Responses" → switches to Owner Responses
- Phases 5-7 (manual) → stay on current tab

**Key behavior:**
- Tab transitions are instant — no page reload, content swaps smoothly
- If the PM clicks a phase whose tab isn't unlocked yet, nothing happens (phase is locked anyway due to sequential dependencies)
- When a new tab becomes available (e.g., PM publishes the owner report), it appears dynamically
- The active tab auto-adjusts if the current tab set changes

---

## Part B: Sequential Phase Dependencies

### Problem
In `client/src/lib/workflow-phases.ts`, `derivePhaseStatuses()` evaluates each phase independently. This means phase 3 ("Owner Report Sent") can show as complete even if phase 2 ("Report Review") is still not started — which makes no logical sense.

### Fix
After computing each phase's raw status, apply a sequential dependency pass:
- Iterate through phases in order (sortOrder 0, 1, 2, ...)
- If the previous phase is NOT complete, force the current phase to "not_started" (or "locked")
- This ensures the visual progression is always sequential: complete → complete → in_progress → not_started → not_started...
- Manual phases (5, 6, 7) should also respect this: PM can't check off "Final Walkthrough" tasks if "Repairs & Replacements" isn't done

### File
- `client/src/lib/workflow-phases.ts` — Add sequential enforcement after raw status derivation in `derivePhaseStatuses()`

---

## Key Implementation Details

### Files to Modify
- `client/src/pages/pm/inspection-report.tsx` — Add tab navigation, restructure content into tab panels
- `client/src/pages/pm/owner-report-builder.tsx` — Extract core content into reusable components that can be embedded as a tab
- `client/src/lib/workflow-phases.ts` — Add sequential dependency enforcement
- `client/src/components/workflow-sidebar.tsx` — May need visual "locked" state for phases blocked by incomplete predecessors
- `client/src/App.tsx` — May need to update routing (redirect `/pm/owner-report/:inspectionId` to inspection report with appropriate tab)

### Navigation Changes
- Remove the "Owner Report" button that currently navigates to `/pm/owner-report/:inspectionId`
- Instead, clicking where the PM would manage the owner report switches to Tab 2 or Tab 3
- Keep backward compatibility: if someone navigates to `/pm/owner-report/:inspectionId`, redirect to `/pm/inspection/:inspectionId?tab=review` or similar

### Data Requirements
- Tab 1 (Executive Summary): Already loaded in inspection-report.tsx (task, responses, unit, inspector)
- Tab 2 (Review & Categorize): Needs owner report data, issue categories, bundles — currently loaded in owner-report-builder.tsx
- Tab 3 (Owner Report Builder): Needs the same owner report data + preview rendering
- Tab 4 (Owner Responses): Needs owner report items with response data

## Done Looks Like
- PM opens an onboarding inspection report and sees 4 tabs at the top
- Active tab has a teal/colored background, inactive tabs are light grey
- All content loads within the same page — no navigating to separate pages
- The existing "Owner Report" button navigation pattern is removed
- Clicking a phase in the sidebar switches to the corresponding tab
- Workflow sidebar phases are sequential: phase N can't be complete unless phase N-1 is complete
- Phases after an incomplete phase show as locked/not started
- Workflow sidebar from Task #2 still works alongside the tabs
- All existing functionality (categorization, quoting, publishing, response tracking) preserved
