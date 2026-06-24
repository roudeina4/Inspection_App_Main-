# Add Search Bar to Review & Categorize Wizard

## What & Why
PMs reviewing and categorizing inspection items navigate one card at a time using Previous/Next buttons. When they need to revisit a previously categorized item, they have to click "Previous" many times. A search bar at the top of the wizard will let them quickly find and jump to any item by name or room.

## Done looks like
- A search input appears at the top of the Review & Categorize wizard (above the progress bar)
- Typing shows a dropdown list of matching items (matched by item name or room name, case-insensitive)
- Each result shows room name, item name, and categorization status (colored dot or badge)
- Clicking a search result jumps `reviewCardIndex` directly to that item's index in `flatItems`
- Clearing the search (X button) dismisses the dropdown
- Works alongside existing Previous/Next navigation, dot indicators, and "Skip to next uncategorized" button
- Mobile-responsive

## Relevant files
- `client/src/pages/pm/owner-report-builder.tsx` — Review tab content, `flatItems` array, `reviewCardIndex` state, navigation controls (around lines 774-980)

## Technical approach
- Add a search input with Search icon and X clear button above the progress bar in the review tab section
- On input change, filter `flatItems` by item label or room name matching the search query (case-insensitive substring match)
- Render a dropdown/popover below the input showing filtered results (max ~8 visible with scroll)
- Each result row: room name (muted) + item name + category badge if categorized
- Clicking a result calls `setReviewCardIndex(matchedIndex)` and clears search
- Close dropdown on blur/escape
- No backend changes needed — purely frontend filtering of existing `flatItems` array
- Add appropriate `data-testid` attributes for testing
