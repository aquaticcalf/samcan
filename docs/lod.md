# LOD Rendering

## Problem Statement

When zoomed out, we don't need full detail. A stroke with 500 points becomes a few pixels - drawing all 500 points is wasteful. An image that's 10 pixels on screen doesn't need 4K resolution.

Level of Detail (LOD) means showing less detail when it wouldn't be visible anyway. Benefits:

- Faster rendering (fewer vertices, smaller textures)
- Less memory (simplified geometry, downsampled images)
- Consistent frame rate at any zoom level

## Design Decisions

### Why LOD at render time, not storage time?

We could pre-compute multiple versions:

```typescript
type stroke = {
  points_lod0: vector2[] // full detail
  points_lod1: vector2[] // 50% points
  points_lod2: vector2[] // 25% points
}
```

Or compute LOD when rendering:

```typescript
function render_stroke(stroke, zoom_level) {
  const lod = select_lod_for_zoom(zoom_level)
  const points = simplify_to_lod(stroke.points, lod)
  draw_points(points)
}
```

We use a hybrid:

- **Pre-compute simplified versions** for strokes (expensive to simplify on the fly)
- **Select at render time** based on zoom

This way storage has the options, rendering picks the right one.

### Why zoom-based selection, not distance-based?

3D games use distance from camera. In 2D, "distance" doesn't quite apply - everything is on the same plane.

For 2D, zoom level is the primary LOD selector:

- Zoom 1.0 (100%) → full detail
- Zoom 0.1 (10%) → reduced detail
- Zoom 0.01 (1%) → minimal detail

Screen-space size is what matters: how many pixels does this element occupy? Lower zoom = fewer pixels = less detail needed.

### Why discrete LOD levels?

Continuous LOD (smoothly varying detail) would be:

```typescript
const detail = zoom * base_detail
simplify(points, detail)
```

Discrete LOD (stepped levels) is:

```typescript
const lod = zoom > 0.5 ? 0 : zoom > 0.1 ? 1 : 2
use(precomputed_lod[lod])
```

Discrete is better because:

1. **Pre-computation works** - Can't pre-compute infinite continuous levels
2. **Caching** - Same LOD level = same cached render
3. **Predictable** - Know exactly what detail at what zoom
4. **Transitions manageable** - Can cross-fade between discrete levels

We use 3-4 LOD levels. More levels = more storage, diminishing returns.

### Why per-element LOD, not global?

A global LOD would simplify everything equally based on zoom. Per-element LOD considers:

- Element size (large elements need less simplification)
- Element importance (selected items keep full detail)
- Screen position (center of view = more detail than edges)

For v1, we use zoom-based global LOD. Per-element can be added later.

### Why blend between LOD levels?

Hard switching between LOD levels causes popping:

```
zoom 0.51 → full detail
zoom 0.49 → simplified  // sudden visual change
```

Blending smooths the transition:

```
zoom 0.51 → 100% full + 0% simplified
zoom 0.50 → 50% full + 50% simplified (blend)
zoom 0.49 → 0% full + 100% simplified
```

