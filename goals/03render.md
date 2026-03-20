# Temporary Render Goals

## Objective

Keep rendering fast enough for very large scenes while preserving correct behavior for transforms, images, strokes, and overlays in the current direction.

## Current Strengths

The current render layer already has:

- canvas backend
- WebGL backend
- path and stroke caching
- visibility query support from document bounds helpers
- safer WebGL texture handling for image readiness

## Immediate Rendering Priorities

The next rendering milestones should be:

- render actual image elements, not placeholders
- render actual text elements
- keep transform behavior consistent across all element types
- preserve correctness for mutable image sources

## Important Constraints

A rectangular image should stay a single quad in WebGL. Splitting one image into many rectangles is not a useful optimization for normal scene rendering. The real bottlenecks are:

- texture uploads
- cache invalidation
- draw order changes
- buffer churn
- unnecessary redraw work

## Performance Roadmap

The major performance work should be:

1. dirty-region and invalidation strategy
2. explicit image version invalidation for mutable sources
3. less per-draw setup in hot paths
4. workerized heavy geometry generation where useful
5. large-scene culling and level-of-detail policies

## Scene Scale Features

To handle very large boards, the renderer and engine will eventually need:

- viewport culling
- chunked or tiled invalidation
- selective redraw
- asset lifetime management
- large-scene camera stability

## Overlay Requirements

The render system must support transient overlays such as:

- selection bounds
- resize handles
- rotate handles
- snap guides
- hover affordances
- remote presence indicators

These overlays should remain interaction-layer controlled, not baked into document elements.

## Image Rendering Expectations

Image rendering should eventually distinguish:

- immutable loaded images
- mutable canvas-backed images
- not-yet-ready images
- failed assets

The WebGL path should upload only when necessary, while still remaining correct.
