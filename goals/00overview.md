# Temporary Goals

## Purpose

This directory defines the current temporary product-direction goals for `samcan`. `samcan` is a general canvas and scene library, not a whiteboard-only codebase. These notes describe the current near-term direction for building a powerful canvas experience on top of that generic foundation.

The project already has a solid low-level core:

- immutable document and layer model
- camera and viewport math
- stroke processing primitives
- canvas and WebGL renderers
- spatial query helpers

The missing work for this temporary direction is mostly element depth, persistence, assets, and collaboration.

## Current State

The current repository is strongest in these areas:

- `document/*` provides a useful immutable scene model
- `camera/*` and `engine/camera.ts` provide view transforms and viewport logic
- `renderer/*` provides two renderer backends
- `stroke/*` provides stroke capture and processing primitives
- `spatial/*` and `document/query.ts` provide visibility and lookup helpers

The current repository is weakest in these areas:

- no persistence format or migrations
- no collaboration protocol
- image and text elements are still placeholders at render time

## Work Order

The recommended order is:

1. Make existing element types fully real.
2. Add persistence and schema migration.
3. Add collaboration.
4. Push performance and scalability after semantics are stable.

## Non-Goals For Early Iterations

These should not block the first serious milestone:

- server-backed collaboration
- perfect export
- full plugin system
- advanced presentation mode
- arbitrary embeddable widgets

## Files In This Directory

- `goals/02elements.md`: element model and rendering requirements
- `goals/03render.md`: rendering and performance goals
- `goals/04data.md`: document, history, persistence, and migrations
- `goals/05assets.md`: asset loading and image handling
- `goals/06collab.md`: collaboration design and sequencing
