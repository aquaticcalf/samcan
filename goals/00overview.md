# Temporary Goals

## Purpose

This directory defines the current temporary product-direction goals for `samcan`. `samcan` is a general canvas and scene library, not a whiteboard-only codebase. These notes describe the current near-term direction for building a powerful canvas editor on top of that generic foundation.

The project already has a solid low-level core:

- immutable document and layer model
- camera and viewport math
- stroke processing primitives
- canvas and WebGL renderers
- spatial query helpers

The missing work for this temporary direction is mostly editor architecture, interaction semantics, persistence, assets, and collaboration.

## Current State

The current repository is strongest in these areas:

- `document/*` provides a useful immutable scene model
- `camera/*` and `engine/camera.ts` provide view transforms and viewport logic
- `renderer/*` provides two renderer backends
- `stroke/*` provides stroke capture and processing primitives
- `spatial/*` and `document/query.ts` provide visibility and lookup helpers

The current repository is weakest in these areas:

- no editor state machine
- no tool system
- no hit testing or selection handles
- no undo/redo history model
- no persistence format or migrations
- no collaboration protocol
- image and text elements are still placeholders at render time

## Work Order

The recommended order is:

1. Build the editor layer.
2. Make existing element types fully real.
3. Add hit testing and manipulation handles.
4. Add history and clipboard semantics.
5. Add persistence and schema migration.
6. Add collaboration.
7. Push performance and scalability after semantics are stable.

## Non-Goals For Early Iterations

These should not block the first serious editor milestone:

- server-backed collaboration
- perfect export
- full plugin system
- advanced presentation mode
- arbitrary embeddable widgets

## Expected First Serious Milestone

The first milestone should support:

- pan and zoom
- stable selection model
- marquee selection
- resize and move for shapes
- stroke drawing tool
- shape tool
- image placement
- text editing
- undo and redo
- clipboard copy, cut, paste, duplicate
- autosave to a local format

## Files In This Directory

- `goals/01editor.md`: editor architecture and interaction model
- `goals/02elements.md`: element model and rendering requirements
- `goals/03render.md`: rendering and performance goals
- `goals/04data.md`: document, history, persistence, and migrations
- `goals/05assets.md`: asset loading and image handling
- `goals/06collab.md`: collaboration design and sequencing
