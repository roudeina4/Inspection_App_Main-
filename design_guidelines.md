# TBA Inspection Checklist App - Design Guidelines

## Design Approach

**Selected System:** Material Design 3 (Adapted for Professional Inspection Workflows)

**Rationale:** Dual-interface inspection application requiring robust forms, touch-optimized mobile components for field operations, data-dense desktop layouts for management, and strong accessibility patterns. Material Design 3 provides necessary structure while supporting professional property management aesthetics.

**Key Design Principles:**
- Clarity over decoration: Every element serves the inspection workflow
- Touch-first mobile: Large targets, simple gestures, minimal scrolling
- Data density desktop: Efficient information display for decision-making
- Trust through consistency: Predictable patterns build user confidence

---

## Typography

**Font Families:**
- Primary: Inter (400, 500, 600, 700) via Google Fonts
- Monospace: JetBrains Mono for inspection IDs, unit codes, timestamps

**Type Scale:**
- Page Titles: text-3xl md:text-4xl font-bold (mobile: 30px, desktop: 48px)
- Section Headers: text-2xl font-semibold (24px)
- Card Titles: text-lg font-semibold (18px)
- Body/Form Labels: text-base font-medium (16px)
- Input Text: text-base (16px - prevents mobile zoom on focus)
- Supporting Text: text-sm font-normal (14px)
- Captions/Metadata: text-xs font-medium (12px)

**Hierarchy Enforcement:**
- Headers use increased letter-spacing (tracking-tight for titles)
- Form labels always font-medium for scannability
- Critical actions use font-semibold
- Timestamps and IDs use monospace for distinction

---

## Layout System

**Spacing Primitives:** Tailwind units 2, 4, 6, 8, 12, 16, 20

**Application:**
- Card padding: p-6 (mobile), p-8 (desktop)
- Section spacing: py-12 (mobile), py-16 md:py-20 (desktop)
- Element gaps: gap-4 (compact), gap-6 (standard), gap-8 (spacious)
- Input spacing: mb-6 between fields
- Screen edges: px-4 (mobile), px-6 md:px-8 (desktop)

**Containers:**
- Mobile Inspector: Full-width with px-4 safe area padding
- Admin Portal: max-w-7xl centered, px-6 lg:px-8
- Forms: max-w-2xl for readability
- Modals: max-w-md (alerts), max-w-2xl (forms), max-w-5xl (inspection reviews)
- Tables: Full-width with horizontal scroll on mobile

**Grid Patterns:**
- Dashboard: grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6
- Unit cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
- Media galleries: grid-cols-3 md:grid-cols-4 gap-2
- Inspection items: Single column vertical flow

---

## Component Library

### Mobile Inspector Interface

**Bottom Navigation Bar:**
- Fixed bottom with safe area padding, h-16, backdrop-blur
- 3-4 primary actions: Home, Inspections, Quick Report, Profile
- Icons (24px) with labels (text-xs), active state with accent indicator

**Inspection Checklist Cards:**
- Full-width with rounded-xl, p-6, shadow-sm
- Thick left border (border-l-4) for status: gray (pending), blue (in-progress), green (complete)
- Item name: text-base font-semibold mb-2
- Pass/Fail/NA buttons: Grid of 3, min-h-14, rounded-lg, icon + label
- Notes textarea: Collapsible, min-h-24, placeholder guidance
- Photo upload zone: Prominent with camera icon, min-h-32, dashed border
- Media thumbnails: grid-cols-3 gap-2, aspect-square with delete overlay

**Room Navigation:**
- Sticky top bar: "Kitchen (3 of 8)" counter, text-lg font-semibold
- Progress bar: h-2 rounded-full, animated fill
- Navigation: Previous/Next buttons, Next disabled until room complete
- Exit inspection: Ghost button in header corner

**Quick Report Form:**
- Vertical single-screen flow with scroll
- Unit search: Large dropdown with search, recent units shown first
- PM assignment: Pill display with change button
- Issue description: Auto-expanding textarea, min-h-32
- Photo capture: Large centered zone with camera icon, text-base instructions
- Media preview: Horizontal scroll gallery
- Submit: Sticky bottom full-width button, h-14, font-semibold

### Admin Portal Components

**Dashboard Metrics:**
- Card: rounded-xl p-6 shadow-sm
- Metric value: text-5xl font-bold, tabular numbers
- Icon: Absolute top-right, w-12 h-12, subtle background circle
- Label: text-sm font-medium above value
- Trend: Small sparkline or percentage with arrow icon
- Click state: Entire card is hover-able with subtle lift

**Inspection Management Table:**
- Sticky header: font-semibold, border-b-2
- Row height: min-h-16 for comfortable touch
- Status badge: Inline rounded-full px-3 py-1.5 text-xs font-semibold
- Actions dropdown: Right-aligned, icon button reveals menu
- Responsive: Hide "Assigned To" and "Date" columns on mobile, show in expanded row
- Pagination: Bottom bar with items-per-page selector and page numbers

