# Stroke System

## Problem Statement

Freehand drawing is the core interaction in a whiteboard. The user moves their pointer and we capture a trail of points. This sounds simple but has many challenges:

1. **Input is noisy** - Mouse/touch coordinates jitter
2. **Too many points** - 60fps input = hundreds of points per second
3. **Rendering is slow** - Drawing thousands of line segments per stroke bogs down
4. **Strokes look jagged** - Raw point-to-point lines look bad
5. **Pressure sensitivity** - Stylus input includes pressure, tilt, etc.

We need a pipeline that takes raw input and produces smooth, efficient, good-looking strokes.

## Design Decisions

### Why a multi-stage pipeline?

```
raw input → stabilization → simplification → smoothing → rendering
```

Each stage has a single responsibility:

1. **Stabilization** - Remove jitter, predict pointer position
2. **Simplification** - Reduce point count (Douglas-Peucker)
3. **Smoothing** - Fit curves through points (splines/beziers)
4. **Rendering** - Convert to drawable path commands

Separating stages means we can:

- Skip stages (no smoothing for pixel art)
- Swap algorithms (different simplification methods)
- Cache intermediate results (simplified points for LOD)

### Why stabilize input?

Raw pointer coordinates from the browser have noise:

- Mouse movement is quantized to pixels
- Touch input jitters due to finger size
- Stylus has digitizer noise

Stabilization techniques:

- **Moving average** - Average last N points (laggy but smooth)
- **Exponential smoothing** - Weighted recent vs old (less lag)
- **Kalman filter** - Predicts position, reduces perceived lag

We use exponential smoothing as default - good balance of smoothness and responsiveness.

Stabilization happens during drawing (live input), not after. Once the stroke is complete, we work with stabilized points.

### Why simplify?

A 2-second stroke at 60fps = 120 points. Most of these are redundant - a straight line doesn't need 50 points.

Douglas-Peucker simplification keeps points that matter (corners, direction changes) and removes collinear points.

Benefits:

- **Storage** - 10x fewer points = 10x smaller files
- **Rendering** - Fewer line segments to draw
- **LOD** - Can simplify more aggressively when zoomed out

We already have this in `math/simplify.ts`. The stroke system uses it.

### Why fit splines/beziers?

Simplified points connected by straight lines look faceted. Fitting smooth curves through the points produces professional-looking strokes.

Options:

- **Catmull-Rom splines** - Pass through all points, easy to compute
- **Cubic bezier fitting** - Fewer control points, good compression
- **Natural cubic splines** - Very smooth, more computation

We use natural cubic splines (already in `math/spline.ts`) for the final stroke. Beziers are used for rendering (Canvas 2D and WebGL natively support cubic beziers).

The spline is fit once when the stroke is finalized, not during live drawing.

### Why store both raw and processed points?

```typescript
type stroke = {
  points: vector2[] // original (simplified) points
  simplified_points: vector2[] // more aggressive simplification for LOD
  spline: spline // fitted curve
}
```

We keep multiple representations because:

- `points` is the source of truth for editing
- `simplified_points` is used at low zoom levels
- `spline` is used for smooth rendering at high zoom

If the user edits the stroke, we regenerate from `points`.

### Why variable width strokes?

Pressure-sensitive styluses provide pressure data per point. We want strokes that are thicker with more pressure.

This is harder than constant-width strokes:

- Each segment has different width
- Line joins must handle width changes
- Simplification must preserve pressure data

Our approach: store pressure as a parallel array, interpolate width during rendering.

For rendering, we have two options:

1. **Triangulated mesh** - Convert stroke to triangles with varying width (WebGL-friendly)
2. **Multiple passes** - Draw stroke multiple times at different widths (Canvas 2D hack)

We'll use triangulated mesh when pressure is present.

### Why is live drawing different from stored strokes?

During drawing:

- Points arrive one at a time
- User expects immediate visual feedback
- Can't wait for full stroke to simplify/smooth

After drawing:

- Full stroke is available
- Can apply expensive processing
- Quality matters more than latency

We maintain two render paths:

- **Live** - Draw raw points directly, or use incremental smoothing
- **Final** - Draw from spline

The transition from live to final should be invisible - no visual pop when stroke is finalized.

