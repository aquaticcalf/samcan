# Temporary Element Goals

## Objective

Upgrade the scene model from placeholder primitives into fully-rendered, geometry-correct element types.

## Current Gaps

Current problems:

- `image_element` renders as a rectangle placeholder
- `text_element` renders as a rectangle placeholder
- ellipse shapes are treated like circles
- arrows are treated like plain lines
- there is no grouping
- there is no frame or container element
- there is no connector model

## Element Requirements

The project should support at least:

- freehand strokes
- rectangles
- ellipses
- lines
- arrows with arrowheads
- text
- images
- frames
- groups

Optional later additions:

- sticky notes
- connectors
- embeds
- tables

## Geometry Expectations

Each element type should define:

- world-space bounds
- local anchors or handles
- hit test behavior
- resize semantics
- rotation semantics
- render semantics

Do not rely on bounds alone for every operation. Strokes, arrows, and text all need richer geometry than a single rectangle.

## Text

Text work should include:

- actual glyph rendering
- editable content
- alignment
- font family and size
- measured bounds
- line wrapping
- selection and caret behavior tied to measured text layout

Text should not be treated as a static rectangle for layout or hit testing.

## Images

Image work should include:

- actual bitmap rendering
- preserved aspect ratio controls
- cropping model if desired later
- load state and error state
- asset identity separate from scene placement

## Shapes

Shape rendering should include:

- proper ellipse geometry
- proper line endpoints
- arrowheads
- optional labels
- rounded corners if desired later

## Future Model Extensions

Likely future fields:

- `rotation`
- `locked`
- `visible`
- `group_id`
- `asset_id`
- `style`
- `label`

These should be added carefully, with a migration strategy in `goals/04data.md`.
