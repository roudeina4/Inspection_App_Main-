## What & Why
Two issues on the onboarding inspection report page:
1. The "Cleaning" section in the Owner Report Builder's live report panel should be removed — it shouldn't appear as a category section alongside Damage, Cosmetic, Missing, and Replacement.
2. The margins/padding around the onboarding inspection report content area are still too large and taking up excessive space.

## Done looks like

### 1. Remove Cleaning section from Owner Report Builder
- Remove "Cleaning" from the section list in the live report panel (line ~2564 of owner-report-builder.tsx: `["Damage", "Cosmetic", "Missing", "Replacement", "Cleaning"]` → `["Damage", "Cosmetic", "Missing", "Replacement"]`)
- Remove the Cleaning Task dialog and its associated state variables (`showCleaningTask`, `cleaningTaskNotes`) and all related UI (lines ~2277-2385 in owner-report-builder.tsx)
- Remove any "Generate Cleaning Task" button that triggers the dialog
- Keep the Cleaning category in the database/backend — only remove the UI section from the report builder

### 2. Further reduce padding in inspection report layout
- Reduce the header bar padding in inspection-report.tsx (currently `px-4 py-4` on line 500)
- Reduce the main content area padding further (currently `px-2 py-3 md:px-3 md:py-4` on line 596)
- Reduce vertical section spacing (currently `space-y-4 md:space-y-5`)
- Reduce the header height by using `py-3` instead of `py-4`
- Consider reducing the gap between sidebar and content

## Relevant files
- `client/src/pages/pm/owner-report-builder.tsx` — Cleaning section in live report panel (line ~2564), Cleaning Task dialog (lines ~2277-2385), state vars (lines ~317-318)
- `client/src/pages/pm/inspection-report.tsx` — Header padding (line ~500: `px-4 py-4`), main content padding (line ~596)

## Constraints
- Do NOT touch `client/src/pages/public-owner-report.tsx`
- Keep the Cleaning issue category in the backend/database — only remove from the report builder UI
- Maintain mobile responsiveness
