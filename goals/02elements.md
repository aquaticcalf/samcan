# Temporary Element Goals

## Objective

Upgrade the scene model from placeholder primitives into fully-rendered, geometry-correct element types.

## Status Snapshot

This file is intended to reflect current reality in code.

Completed recently:

- `image_element` renders real bitmaps (not rectangle-only placeholders)
- image render includes lazy load lifecycle and an explicit error visual state
- image draw preserves source aspect ratio inside placement bounds
- `text_element` renders real glyphs (not rectangle-only placeholders)
- text render supports alignment and line wrapping
- ellipse rendering uses ellipse geometry (not circle fallback)
- arrow rendering includes arrowheads (not plain line fallback)
- arrow hit testing includes arrowhead segments
- basic frame/container element model exists as `shape_type_frame`
- frame tool exists (`f` shortcut) with render, hit, resize, and transform behavior
- moving a selected frame now carries enclosed elements (center-point contain policy)
- first-pass grouping model exists via `group_id` on all element types
- group/ungroup actions exist (`Ctrl/Cmd+G`, `Shift+Ctrl/Cmd+G`)
- selecting or marquee-hitting one member expands to whole group selection
- text caret up/down movement now follows measured wrapped line geometry
- entering text edit on double click now places caret from measured text layout hit point
- text hit testing now uses measured laid-out glyph lines instead of pure element bounds
- text edit overlay now draws measured caret and selection highlight spans

Still missing:

- advanced group semantics (nested groups, lock/isolation behavior, group-level bounds cache)
- deeper frame semantics (persistent child membership, clipping policy, relayout rules)
- connector model
- text selection/caret tied to measured layout geometry
- measured-text bounds as source-of-truth for text hit testing/layout (partial)
- optional shape labels

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

Coverage now:

- freehand strokes: implemented
- rectangles: implemented
- ellipses: implemented
- lines: implemented
- arrows with arrowheads: implemented
- text: partially implemented (render/edit yes, measured caret movement/edit-entry/hit/overlay yes, full layout-aware selection behavior not yet)
- images: partially implemented (render/load/error yes, asset identity separation not yet)
- frames: partially implemented
- groups: partially implemented

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

Current geometry notes:

- strokes: point/polyline-based rendering and hit testing exists
- lines/arrows: endpoint geometry and endpoint resize exist
- arrows: head geometry now participates in both render and hit testing
- text/images: still primarily box-based for editor interaction semantics

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

Current text status:

- actual glyph rendering: done
- editable content: done
- alignment: done
- font family and size: done
- line wrapping: done
- measured bounds: partial
- layout-tied caret/selection: partial

Text should not be treated as a static rectangle for layout or hit testing.

## Images

Image work should include:

- actual bitmap rendering
- preserved aspect ratio controls
- cropping model if desired later
- load state and error state
- asset identity separate from scene placement

Current image status:

- actual bitmap rendering: done
- preserved aspect ratio in placement bounds: done
- load/error state behavior: done in renderer path
- cropping model: not done
- asset identity separate from scene placement: not done

## Shapes

Shape rendering should include:

- proper ellipse geometry
- proper line endpoints
- arrowheads
- optional labels
- rounded corners if desired later

Current shape status:

- proper ellipse geometry: done
- proper line endpoints: done
- arrowheads: done
- optional labels: not done
- rounded corners: not done

## Next Focus (In Order)

1. Expand grouping semantics (nested groups, isolation/lock interactions, group-level metadata).
2. Add deeper frame semantics (membership, clipping, contain/move policy).
3. Add text layout model used by both render and caret/selection/hit behavior.
4. Move image identity to asset references (placement separate from asset lifecycle).

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