## Data Flow

### During Drawing

```
pointer event
    ↓
stabilize_point(raw_point, history) → stabilized_point
    ↓
append to live_points[]
    ↓
draw polyline of live_points (immediate feedback)
```

### On Stroke Complete

```
live_points[]
    ↓
simplify_douglas_peucker(live_points, epsilon) → simplified
    ↓
build_natural_spline_from_points(simplified, spline) → spline
    ↓
create_stroke({ points: simplified, spline, ... })
    ↓
add to document
```

### On Render

```
stroke from document
    ↓
check zoom level → select LOD
    ↓
if high zoom: evaluate spline at intervals → path commands
if low zoom: use simplified_points → polyline path
    ↓
renderer.draw_path(commands, style)
```

## Types

```typescript
type stroke_style = {
  color: color
  width: number
  opacity: number
  cap: "round" | "butt" | "square"
  pressure_sensitivity: number // 0-1, how much pressure affects width
}

type stroke_point = {
  position: vector2
  pressure: number
  timestamp: number
}

type live_stroke = {
  points: stroke_point[]
  style: stroke_style
  stabilizer_state: stabilizer_state
}

type stroke = {
  id: string
  bounds: rectangle
  z_index: number
  layer_id: string

  points: vector2[]
  pressure: number[] | null
  style: stroke_style

  simplified_points: vector2[]
  spline: spline
  path_cache: path_command[] | null
}
```

## Functions

### Live Drawing

```typescript
function create_live_stroke(style: stroke_style): live_stroke
function add_point_live_stroke(stroke: live_stroke, point: stroke_point): live_stroke
function render_live_stroke(stroke: live_stroke, renderer: renderer): void
function finalize_live_stroke(live: live_stroke): stroke
```

### Stroke Processing

```typescript
function simplify_stroke_points(points: vector2[], epsilon: number, out: vector2[]): number
function fit_spline_to_stroke(points: vector2[], out_spline: spline): spline
function compute_stroke_bounds(points: vector2[], width: number, out: rectangle): rectangle
function stroke_to_path_commands(stroke: stroke, lod_level: number): path_command[]
```

### Stabilization

```typescript
type stabilizer_state = {
  history: vector2[]
  smoothing_factor: number
}

function create_stabilizer(smoothing_factor: number): stabilizer_state
function stabilize_point(state: stabilizer_state, raw: vector2, out: vector2): vector2
function reset_stabilizer(state: stabilizer_state): stabilizer_state
```

## File Structure

```
stroke/
  types.ts         # stroke, live_stroke, stroke_style
  live.ts          # Live drawing functions
  process.ts       # Simplification, spline fitting
  render.ts        # Path generation, LOD selection
  stabilizer.ts    # Input stabilization
```

## Dependencies

From `math/`:

- `vector2` - Point representation
- `rectangle` - Bounds computation
- `simplify` - Douglas-Peucker
- `spline` - Curve fitting
- `bezier` - Path commands
- `color` - Stroke color

## Integration Points

- **Input Layer**: Provides raw pointer events
- **Document**: Stores finalized strokes
- **Renderer**: Draws live strokes and finalized strokes
- **LOD System**: Selects appropriate simplification level

## Open Questions

1. **Incremental spline** - Can we update the spline incrementally as points are added, rather than waiting for stroke completion? This would make live preview smoother.

2. **Eraser strokes** - Should eraser be a stroke type with blend mode, or a separate operation that modifies other strokes?

3. **Stroke editing** - Can users modify strokes after creation? If so, how do we handle edited points vs original points?

4. **Pressure curve** - Should we apply a curve to pressure values (like Photoshop's brush dynamics)? Linear pressure often feels wrong.

## Performance Considerations

- Stabilizer history should be bounded (last 5-10 points)
- Live stroke rendering should use a single path, not per-segment
- Path commands should be cached after stroke finalization
- Spline evaluation should be memoized per zoom level

## Success Criteria

The stroke system is done when:

1. Drawing feels responsive (< 16ms from input to visual)
2. Strokes look smooth, not jagged
3. Pressure sensitivity works with stylus
4. Large strokes (1000+ original points) render efficiently
5. Zoomed-out view shows simplified strokes without artifacts
