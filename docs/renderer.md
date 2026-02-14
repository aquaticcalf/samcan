# Renderer Abstraction

## Problem Statement

We need to draw things on screen efficiently. The two main options are Canvas 2D and WebGL. Canvas 2D is simpler but slower for complex scenes. WebGL is faster but significantly more complex to implement.

We want to support both backends behind a single interface so:

1. We can start with Canvas 2D (ship faster)
2. We can add WebGL later without rewriting drawing code
3. The system auto-selects the best available option

## Design Decisions

### Why an abstraction layer?

Direct Canvas 2D calls are scattered throughout code in most whiteboard implementations. This makes it impossible to switch renderers later. By abstracting early, we pay a small API design cost upfront but gain flexibility.

The abstraction is intentionally thin - it maps closely to what Canvas 2D can do natively. We're not inventing a new graphics API, just wrapping the existing one with a swappable backend.

### Why Canvas 2D first?

1. **Simpler implementation** - Canvas 2D is ~500 lines, WebGL is ~2000+ lines
2. **Easier debugging** - Canvas 2D state is inspectable, WebGL is a black box
3. **Good enough for most cases** - Canvas 2D handles thousands of elements fine
4. **No shader complexity** - WebGL requires GLSL knowledge

WebGL becomes necessary when:

- Drawing 10,000+ elements per frame
- Heavy use of effects (blur, shadows)
- Custom shaders for special visuals

### Why frame begin/end?

```typescript
r.begin_frame()
// draws here
r.end_frame()
```

This pattern enables batching. In Canvas 2D it's basically a no-op. In WebGL, `begin_frame` can sort draw calls by shader/texture and `end_frame` flushes batched geometry. Without this, every draw would be a separate GPU call.

### Why path commands instead of direct methods?

We define paths as data:

```typescript
type path_command =
  | { type: "move"; x: number; y: number }
  | { type: "line"; x: number; y: number }
  | { type: "cubic"; ... }
```

Rather than imperative calls like `ctx.moveTo()`, `ctx.lineTo()`.

Reasons:

1. **Paths can be cached** - Same path data = same Path2D object
2. **Paths can be transformed** - Apply matrix to command coordinates
3. **Paths can be serialized** - Save/load strokes as JSON
4. **WebGL needs vertex data** - Commands convert to vertex buffers

### Why out parameters for styles?

We use a `draw_style` object rather than setting state:

```typescript
r.draw_rectangle(rect, style) // style passed per-call
```

Instead of:

```typescript
r.set_fill_color(red)
r.set_stroke_width(2)
r.draw_rectangle(rect) // uses current state
```

Reasons:

1. **Explicit is better** - No hidden state to track
2. **Enables batching** - Renderer can group by style
3. **Thread-safe friendly** - No shared mutable state
4. **Matches our conventions** - Pure functions, explicit inputs

## Implementation Notes

### Canvas 2D Backend

The Canvas 2D implementation is straightforward:

- `draw_path` maps to `Path2D` + `fill()` / `stroke()`
- `set_transform` maps to `setTransform()`
- `save` / `restore` map directly to context methods

Key optimization: Cache `Path2D` objects. Creating a new `Path2D` for every draw is slow. Hash the path commands and reuse.

### WebGL Backend (Future)

WebGL requires:

1. **Shader programs** - At minimum: solid color, textured quad, line
2. **Vertex buffer management** - Pool and reuse buffers
3. **Texture atlas** - Batch small images into larger textures
4. **Line rendering** - WebGL has no native thick lines, must triangulate

The line rendering is the hardest part. Options:

- Triangulate lines into quads (most common)
- Use instanced rendering with line segments
- Geometry shader (WebGL 2 only, limited support)

We'll use quad triangulation - each line segment becomes two triangles.

### Auto-detection Logic

```
1. Check if WebGL 2 is available
2. If yes and not explicitly disabled, use WebGL
3. Otherwise check WebGL 1
4. Fall back to Canvas 2D
5. If Canvas 2D fails, return null (no rendering possible)
```

Some devices report WebGL support but have broken implementations. We should have a blocklist or do a quick render test.

## File Structure

```
renderer/
  types.ts         # All type definitions
  style.ts         # draw_style creation and defaults
  path.ts          # path_command utilities
  canvas2d.ts      # Canvas 2D implementation
  webgl.ts         # WebGL implementation (phase 2)
  create.ts        # Factory with auto-detection
```

## Dependencies

From `math/`:

- `transform` - View matrix for `set_transform`
- `rectangle` - Bounds for clipping and image dest
- `circle` - Circle drawing
- `vector2` - Point arrays for polylines
- `color` - RGBA colors

## Open Questions

1. **Text rendering** - Canvas 2D has native text, WebGL doesn't. Do we always fall back to Canvas 2D for text, or implement SDF text rendering?

2. **Image handling** - Should we support `HTMLImageElement`, `ImageBitmap`, both? ImageBitmap is more efficient but requires async creation.

3. **Offscreen rendering** - Do we need `OffscreenCanvas` support for web workers? This affects the canvas type in our interface.

## Success Criteria

The renderer is done when:

1. Canvas 2D backend can draw all element types
2. Performance is acceptable for 1000 elements at 60fps
3. API is stable enough to build document rendering on top
4. WebGL backend can be added without changing calling code
