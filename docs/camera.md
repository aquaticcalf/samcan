# Camera System

## Problem Statement

An infinite whiteboard needs pan and zoom. The user drags to move around, scrolls to zoom in/out. We need to:

1. Track where the camera is looking (position + zoom)
2. Convert between screen coordinates (pixels) and world coordinates (canvas space)
3. Generate transform matrices for the renderer
4. Compute what's visible for culling

## Design Decisions

### Why separate camera from viewport?

```typescript
type camera = { position; zoom; rotation }
type viewport = { width; height; pixel_ratio }
```

Camera is _where_ we're looking. Viewport is _how big_ our screen is.

They change independently:

- Camera changes on pan/zoom (every frame during interaction)
- Viewport changes on window resize (rare)

Separating them means pan/zoom operations don't need viewport info, and resize operations don't need to know camera state.

### Why store position, not offset?

The camera `position` is where the camera is centered in world space. An alternative is storing the top-left offset. We chose center-position because:

1. **Zoom math is simpler** - Zoom scales around the center naturally
2. **Rotation works** - If we add rotation, it rotates around center
3. **Fit-to-bounds is direct** - Center of bounds = camera position

The tradeoff: converting to a view matrix requires computing the offset from center. This is cheap arithmetic.

### Why zoom as a multiplier, not a level?

```typescript
zoom: 1.0 // 100%
zoom: 2.0 // 200% (zoomed in)
zoom: 0.5 // 50% (zoomed out)
```

Alternative: discrete zoom levels (0, 1, 2, 3...) that map to percentages.

Multiplier is better because:

1. **Continuous zooming** - Smooth pinch-to-zoom, not stepped
2. **Math is direct** - `world_size * zoom = screen_size`
3. **No mapping table** - Level systems need level-to-scale lookup

### Why zoom-toward-cursor requires an anchor?

When the user scrolls to zoom, they expect the point under their cursor to stay under their cursor. This is "zoom toward cursor" behavior.

Naive zoom (scale around center) feels wrong - the content slides away from the cursor.

The solution requires capturing the world position under the cursor _before_ zooming, then adjusting the camera position _after_ zooming so that world position maps back to the same screen position.

```typescript
// Before zoom
anchor = { screen: [mx, my], world: screen_to_world(mx, my) }

// After zoom
zoom = zoom * factor
// Now anchor.world would map to a different screen position
// Adjust camera.position so it maps back to anchor.screen
```

The math:

```
screen = (world - camera.position) * zoom + viewport_center
```

Solving for camera.position given we want anchor.world to map to anchor.screen:

```
camera.position = anchor.world - (anchor.screen - viewport_center) / zoom
```

### Why limit zoom range?

Unconstrained zoom causes problems:

- **Zoom too far out**: Entire document is 1 pixel, useless
- **Zoom too far in**: Floating point precision breaks down
- **Zoom = 0 or negative**: Math explodes

Reasonable defaults: `min_zoom: 0.01` (1%), `max_zoom: 100` (10000%)

These can be tightened based on content. A whiteboard with finite content might limit to 0.1 - 10.

### Why support position limits?

Some whiteboards are infinite. Some have bounded content (a page, a fixed-size canvas). Position limits prevent panning into empty space.

When limits are set, `clamp_camera` enforces them after any camera operation. When null, no clamping occurs.

### Why generate transform matrices?

The renderer needs a 2D affine transform to apply pan/zoom. We could pass camera state directly and let the renderer compute it, but:

1. **Separation of concerns** - Camera module owns the math
2. **Renderer stays simple** - Just applies a matrix
3. **Consistency** - Same transform logic regardless of backend

The view transform converts world coordinates to screen coordinates:

```
screen = transform_point(view_matrix, world)
```

This is a scale (zoom) + translate (position offset).

### Why provide frustum computation?

A frustum defines what's visible. For 2D, this is just a rectangle in world space representing the screen bounds.