**Inspection Detail Modal:**
- Header: Inspection ID + status badge, close button top-right
- Metadata sidebar: Unit info, PM, inspector, timestamps (w-64 on desktop)
- Main content: Scrollable room accordion
- Room sections: Expandable with item count badge
- Item display: Icon + status dot + item name + notes + media thumbnails in row
- Media lightbox: Click thumbnail for full-screen gallery with navigation
- Action footer: Sticky with Reject (outlined), Request Changes (outlined), Approve (solid) buttons

**Filters & Search:**
- Desktop: Permanent left sidebar w-64, sticky positioning
- Mobile: Slide-over drawer from left, full-height
- Filter groups: Collapsible sections with chevron icons
- Date picker: Dual calendar for range selection
- Multi-select: Checkboxes with search for long lists
- Clear filters: Text button at top, shows count when active
- Apply: Sticky bottom button on mobile

**Data Tables:**
- Zebra striping for row distinction (subtle)
- Sort icons in headers (both directions shown, active highlighted)
- Empty state: Centered illustration + text-base message + action button
- Loading state: Skeleton rows with pulse animation
- Row hover: Subtle background change, cursor pointer if clickable

### Universal Components

**Buttons:**
- Primary: Solid, rounded-lg, px-6 py-3, text-base font-semibold, min-h-11
- Secondary: Outlined border-2, same padding
- Ghost: No border, hover background, same padding
- Icon-only: w-11 h-11 square, rounded-lg
- Destructive: Red variant for delete/archive actions
- Loading state: Spinner replaces text, button disabled

**Form Inputs:**
- Label: Block above, text-sm font-medium mb-2
- Input: border-2 rounded-lg px-4 py-3 text-base, focus:ring-4
- Textarea: Same styling, min-h-24, auto-resize
- Select: Chevron icon right, same height as inputs
- Checkbox/Radio: w-5 h-5 with focus ring
- Required indicator: Red asterisk after label
- Error: Red border-2, red text-sm message below, icon prefix
- Success: Green border, checkmark icon
- Disabled: opacity-60, cursor-not-allowed, grayed background

**Status Indicators:**
- Badge: rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide
- States: Assigned (gray), In Progress (blue), Submitted (purple), Approved (green), Changes Requested (yellow), Archived (gray faded)
- Always include icon prefix for accessibility

**Media Handling:**
- Upload zone: Dashed border-2, rounded-xl, p-8, centered icon + text
- Thumbnail grid: aspect-square, rounded-lg, overflow-hidden
- Video indicator: Play icon overlay, bottom-right timestamp
- Lightbox: Dark backdrop, centered image/video, navigation arrows, close X top-right
- Delete: X button overlay on hover, top-right corner of thumbnail

**Notifications:**
- Toast: Fixed top-right, max-w-sm, slide-in-right animation 200ms
- Success/Error/Info variants with icon
- Auto-dismiss after 5s, manual close button
- Notification bell: Badge count, slide-over panel with list

---

## Validation & States

**Required Field Strategy:**
- Red asterisk immediately after label text
- Upload zones: "Required" badge in corner
- Bottom barrier: Red banner with list of missing items prevents submission

**Validation Feedback:**
- Inline on blur for text inputs
- Immediate for selections (checkboxes, radios)
- Green checkmark icon for completed sections
- Disabled next buttons with tooltip explaining requirements
- Progress indicators update in real-time

**Empty States:**
- Simple line illustration (not photos)
- Concise message: text-lg font-medium
- Helpful action button below
- Examples: "No inspections assigned", "No units created yet"

---

## Images

**No Hero Images** - This is a professional utility application focused on workflow efficiency over visual marketing.

**Image Usage Limited To:**
- User-uploaded inspection media in galleries
- Simple line illustrations for empty states
- Icons from Heroicons (outline style for inactive, solid for active)

---

## Responsive Strategy

**Mobile (Primary for Inspectors):**
- Single column layouts, full-width components
- Bottom navigation, sticky headers
- Touch targets minimum h-11 (44px)
- Comfortable spacing for thumbs

**Desktop (Primary for Admin):**
- Breakpoints: md:768px, lg:1024px, xl:1280px
- Permanent left navigation on lg+
- Multi-column grids and tables
- Hover states and keyboard shortcuts
- Dense information display with whitespace balance

---

## Animations

**Minimal & Purposeful:**
- Page transitions: 150ms fade
- Drawers/modals: 200ms slide-in
- Success checkmark: 300ms scale-in
- Progress bars: Smooth animated fill
- No scroll animations, no decorative motion
- Focus: Disable animations when prefers-reduced-motion

---

## Accessibility

- Semantic HTML with proper heading hierarchy
- Form labels programmatically associated
- Focus indicators: 4px ring with 2px offset
- Status communicated via icon + text (not color alone)
- Keyboard navigation: Logical tab order, skip links
- ARIA labels on icon-only buttons and decorative elements
- Minimum contrast ratios: 4.5:1 for text, 3:1 for UI components