# Temporary Editor Goals

## Objective

Build an editor layer above `engine/*` that owns interaction semantics for the current editor-focused direction of `samcan`. The renderer and document are not enough on their own. The editor must be the single place where tools, selection, pointer interaction, keyboard shortcuts, and command dispatch are coordinated.

## Required Core Concepts

The editor layer should own:

- current tool
- selected element ids
- hovered element id
- active handle
- pointer capture state
- drag state
- marquee state
- clipboard payload
- undo and redo transaction boundaries
- transient guides and overlays

## Tool System

The editor should support a tool model rather than a pile of event handlers. Each tool should define behavior for:

- pointer down
- pointer move
- pointer up
- double click
- key down
- cancel
- hover
- cursor
- overlay rendering

Initial tools:

- select
- hand
- draw
- rectangle
- ellipse
- line
- arrow
- text
- image place

## Selection Model

The selection system should support:

- single select
- multi-select
- marquee select
- shift-toggle select
- selection bounds
- per-element handles
- clear selection on background click

The selection state should not be spread across element objects. Keep selection as editor state, not document state.

## Interaction Semantics

The editor should define stable behavior for:

- click to select
- drag to move
- drag handles to resize
- modifier keys for aspect ratio and center resize
- rotate handles
- double click to enter text edit
- escape to cancel transient interactions
- spacebar hand-pan
- delete and backspace remove selected elements
- duplicate with offset
- paste near pointer or viewport center

## Snapping And Guides

The editor should eventually provide:

- grid snapping
- angle snapping
- edge alignment
- center alignment
- spacing guides
- smart snapping while moving and resizing

This can be added after basic selection and transforms are solid.

## Transactions

Every meaningful interaction should go through a transaction layer. Examples:

- start move
- update move
- commit move
- cancel move

This is required so undo and redo remain predictable.

## Recommended Structure

Suggested future directories:

- `editor/`
- `editor/tools/`
- `editor/history/`
- `editor/hit/`
- `editor/selection/`

The editor should call into `engine/*` and `document/*`. It should not duplicate renderer logic.

## Acceptance Criteria

The editor layer is ready for broader feature work when:

- tool switching is centralized
- pointer interaction is deterministic
- move, resize, and select work without state leaks
- undo and redo boundaries are stable
- keyboard shortcuts are not hard-coded into random view code
