---
title: Streamline Onboarding Inspection
---
# Streamline Onboarding Inspection

## What & Why
The onboarding inspection checklist is too long and overwhelming for inspectors. Repeated items (walls, flooring, lights, outlets) appear in every room, making the process tedious. The goal is to make inspections detailed but fast — not boring or exhausting.

## Done looks like
- The inspection feels quick and focused — fewer total cards, no repeated items across rooms
- Rooms only contain furniture/fixtures unique to that room (no walls, floors, lights, outlets repeated everywhere)
- A new "General Fixtures" area collects walls, flooring, lighting, outlets, and windows — each item has a location dropdown (which room) and only shows that dropdown when condition is "Needs Attention" or worse
- All major appliances (fridge, washer, dryer, dishwasher, oven, microwave, etc.) are consolidated into one "Appliances" area
- Photo/Video buttons appear at the TOP of every card (before condition selector)
- Photo/video is NOT required when an item is in good condition — only required when there's an issue
- Model number fields are removed entirely (too hard for users to type on mobile)
- Card titles use simple, everyday words (e.g., "Light" not "Chandelier/Light", "Fan" not "Exhaust Hood")
- Kitchen appliances that were in the kitchen area (oven, microwave, coffee machine, kettle, exhaust hood, garbage disposal) move to the Appliances area
- The "Closet" area keeps only closet-specific items (iron, iron board, vacuum, hangers, closet door, shelves); fuse box moves to General Fixtures
- Overall card count is significantly reduced while maintaining inspection detail

## Out of scope
- Changes to the Full Inspection (cleaner) flow
- Changes to the submission/backend logic (already works)
- Changes to the PM report display

## Tasks
1. **Restructure AREA_CHECKLIST_CONFIG** — Remove walls, flooring, ceiling light, outlets, windows, blinds/curtains from every room config (living_room, dining_room, kitchen, bedroom, bathroom). Consolidate all appliances into the existing "appliances" area (add oven, microwave, coffee machine, kettle, exhaust hood, garbage disposal, HVAC, thermostat from kitchen/living_room). Simplify item names throughout (e.g., "Light" instead of "Chandelier/Light", "Fan" instead of "Exhaust Hood"). Remove all hasModelNumber fields.

2. **Add "General Fixtures" area** — Create a new area in generateAreas() for shared fixtures (Walls, Flooring, Lights, Outlets, Windows, Blinds/Curtains). Each item gets a hasLocation field with a room dropdown (populated from the unit's generated rooms). The location dropdown only appears when condition is not "Good".

3. **Update media requirement logic** — Change isAreaComplete and the submission validation so photo/video is only required when item has issues (condition !== "Good" or issues.length > 0). Move Photo/Video capture buttons to the top of each checklist card (before the condition selector).

4. **Move fuse box to General Fixtures** — Remove from closet config and add to general fixtures with a location field.

## Relevant files
- `client/src/pages/onboarding-inspection.tsx:539-703`
- `client/src/pages/onboarding-inspection.tsx:891-904`
- `client/src/pages/onboarding-inspection.tsx:150-400`