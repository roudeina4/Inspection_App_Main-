---
title: Reduce padding in onboarding inspection report layout
---
## What & Why
The onboarding inspection report page has excessive padding around both the workflow sidebar timeline tracker on the left and the owner report builder content on the right. This wastes screen space and makes the layout feel too spread out.

## Done looks like
- Tighter padding around the workflow sidebar (reduce px-5/pt-5/pb-4 header padding and px-3 phase list padding)
- Reduced padding in the main content area (currently px-3 py-4 md:px-4 md:py-6 on line 596 of inspection-report.tsx)
- Tighter spacing in the split-view owner report builder panels (pr-3/pl-3 on lines 2727/2735 of owner-report-builder.tsx)
- Overall more compact, space-efficient layout while maintaining readability

## Relevant files
- `client/src/components/workflow-sidebar.tsx` — SidebarContent header padding (line 214: px-5 pt-5 pb-4), phase list padding (line 228: px-3 pb-4)
- `client/src/pages/pm/inspection-report.tsx` — Main content area padding (line 596: px-3 py-4 md:px-4 md:py-6 space-y-5 md:space-y-6)
- `client/src/pages/pm/owner-report-builder.tsx` — Split-view panel padding (lines 2727/2735: pr-3 pl-1 / pl-3 pr-1)

## Constraints
- Do NOT touch `client/src/pages/public-owner-report.tsx`
- Maintain mobile responsiveness
- Keep the layout readable — reduce padding, don't eliminate it