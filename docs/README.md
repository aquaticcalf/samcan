# Whiteboard Documentation

This directory contains design specifications for the infinite whiteboard system. Each document explains the problem being solved, design decisions made, and implementation guidance.

## Reading Order

### Phase 1: Foundation

**Start here** - These modules form the core infrastructure:

1. **camera.md** - Viewport navigation (pan, zoom, coordinate conversion)
   - Why: Everything else depends on knowing where you're looking
   - Key concepts: world vs screen coords, zoom-toward-cursor, view transforms

2. **renderer.md** - Drawing abstraction (Canvas 2D / WebGL)
   - Why: You need to draw before you can see what you're building
   - Key concepts: path commands, frame batching, backend abstraction

### Phase 2: Core Data

**Next** - The data model that everything manipulates:

3. **document.md** - Element storage and organization
   - Why: Defines what can exist on the whiteboard
   - Key concepts: flat element list, immutable updates, discriminated unions

4. **spatial.md** - Fast spatial queries
   - Why: Can't iterate 10k elements per frame
   - Key concepts: quadtree integration, bounds caching, culling

### Phase 3: Drawing Features

**Then** - The main whiteboard features:

5. **stroke.md** - Freehand drawing
   - Why: Most common interaction
   - Key concepts: stabilization, simplification, spline fitting

6. **shapes.md** - Geometric primitives
   - Why: Structured content, diagrams
   - Key concepts: transform-based positioning, handles, hit testing

7. **lod.md** - Level-of-detail rendering
   - Why: Performance at scale
   - Key concepts: zoom-based detail, pre-computation, blending

### Phase 4: Integration

**Finally** - Systems that tie everything together:

8. **input.md** - Pointer and gesture handling
   - Why: Translates user input to document changes
   - Key concepts: pointer state, gesture recognition, pressure normalization

9. **react.md** - React framework bindings
   - Why: Most users will consume this from React
   - Key concepts: hooks, controlled state, granular re-renders

10. **undo.md** - Undo/redo system
    - Why: Essential user feature
    - Key concepts: command pattern, transactions, merging

11. **serialization.md** - Save/load format
    - Why: Persistence
    - Key concepts: JSON schema, migrations, compression

## Quick Reference

**Implementing a new whiteboard**: 1 → 2 → 3 → 4 → 5 → 6 → 8 → 9

**Optimizing an existing one**: 4 → 7

**Adding a new tool**: 5 or 6 (depending on type) + 8

**Building a non-React integration**: Skip 9, implement directly against core APIs

## Dependencies Between Modules

```
camera ← renderer (view transform for rendering)
camera ← spatial (frustum for culling)
camera ← lod (zoom level for detail selection)
camera ← input (coordinate conversion)

document ← stroke (stroke is element type)
document ← shapes (shape is element type)
document ← spatial (elements feed into index)
document ← undo (commands modify document)
document ← serialization (document is what gets saved)

renderer ← stroke (render stroke paths)
renderer ← shapes (render shape paths)
renderer ← lod (render appropriate LOD)

input ← camera (convert screen to world)
input ← stroke (provide points during drawing)
input ← shapes (manipulate shapes via handles)

react ← everything (exposes hooks for all features)
```

## Conventions

All modules follow these conventions (see conventions.md in repo root):

- Pure functions with immutable data
- Out parameters for mutation
- Snake_case naming
- No comments (self-documenting via names)

## Glossary

- **World coordinates**: Abstract canvas space, infinite, origin at (0,0)
- **Screen coordinates**: Pixels on the display, bounded by viewport size
- **Element**: Anything on the whiteboard (stroke, shape, image, text)
- **Document**: The collection of all elements
- **Frustum**: Visible region in world space
- **LOD**: Level of Detail - simplified rendering for distant/small objects