Computing the frustum once per frame and passing it to culling is more efficient than having every element compute visibility independently. The frustum also enables:

- Spatial index queries (`query_range_quadtree`)
- LOD distance calculations
- Hybrid culling (coarse frustum + fine bounds check)

## Implementation Notes

### Coordinate Systems

```
Screen space:
  Origin: top-left of canvas
  +X: right
  +Y: down
  Units: CSS pixels (or device pixels if pixel_ratio applied)

World space:
  Origin: (0, 0) - arbitrary center of infinite canvas
  +X: right
  +Y: down (matching screen, avoids flipping)
  Units: abstract "world units" (could be pixels, mm, whatever)
```

We keep Y-down in both spaces to avoid confusion. Some graphics systems use Y-up for world space, but that adds mental overhead.

### Transform Matrix Layout

We use the same `transform` type from `math/transform`:

```typescript
type transform = [a, b, c, d, tx, ty]
// Maps to matrix:
// | a  c  tx |
// | b  d  ty |
// | 0  0  1  |
```

View transform computation:

```typescript
function view_transform_of_camera(state, out) {
  // Scale by zoom, then translate to center camera in viewport
  const half_w = state.viewport.width / 2
  const half_h = state.viewport.height / 2

  out[0] = state.camera.zoom // a: scale x
  out[1] = 0 // b
  out[2] = 0 // c
  out[3] = state.camera.zoom // d: scale y
  out[4] = half_w - state.camera.position[0] * state.camera.zoom // tx
  out[5] = half_h - state.camera.position[1] * state.camera.zoom // ty
  return out
}
```

### Smooth Transitions

`lerp_camera` enables animated transitions:

- Fit-to-selection with animation
- Reset view with smooth zoom out
- Snap to grid with easing

Use with `requestAnimationFrame`:

```typescript
function animate_to(target_camera) {
  const start = clone_camera(current_camera)
  const start_time = performance.now()
  const duration = 300

  function tick(now) {
    const t = Math.min(1, (now - start_time) / duration)
    const eased = ease_out_cubic(t)
    lerp_camera(start, target_camera, eased, current_camera)
    render()
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
```

## File Structure

```
camera/
  types.ts         # camera, viewport, camera_state, camera_limits, zoom_anchor
  camera.ts        # Creation and manipulation functions
  projection.ts    # screen_to_world, world_to_screen, transform generation
  controls.ts      # Higher-level pan/zoom with clamping (optional)
```

`controls.ts` is optional - it bundles common patterns like "pan by screen delta and clamp" into single functions. Some apps may prefer more control.

## Dependencies

From `math/`:

- `vector2` - Position storage and coordinate conversion results
- `transform` - View matrix generation
- `frustum` - View bounds for culling
- `rectangle` - Bounds fitting

## Integration Points

- **Renderer**: `view_transform_of_camera` output goes to `renderer.set_transform`
- **Spatial Index**: `frustum_of_camera` output goes to `query_range_quadtree`
- **Input Layer**: Screen coordinates from pointer events go to `screen_to_world`
- **LOD System**: Distance calculations use camera position and zoom

## Open Questions

1. **Rotation support** - Do we need it? Most whiteboards don't rotate the canvas. Adding rotation complicates the transform math and UI. Leaving the field in the type but ignoring it for now.

2. **Pixel ratio handling** - Should the camera system handle device pixel ratio, or leave that to the renderer? Current design: viewport stores pixel_ratio, but camera math uses CSS pixels. Renderer multiplies by pixel_ratio when setting up the canvas.

3. **Integer vs float coordinates** - Should we snap camera position to integers to avoid subpixel rendering artifacts? This matters more for pixel art tools than whiteboards.

## Success Criteria

The camera system is done when:

1. Pan/zoom feels responsive and correct
2. Zoom-toward-cursor works smoothly
3. Screen-to-world conversion is accurate (click on element = correct hit)
4. View transform renders content at correct position/scale
5. Frustum culling correctly identifies visible elements
