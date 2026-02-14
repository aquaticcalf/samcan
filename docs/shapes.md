# Shapes System

## Problem Statement

Beyond freehand strokes, whiteboards need geometric shapes: rectangles, circles, lines, arrows. These are used for diagrams, annotations, and structured content.

Shapes differ from strokes:

- Defined by parameters (position, size, rotation) not point lists
- Precise geometry, not organic curves
- Interactive handles for resizing/reshaping
- Often connect to other elements (arrows pointing at things)

## Design Decisions

### Why not treat shapes as special strokes?

You could represent a rectangle as 4 points forming a closed path. But this loses information:

1. **Semantics** - "This is a rectangle" matters for snapping, alignment, export
2. **Editing** - Resizing a rectangle = change width/height. Resizing a stroke polygon = move each point.
3. **Precision** - Shapes are exact. A stroked rectangle has slight imperfections.
4. **File size** - Parameters are smaller than point lists

Shapes are fundamentally different from strokes and need their own representation.

### Why a single `shape` type with `shape_type` discriminator?

```typescript
type shape = {
  type: "shape"
  shape_type: "rectangle" | "ellipse" | "line" | "arrow" | "polygon"
  // ...
}
```

Instead of:

```typescript
type element =
  | { type: "rectangle"; ... }
  | { type: "ellipse"; ... }
  | { type: "line"; ... }
```

Reasons:

1. **Shared behavior** - All shapes have fill, stroke, bounds, transform
2. **Single rendering path** - Shape renderer handles all shape types
3. **Tool consolidation** - One "shape tool" with type selector
4. **Conversion** - Easy to change a rectangle to ellipse

The `shape_type` determines which geometry parameters are used.

### Why store bounds + transform instead of absolute coordinates?

```typescript
type shape = {
  bounds: rectangle // local bounds (usually at origin)
  transform: transform // position, rotation, scale
}
```

Instead of:

```typescript
type shape = {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}
```

The transform-based approach enables:

1. **Uniform transformations** - Rotation, skew, flip all work the same
2. **Grouping** - Group transform applies to children naturally
3. **Animation** - Interpolate transforms for smooth motion
4. **Non-axis-aligned shapes** - Rotated rectangles without special math

For simple cases (unrotated rectangle), the transform is identity and bounds holds everything.

### Why separate fill and stroke?

Shapes can be:

- Filled only (solid rectangle)
- Stroked only (rectangle outline)
- Both (filled rectangle with border)
- Neither (invisible, used for hit testing)

```typescript
type shape = {
  fill_color: color | null
  stroke_color: color | null
  stroke_width: number
}
```

`null` means no fill/stroke. This is different from transparent (which would still participate in hit testing).

### Why are lines and arrows shapes?

Lines connect two points. You could argue they're different from area shapes. But:

1. **Shared properties** - Color, stroke width, transform
2. **Similar tools** - Draw by dragging from start to end
3. **Conversion possible** - Line can become arrow

Lines store `start_point` and `end_point` in local coordinates. The `bounds` is computed from these.

Arrows are lines with arrowhead decoration. The arrowhead parameters (size, style) are additional properties.

### Why support corner radius?

Rounded rectangles are very common in diagrams. Rather than a separate shape type:

```typescript
type shape = {
  // ...
  corner_radius: number // 0 = sharp corners
}
```

Only applies to rectangles. Ignored for other shape types.

This is simpler than having both `rectangle` and `rounded_rectangle` types.

## Shape Types

### rectangle

The most common shape. Defined entirely by bounds + transform.

```
Corner radius affects all corners equally.
Can be rendered as:
- Canvas: roundRect() or manual arcs
- WebGL: SDF or triangulated mesh
```

### ellipse

Defined by bounds (the bounding rectangle of the ellipse).

```
Circle is just an ellipse where bounds width = height.
Canvas: ellipse() method
WebGL: SDF-based rendering
```

### line

Two-point connection.

```typescript
start_point: vector2 // in local coordinates
end_point: vector2
```

Bounds computed as bounding box of both points.

### arrow

Line with arrowhead decoration.

```typescript
start_point: vector2
end_point: vector2
arrow_start: boolean // arrowhead at start?
arrow_end: boolean // arrowhead at end?
arrow_size: number // head size in pixels
arrow_style: "triangle" | "open" | "circle" | "diamond"
```

Arrowheads are drawn as separate path commands, not part of the line stroke.

### polygon

Arbitrary closed shape defined by vertices.

```typescript
vertices: vector2[]   // in local coordinates
closed: boolean       // close path?
```

Used for triangles, pentagons, custom shapes. Not freehand - vertices are specified explicitly.

## Rendering

Shape rendering uses the same `draw_style` as strokes but generates different path commands.

### Rectangle Path

