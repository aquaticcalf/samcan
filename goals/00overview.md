# Temporary Goals

## Purpose

This directory defines the current temporary product-direction goals for `samcan`.
The interaction layer is now in place, so the next phase focuses on making scene content, persistence, assets, and collaboration production-ready.

`samcan` already has a strong base:

- immutable document and layer model
- camera and viewport math
- stroke processing primitives
- canvas and WebGL renderers
- spatial query helpers

The missing work is now concentrated in:

- element rendering depth and geometry correctness
- durable persistence and migration
- asset identity and loading lifecycle
- collaboration protocol and merge semantics

## Current State

The current repository is strongest in these areas:

- `document/*` provides a useful immutable scene model
- `camera/*` and `engine/camera.ts` provide view transforms and viewport logic
- `renderer/*` provides two renderer backends
- `stroke/*` provides stroke capture and processing primitives
- `spatial/*` and `document/query.ts` provide visibility and lookup helpers

The current repository is weakest in these areas:

- no stable persistence format or migration flow
- no collaboration protocol or sync strategy
- image and text elements are still placeholders at render time

## Work Order

The recommended order is:

1. Make existing element types fully real.
2. Add persistence and schema migration.
3. Add collaboration.
4. Push performance and scalability after semantics are stable.

## Non-Goals For Early Iterations

These should not block the next serious milestone:

- server-backed collaboration
- perfect export
- full plugin system
- advanced presentation mode
- arbitrary embeddable widgets

## Next Milestone

The next milestone should deliver:

- real text rendering and measurement
- real image rendering and load/error states
- versioned save/load with migrations
- stable autosave and crash recovery
- asset identity separated from placement data

## Files In This Directory

- `goals/02elements.md`: element model and rendering requirements
- `goals/03render.md`: rendering and performance goals
- `goals/04data.md`: document, history, persistence, and migrations
- `goals/05assets.md`: asset loading and image handling
- `goals/06collab.md`: collaboration design and sequencing
