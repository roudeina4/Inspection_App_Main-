# Streamline Executive Summary & Card-Based Review UI

  ## What & Why
  Two UX improvements to the PM onboarding inspection report:

  1. **Executive Summary cleanup**: The Executive Summary tab currently includes Issues Summary, Inspection Walkthrough, and Owner Report Issue Tracker sections that duplicate content available in other tabs. Remove these three sections so the Executive Summary is focused on high-level overview only (unit details, summary stats, unit documentation, owner onboarding).

  2. **Card-based Review & Categorize**: The Review & Categorize tab currently shows all inspection items in a long scrollable list grouped by room accordions. Replace this with a single-card wizard flow where the PM sees one item at a time with Previous/Next navigation buttons, a progress indicator showing current position, and category buttons. This dramatically reduces scrolling and makes the review process more focused.

  ## Done looks like
  - Executive Summary tab shows only: summary stats + progress bar, unit documentation cards, and owner onboarding section. No Issues Summary table, no Inspection Walkthrough room tables, no Owner Report Issue Tracker.
  - Review & Categorize tab displays one inspection item at a time as a card with: item name, room context, result badge, notes, media thumbnails, and category buttons.
  - Previous/Next buttons navigate between items. A progress bar or counter (e.g., "3 of 24") shows position.
  - PM can still categorize each item via the same category buttons (Damage, Cosmetic, Missing, Replacement, Good).
  - Keyboard navigation or skip-to-uncategorized would be nice but not required.

  ## Out of scope
  - Changes to Owner Report Builder or Owner Responses tabs.
  - Changes to non-onboarding (FULL_INSPECTION) report views.
  - Changes to the public owner report.
  - Backend/API changes (this is frontend-only).

  ## Tasks
  1. In `inspection-report.tsx`, remove the "Issues Summary Panel" section (around line 809-876), the "Room-by-Room Inspection Walkthrough" section (around line 878-1118), and the "Owner Report Issue Tracker" section (around line 1233-1400) from the Executive Summary tab content. Keep: Executive Summary header/stats, Unit Documentation, and Owner Onboarding sections.
  2. In `owner-report-builder.tsx`, replace the `reviewTabContent` room-accordion list with a card-based wizard component. Track current item index in state. Render a single card showing the current item's room label, item name, result badge, notes, media, and category buttons. Add Previous/Next buttons and a progress indicator (e.g., "Item 3 of 24" with a progress bar).
  3. Add data-testid attributes to new interactive elements (next/previous buttons, progress indicator, card container).
  4. Test the changes end-to-end.

  ## Relevant files
  - `client/src/pages/pm/inspection-report.tsx:608-1400`
  - `client/src/pages/pm/owner-report-builder.tsx:776-920`
  