For strokes, blending is hard (can't blend point counts). Instead:

- Use alpha fade during transition
- Or accept the pop (often not noticeable)

For images, blending is natural (mipmaps work this way).

### Why does LOD affect stroke simplification epsilon?

Douglas-Peucker simplification uses epsilon (tolerance). Higher epsilon = more simplification = fewer points.

LOD mapping:

```
LOD 0: epsilon = 0.5   // high detail
LOD 1: epsilon = 2.0   // medium
LOD 2: epsilon = 8.0   // low detail
```

We pre-compute simplified versions at each epsilon and store them.

### Why handle images differently?

Strokes are simplified by removing points. Images are simplified by resolution:

```
Original: 4000x3000 pixels
LOD 1: 1000x750
LOD 2: 250x188
LOD 3: 64x48 (thumbnail)
```

Browser image scaling handles this automatically to some extent (CSS sizing), but we can:

1. Load lower-res versions for faster initial display
2. Use `ImageBitmap` with resizing for memory efficiency
3. Maintain image pyramid for instant zoom

For v1, rely on browser scaling. Add explicit mipmaps if needed.

## LOD Configuration

```typescript
type lod_config = {
  levels: lod_level[]
  stroke_epsilon_per_level: number[]
  image_scale_per_level: number[]
  transition_range: number // zoom range for blending
}

type lod_level = {
  level: number
  min_zoom: number
  max_zoom: number
  detail_factor: number // 0-1, for custom calculations
}
```

Default configuration:

```typescript
const default_lod_config = {
  levels: [
    { level: 0, min_zoom: 0.5, max_zoom: Infinity, detail_factor: 1.0 },
    { level: 1, min_zoom: 0.1, max_zoom: 0.5, detail_factor: 0.5 },
    { level: 2, min_zoom: 0.0, max_zoom: 0.1, detail_factor: 0.25 },
  ],
  stroke_epsilon_per_level: [0.5, 2.0, 8.0],
  image_scale_per_level: [1.0, 0.5, 0.125],
  transition_range: 0.1,
}
```

## Integration with Existing Math

We already have `math/lod.ts` with:

- LOD level selection based on distance/zoom
- Continuous LOD with blend factors
- Screen-space error calculations

The rendering LOD module uses these primitives but specializes them for our element types.

## Implementation Flow

### Pre-computation (on stroke creation)

```
original stroke points
    ↓
simplify at epsilon[0] → lod_points[0]
simplify at epsilon[1] → lod_points[1]
simplify at epsilon[2] → lod_points[2]
    ↓
store all in stroke element
```

### Render-time selection

```
get current zoom from camera
    ↓
select_lod_level(zoom, config) → level
    ↓
get lod_points[level] from stroke
    ↓
render those points
```

### With blending (optional)

```
select_continuous_lod(zoom, config) → { level, next_level, blend_factor }
    ↓
if blend_factor > 0:
  render lod_points[level] at alpha = 1 - blend_factor
  render lod_points[next_level] at alpha = blend_factor
else:
  render lod_points[level] at alpha = 1
```

## Types

```typescript
type lod_config = {
  readonly levels: readonly lod_level[]
  readonly stroke_epsilons: readonly number[]
  readonly image_scales: readonly number[]
  readonly transition_range: number
}

type lod_selection = {
  level: number
  next_level: number
  blend_factor: number
}

type element_lod_data = {
  stroke_points_per_level: vector2[][] | null
  image_bitmaps_per_level: ImageBitmap[] | null
}
```

## Functions

### Configuration

```typescript
function create_lod_config(level_count: number, base_zoom: number): lod_config
function default_lod_config(): lod_config
```

### Selection

```typescript
function select_lod_level(zoom: number, config: lod_config): number
function select_lod_continuous(zoom: number, config: lod_config, out: lod_selection): lod_selection
function should_transition_lod(
  previous: number,
  current: number,
  zoom: number,
  config: lod_config,
): boolean
```

### Pre-computation

```typescript
function precompute_stroke_lods(points: vector2[], config: lod_config): vector2[][]
function precompute_image_lods(image: ImageBitmap, config: lod_config): Promise<ImageBitmap[]>
```

### Rendering helpers

```typescript
function get_stroke_points_for_lod(stroke: stroke, level: number): vector2[]
function get_image_bitmap_for_lod(image_element: image_element, level: number): ImageBitmap | null
function get_opacity_for_lod_transition(selection: lod_selection): number
```

## File Structure

```
lod/
  types.ts         # lod_config, lod_selection, element_lod_data
  config.ts        # Configuration creation
  select.ts        # LOD level selection
  stroke.ts        # Stroke LOD pre-computation
  image.ts         # Image LOD handling
```

## Dependencies

From `math/`:

- `lod` - Base LOD calculations
- `simplify` - Douglas-Peucker for strokes
- `vector2` - Point arrays

## Integration Points

- **Stroke System**: Pre-computes LOD versions on stroke creation
- **Renderer**: Selects appropriate LOD per element
- **Camera**: Provides zoom level for LOD selection
- **Document**: Stores LOD data per element

## Performance Considerations

### Pre-computation Cost

Simplifying at multiple epsilons is O(n log n) per level. For a stroke with 1000 points and 3 LOD levels, this is ~3ms. Do this asynchronously after stroke finalization.

### Memory Tradeoff

Storing multiple LOD versions uses more memory:

- LOD 0: 100% points
- LOD 1: ~30% points (DP is good at reducing)
- LOD 2: ~10% points

Total: ~140% of original. Acceptable for the render performance gain.

### Cache LOD Selection

Don't re-select LOD every frame for every element. LOD only changes when:

- Zoom changes significantly
- Element moves (changes screen-space size)

Cache the selected LOD per element, invalidate on zoom change.

## Open Questions

1. **Per-element vs global LOD** - Should elements near the cursor always be high detail? This adds complexity but improves interaction feel.

2. **LOD for shapes** - Shapes are already simple (few vertices). Do they need LOD? Maybe just skip rendering tiny shapes entirely.

3. **Progressive loading** - For large documents, load LOD 2 first (fast), then LOD 0 (slow). How does this interact with the document model?

4. **Animation LOD** - During pan/zoom animation, use lower LOD for performance. Switch to higher when animation stops.

## Success Criteria

The LOD system is done when:

1. Zoomed-out view renders significantly faster than full detail
2. LOD transitions are not visually jarring
3. Stroke quality is acceptable at each LOD level
4. Memory usage for LOD data is reasonable
5. Pre-computation doesn't block stroke finalization
