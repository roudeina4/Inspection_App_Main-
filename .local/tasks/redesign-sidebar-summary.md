# Redesign Workflow Sidebar & Executive Summary

  ## What & Why
  Redesign the workflow sidebar phase list styling and truncate the Model Numbers card to match the provided mockup. The current phase items use different icon styling and lack the active-phase highlight shown in the design. The Model Numbers card currently lists all items, causing it to grow very long.

  ## Done looks like
  - **Sidebar header**: Keeps the existing progress ring and percentage display — no changes here
  - **Phase icons**:
    - Completed: Teal/green filled circle with white checkmark (current ✓)
    - Active/In Progress: Blue filled circle with white dot, surrounded by a blue ring highlight, row has blue-50 background
    - Pending (system phases): Gray circle with clock icon, subtitle shows status text (e.g., "Owner report not created", "Awaiting owner responses")
    - Pending (manual phases): Gray circle with chevron ">", subtitle shows task count (e.g., "44 tasks", "4 tasks", "3 tasks")
  - **Connecting line**: Thin vertical line between phase icons (already exists)
  - **Active phase**: The in-progress phase row gets a subtle blue-50 background highlight with a left blue ring/border
  - **Content area unchanged** — Executive Summary stats and Unit Documentation cards remain as-is
  - **Model Numbers card**: Truncated to show max ~5 items with "and X more..." text if there are additional items

  ## Out of scope
  - Tab content changes (Review & Categorize wizard, Owner Report Builder, Owner Responses)
  - Backend/API changes
  - Mobile layout changes (MobileWorkflowTrigger)
  - Sidebar header/progress ring changes

  ## Tasks
  1. Redesign PhaseItem icons: keep completed (teal circle + white check), update active (blue circle + white dot with blue ring and blue-50 row background), update pending system (gray circle + clock icon), update pending manual (gray circle + chevron and task count text).
  2. Add blue-50 background highlight to the active/in-progress phase row.
  3. Add max-items logic to Model Numbers card in inspection-report.tsx: show max 5 items, then "and X more..." text.
  4. Verify layout matches the mockup visually across all phase states.

  ## Relevant files
  - `client/src/components/workflow-sidebar.tsx`
  - `client/src/pages/pm/inspection-report.tsx:780-804`
  - `client/src/lib/workflow-phases.ts`
  