```typescript
function rectangle_to_path(bounds: rectangle, corner_radius: number): path_command[] {
  if (corner_radius <= 0) {
    return [
      { type: "move", x: bounds[0], y: bounds[1] },
      { type: "line", x: bounds[0] + bounds[2], y: bounds[1] },
      { type: "line", x: bounds[0] + bounds[2], y: bounds[1] + bounds[3] },
      { type: "line", x: bounds[0], y: bounds[1] + bounds[3] },
      { type: "close" },
    ]
  }
  // With corner radius: use arc commands
}
```

### Ellipse Path

Ellipses require bezier approximation (4 cubic beziers) or native `ellipse` command if available.

### Hit Testing

Each shape type has a point-in-shape test:

- **Rectangle** - Simple bounds check (with rotation applied)
- **Ellipse** - Transform point to local coords, check against unit circle
- **Line** - Distance to line segment < stroke width / 2
- **Polygon** - Point-in-polygon test (ray casting)

## Handles and Manipulation

Interactive shape editing uses handles:

```
Rectangle handles:
┌───────◆───────┐
◆       ◆       ◆  (8 resize handles + 4 edge handles)
│               │
◆       ○       ◆  (center rotation handle)
│               │
◆       ◆       ◆
└───────◆───────┘

Line handles:
◆─────────────◆    (2 endpoint handles)
```

Handle positions are computed from shape bounds + transform.

Dragging a handle updates the shape bounds/transform appropriately.

## Types

```typescript
type shape_type = "rectangle" | "ellipse" | "line" | "arrow" | "polygon"

type arrow_style = "triangle" | "open" | "circle" | "diamond"

type shape = {
  type: "shape"
  id: string
  bounds: rectangle
  z_index: number
  layer_id: string

  shape_type: shape_type
  local_bounds: rectangle
  local_transform: transform

  fill_color: color | null
  stroke_color: color | null
  stroke_width: number

  corner_radius: number

  // Line/arrow specific
  start_point: vector2 | null
  end_point: vector2 | null
  arrow_start: boolean
  arrow_end: boolean
  arrow_size: number
  arrow_style: arrow_style

  // Polygon specific
  vertices: vector2[] | null
}

type shape_handle = {
  type: "corner" | "edge" | "rotation" | "endpoint"
  position: vector2
  cursor: string
  index: number // which corner/edge/endpoint
}
```

## Functions

```typescript
// Creation
function create_rectangle_shape(x: number, y: number, width: number, height: number): shape
function create_ellipse_shape(x: number, y: number, width: number, height: number): shape
function create_line_shape(x1: number, y1: number, x2: number, y2: number): shape
function create_arrow_shape(x1: number, y1: number, x2: number, y2: number): shape
function create_polygon_shape(vertices: vector2[]): shape

// Manipulation
function resize_shape(shape: shape, handle_index: number, delta: vector2, out: shape): shape
function rotate_shape(shape: shape, angle: number, out: shape): shape
function move_shape(shape: shape, dx: number, dy: number, out: shape): shape

// Queries
function get_handles_of_shape(shape: shape): shape_handle[]
function hit_test_shape(shape: shape, x: number, y: number): boolean
function hit_test_handle_shape(
  shape: shape,
  x: number,
  y: number,
  tolerance: number,
): shape_handle | null

// Rendering
function shape_to_path_commands(shape: shape): path_command[]
function compute_bounds_of_shape(shape: shape, out: rectangle): rectangle
```

## File Structure

```
shapes/
  types.ts         # shape, shape_handle, shape_type
  create.ts        # Shape creation functions
  manipulate.ts    # Resize, rotate, move
  handles.ts       # Handle computation and hit testing
  render.ts        # Path command generation
  hittest.ts       # Point-in-shape tests
```

## Dependencies

From `math/`:

- `vector2` - Points, vertices
- `rectangle` - Bounds
- `transform` - Shape transforms
- `circle` - Ellipse math (circle is special case)
- `color` - Fill and stroke colors

## Integration Points

- **Document**: Shapes are elements stored in the document
- **Renderer**: Shapes generate path commands for drawing
- **Input Layer**: Handle dragging updates shape state
- **Spatial Index**: Shape bounds feed into quadtree

## Open Questions

1. **Constraint-based resizing** - Should shift+drag maintain aspect ratio? Ctrl+drag resize from center? These are common expectations.

2. **Snapping** - Shapes should snap to grid, other shapes, guides. Where does this logic live?

3. **Connectors** - Arrows that connect shapes and stay connected when shapes move. This is complex - probably a separate feature.

4. **Text in shapes** - Many diagrams have text inside shapes. Is this text inside the shape element, or a separate text element positioned over it?

## Success Criteria

The shapes system is done when:

1. All basic shapes can be created and edited
2. Handle manipulation feels natural (resize corners, rotate)
3. Hit testing is accurate for all shape types
4. Shapes render crisply at all zoom levels
5. Shapes can be filled, stroked, or both
