---
title: Merge Review & Categorize + Owner Report Builder into split-view layout
---
# Merge Review & Categorize + Owner Report Builder into Split-View Layout

## What & Why
Currently, "Review & Categorize" (phase 1) and "Owner Report Builder" (phase 2) are separate phase views that PMs switch between using the sidebar. The user wants them merged into a single split-view so the PM can categorize items on the left while seeing the live owner report update on the right — eliminating the back-and-forth between phases.

## Reference
See mockup: `attached_assets/455_1773882814356.png`

## Done looks like
- Phases 1 and 2 in the sidebar are merged into a single phase that shows a split-view layout
- **Left card**: "Review & Categorize" — the existing item wizard (search bar, item card with room/name/result/notes/media, categorization buttons, Previous/Next navigation, progress info, skip-to-uncategorized)
- **Right card**: "Owner Report Builder" — a live preview showing categorized items grouped by category sections (Damages, Cosmetic, Missing, Replacement), with item details (structured description, cost info, owner responses). This panel updates in real time as items are categorized on the left
- Both cards are side-by-side in a 50/50 (or similar) split, each independently scrollable
- Right card header shows "Owner Report Builder" title + count of categorized items
- On mobile/small screens, falls back to stacked layout (left on top, right below) or a toggle between the two views
- The sidebar shows a single combined phase for this view instead of two separate phases

## Relevant files
- `client/src/pages/pm/owner-report-builder.tsx` — contains both `reviewTabContent` and `reportTabContent` render logic, all state/queries/mutations
- `client/src/pages/pm/inspection-report.tsx` — renders `OwnerReportBuilderContent` for phases 1 and 2 separately; needs to render a single split-view for the combined phase
- `client/src/components/workflow-sidebar.tsx` — sidebar phase display
- `client/src/lib/workflow-phases.ts` — phase status derivation logic

## Technical approach

### 1. Create a new embedded layout mode in OwnerReportBuilderContent
- Add a new `initialTab="split"` mode (or a `splitView` boolean prop) to `OwnerReportBuilderContent`
- When in split-view mode, render both `reviewTabContent` and `reportTabContent` side-by-side in a flex container
- Left panel: the existing review wizard (search, card, categorization, nav)
- Right panel: the report builder content showing categorized items grouped by category, with structured descriptions. This is the existing report preview content (the item cards grouped by category), not the settings/bundles editing UI
- Both panels get `overflow-y-auto` for independent scrolling within the fixed viewport height

### 2. Update inspection-report.tsx phase rendering
- Replace the two separate `activePhase === 1` and `activePhase === 2` blocks with a single block that renders the split-view
- The combined view activates when clicking either the "Report Review" or "Owner Report Builder" phase in the sidebar (both map to the same split-view)

### 3. Sidebar phase consolidation
- In the sidebar, phases 1 and 2 can remain as separate phases in the data model (no schema changes), but clicking either one navigates to the same split-view
- Alternatively, have phase 1 show the split-view and phase 2 link to report settings/publish actions

### 4. Mobile responsiveness
- On screens < md breakpoint: stack the two panels vertically or show a tab toggle between Review and Report views
- Ensure the search bar and navigation controls remain usable on mobile

### 5. No backend/schema changes needed
- This is purely a frontend layout restructure
- All existing queries, mutations, and data flow remain the same