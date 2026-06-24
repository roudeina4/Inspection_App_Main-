---
title: Polish split-view right panel: collapsible sections, less clutter, real-time category updates
---
# Polish Split-View Right Panel: Collapsible Sections & Real-Time Category Updates

## What & Why
The Owner Report Builder right panel in the split-view is too crowded and has two UX issues:
1. **Too crowded**: All category sections are expanded by default, forcing excessive scrolling
2. **No real-time feedback**: When PM categorizes an item on the left review card, the right panel should immediately show the item appearing in the correct section

## Done looks like

### 1. Collapsible Category Sections
- Each category section header (Damage, Cosmetic, Missing, Replacement, Cleaning) is clickable with a rotating chevron icon and item count badge
- Sections start collapsed by default for a compact overview
- Clicking the header toggles expand/collapse
- When a new item is categorized into a section, that section auto-expands

### 2. Reduce Visual Clutter
- Remove `StructuredDescription` from items in the compact right panel — keep just item name + cost estimate + vendor badge
- Tighten padding and margins on item cards  
- Compact the action button row (PDF, Public Link, Copy, Publish) — use icon-only buttons with tooltips instead of text labels

### 3. Real-Time Item Appearance
- When PM assigns a category on the left panel, the newly categorized item should appear in the right panel with a brief highlight animation (flash teal background, fade after ~1 second)
- If the target section was collapsed, auto-expand it and scroll the new item into view
- Track `lastCategorizedItemId` in component state, set it on categorize, apply a CSS transition class

## Relevant files
- `client/src/pages/pm/owner-report-builder.tsx` — the `liveReportPanel` IIFE (~line 2400-2576) and the split-view container (~line 2578)

## Technical notes
- The liveReportPanel already filters `reportItems` by category. When PM categorizes via the review wizard, React Query invalidation triggers a re-render with updated `reportItems`, so data updates automatically. The issue is visual feedback and clutter.
- For collapsible sections, add `expandedSections` state (Set<string>) to the component (not the IIFE). Default to empty set (all collapsed). On categorize, add the target category to `expandedSections`.
- For highlight animation, track `lastCategorizedItemId` in state. Set on categorize, apply a CSS class with `@keyframes` that fades teal bg. Clear after timeout.
- Use `useRef` + `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` to scroll new item into view.