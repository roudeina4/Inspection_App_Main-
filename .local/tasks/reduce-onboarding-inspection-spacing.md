# Reduce Excessive Spacing on Onboarding Inspection Page

## What & Why
The onboarding inspection page has too much padding and spacing around the content, making it feel like the checklist items are floating in a sea of whitespace instead of using the available screen real estate. This is especially noticeable on desktop where the sidebar already takes 256px.

## Done looks like
- Content fills the available space more effectively without feeling cramped
- Reduced outer padding on the main content area (currently `p-6` = 24px all around)
- Tighter vertical spacing between checklist item cards
- The area header section on desktop is more compact
- Bottom padding on mobile remains adequate for the fixed action bar
- Overall the page feels like a productive work tool, not a presentation

## Changes
1. **Main content padding**: Reduce `p-6` to `p-4 lg:px-5 lg:py-4` on the `<main>` element (line ~1920)
2. **Checklist card spacing**: Reduce `space-y-4` to `space-y-3` for the card container
3. **Area header**: Make the desktop area title section (`mb-6`) more compact — reduce to `mb-4`, possibly smaller text
4. **Card internal padding**: Review `CardContent` padding on checklist items (currently `p-3 sm:p-4`) — keep as-is since those are already reasonable
5. Keep the mobile bottom padding (`pb-32`) since the fixed action bar needs clearance

## Relevant files
- `client/src/pages/onboarding-inspection.tsx` — lines ~1920 (main padding), ~1921 (space-y-4), ~1922 (area header mb-6)
