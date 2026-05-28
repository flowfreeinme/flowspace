# Home Smart Auto Arrange Design

## Goal

Make the Home screen feel spacious and intentional when users add more widgets, while keeping full manual customization. The visible improvement should be obvious: editing Home should feel like working on a roomy dashboard canvas, not squeezing widgets into a compact fixed grid.

## Chosen Direction

Use the Spacious Canvas direction with a Smart Auto Arrange control.

Auto arrange is an optional cleanup tool. It should never replace manual customization. Users can still add, remove, resize, configure, and later rearrange widgets by hand. Auto arrange simply gives them a clean layout when the dashboard starts to feel crowded.

## Home Edit Menu

The edit menu should read as a real control panel:

- Title: `Home menu`
- Primary actions: `Auto arrange`, `Reset`, `Done`
- Widget catalog with larger cards and clear `Add` / `Added` states
- Widget descriptions remain visible and readable

The menu should be compact enough to avoid taking over the screen, but visually stronger than the existing dashed footer button. It should make editing mode feel deliberate.

## Spacious Canvas

The Home widget area should become a scrollable dashboard workspace:

- Taller desktop grid with more rows than the original 12-row layout
- Larger gaps between widgets
- Visible edit-mode boundary and subtle grid lines while editing
- Larger minimum visual rows so widgets do not feel compressed
- Mobile keeps a single-column stacked layout with comfortable vertical spacing

The canvas should make it clear that widgets can live below the initial viewport. Adding widgets should not imply everything must fit above the fold.

## Smart Auto Arrange Behavior

Add an `Auto arrange` action to the Home menu.

When clicked, it should:

- Preserve the set of active widgets
- Preserve widget settings
- Keep calendar prominent when present
- Place smaller widgets into readable groups beside or below the calendar
- Give planner, weather, and timer enough height to be useful
- Avoid overlapping widgets
- Produce deterministic layouts so the result is predictable

Auto arrange should be implemented as a pure layout helper in `src/lib/homeCenter.ts`, then wired through the workspace store and Home UI.

## Manual Customization

Manual control stays intact:

- Users can add individual widgets
- Users can remove non-calendar widgets
- Users can resize widgets from corners in edit mode
- Widget settings stay attached to each widget
- Auto arrange can be used repeatedly, but does not lock the user into the arranged layout

## Suggested Layout Rules

For desktop:

- Calendar: large left/top area when multiple widgets exist
- Today / weather / timer: readable side stack or top-right cluster
- Focus / recent / quick capture / planner: lower rows in spacious groups
- If many widgets are active, continue placing down the canvas instead of shrinking everything

For mobile:

- Keep one column
- Use comfortable row spans
- Auto arrange should mostly normalize order rather than attempt complex positioning

## Tests

Add focused tests for layout helpers:

- Auto arrange preserves all widget ids/types
- Auto arrange keeps calendar present and prominent
- Auto arrange avoids overlapping widgets
- Add-widget placement still finds open space
- Existing template merge behavior remains stable

## Out Of Scope

- Drag-and-drop widget movement
- Named layout presets such as `Focus`, `Planning`, or `Balanced`
- Multi-home dashboards
- Persisted undo history for layout changes

Those can build on this later once the Home editing experience feels good.
