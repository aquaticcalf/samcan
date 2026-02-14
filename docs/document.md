# Document Model

## Problem Statement

We need to store and manipulate the content on the whiteboard. This includes:

- What types of elements exist (strokes, shapes, images, text)
- How elements are organized (flat list, layers, groups)
- How to efficiently query elements (by ID, by bounds)
- How to modify elements (immutable vs mutable)

The document model is the source of truth. Everything else (rendering, serialization, undo/redo) depends on it.

## Design Decisions

### Why a flat element list with layers as metadata?

Two common approaches:

**Nested hierarchy** (like DOM):

```
document
  └── layer
       └── group
            └── element
```

**Flat list with references**:

```
document.elements: Map<id, element>
document.layers: [{id, element_ids}]
```

We chose flat list because:

1. **O(1) element lookup** - Get element by ID is constant time
2. **Simpler iteration** - Loop over elements without recursion
3. **Easier serialization** - No circular references
4. **Spatial index compatibility** - Quadtree wants a flat list of bounds

Layers are just ordering metadata. An element knows which layer it's on, but the layer is just a list of IDs.

Groups can exist as a layer feature (selecting multiple elements) without deep nesting.

### Why immutable element updates?

```typescript
// Mutable approach
element.position[0] = 100
element.position[1] = 200

// Immutable approach
const new_element = update_element_position(element, [100, 200])
document = replace_element_document(document, element.id, new_element)
```

Immutable is more verbose but enables:

1. **Undo/redo** - Previous states are preserved automatically
2. **Change detection** - `old !== new` means something changed
3. **Concurrent safety** - No race conditions on shared state
4. **Time travel debugging** - Inspect any past state

The cost is memory allocation per change. We mitigate this with structural sharing - unchanged nested objects are reused.

### Why ID-based references?

Elements reference each other by ID, not direct object reference:

```typescript
type group = {
  id: string
  element_ids: string[] // not elements: element[]
}
```

Reasons:

1. **Serialization** - IDs serialize to JSON, object refs don't
2. **No cycles** - Can't accidentally create circular references
3. **Weak coupling** - Elements can be deleted without breaking refs
4. **Consistent with flat storage** - Map<id, element> is the source

The cost is an extra lookup when traversing relationships. This is O(1) with a Map.

### Why typed elements with discriminated unions?

```typescript
type element =
  | { type: "stroke"; id: string; points: vector2[]; ... }
  | { type: "rectangle"; id: string; bounds: rectangle; ... }
  | { type: "image"; id: string; src: string; ... }
```

Instead of:

```typescript
type element = {
  id: string
  stroke_data?: stroke_data
  rectangle_data?: rectangle_data
  // etc
}
```

Discriminated unions are better because:

1. **Type safety** - TypeScript narrows type after `if (e.type === "stroke")`
2. **No optional confusion** - Each type has exactly the fields it needs
3. **Exhaustiveness checking** - Switch on `type` catches missing cases
4. **Smaller objects** - No wasted optional fields

### Why store bounds on every element?

Every element has a `bounds: rectangle` field, even though bounds can be computed from other properties (a stroke's bounds from its points, a circle's bounds from center/radius).

Pre-computed bounds enable:

1. **Fast spatial queries** - Quadtree uses bounds directly
2. **Fast culling** - No recomputing bounds every frame
3. **Consistent interface** - Every element can be bounds-checked

We update bounds when the element changes. This is a cache, not source of truth for most elements, but we treat it as required.

### Why z-index instead of array order?

```typescript
type element = {
  // ...
  z_index: number
}
```

Instead of relying on array position.

Reasons:

1. **Layer independence** - z_index works across layers
2. **Stable IDs** - Element ID doesn't change when z-order changes
3. **Sparse values** - Can insert between elements without reindexing
4. **Batched updates** - Reorder multiple elements, then sort once

We use integers but leave gaps (10, 20, 30...) so insertions don't require shifting all values.

### Why separate "selected" state from elements?

Selection is view state, not document state:

```typescript
// Not in element:
type element = { id, type, bounds, ... }

// In separate state:
type selection_state = {
  selected_ids: Set<string>
  selection_bounds: rectangle | null
}
```

Reasons:

1. **Multiple views** - Different users/views can have different selections
2. **Undo/redo clarity** - Selection changes shouldn't create undo states
3. **Serialization** - Selection is ephemeral, shouldn't be saved
4. **Performance** - Selection changes don't copy element objects

## Element Types

### stroke

Freehand drawing. The most complex element type.

```typescript
type stroke = {
  type: "stroke"
  id: string
  bounds: rectangle
  z_index: number
  layer_id: string

  points: vector2[]
  pressure: number[] | null
  color: color
  width: number

  simplified_points: vector2[] | null
  spline: spline | null
}
```

- `points` - Raw input points (can be many)
- `pressure` - Per-point pressure if stylus input
- `simplified_points` - Douglas-Peucker simplified (for LOD)
- `spline` - Fitted spline for smooth rendering

### shape

Geometric primitives.

```typescript
type shape = {
  type: "shape"
  id: string
  bounds: rectangle
  z_index: number
  layer_id: string

  shape_type: "rectangle" | "ellipse" | "line" | "arrow"
  fill_color: color | null
  stroke_color: color | null
  stroke_width: number

  // Shape-specific geometry stored in bounds for rect/ellipse
  // For lines: start/end points
  start_point: vector2 | null
  end_point: vector2 | null
}
```

### image

Embedded images.

```typescript
type image_element = {
  type: "image"
  id: string
  bounds: rectangle
  z_index: number
  layer_id: string

  src: string
  original_width: number
  original_height: number
  opacity: number

  loaded: boolean
  bitmap: ImageBitmap | null
}
```

- `src` - URL or data URI
- `bitmap` - Cached decoded image (not serialized)
- `loaded` - Whether bitmap is ready

### text

Text labels.

```typescript
type text_element = {
  type: "text"
  id: string
  bounds: rectangle
  z_index: number
  layer_id: string

  content: string
  font_family: string
  font_size: number
  color: color
  align: "left" | "center" | "right"
}
```

Text bounds must be computed from content + font. This requires measuring text, which is renderer-dependent. We compute bounds once and store.

## Document Structure

```typescript
type layer = {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  element_ids: string[]
}

type document = {
  id: string
  elements: Map<string, element>
  layers: layer[]
  active_layer_id: string

  bounds: rectangle // computed: union of all element bounds
  element_count: number
}
```

## Operations

All operations return new document instances:

```typescript
function add_element_document(doc: document, element: element): document
function remove_element_document(doc: document, element_id: string): document
function update_element_document(doc: document, element_id: string, element: element): document

function add_layer_document(doc: document, layer: layer): document
function remove_layer_document(doc: document, layer_id: string): document
function reorder_layers_document(doc: document, layer_ids: string[]): document

function elements_in_bounds_document(doc: document, bounds: rectangle): element[]
function element_at_point_document(doc: document, x: number, y: number): element | null
```

## File Structure

```
document/
  element.ts       # Element creation and update functions
  document.ts      # Document operations
  layer.ts         # Layer operations
  query.ts         # Spatial queries (wraps quadtree)
```

## Dependencies

From `math/`:

- `vector2` - Points in strokes
- `rectangle` - Bounds
- `color` - Element colors
- `quadtree` - Spatial indexing (in query.ts)
- `spline` - Stroke smoothing
- `simplify` - Stroke simplification

## Integration Points

- **Renderer**: Elements are drawn based on type and properties
- **Spatial Index**: Document maintains a quadtree of element bounds
- **Serialization**: Document is the root of what gets saved/loaded
- **Undo/Redo**: Document snapshots are stored in history
- **React Bindings**: Document is the state that React renders

## Open Questions

1. **Element inheritance** - Should we have a base element type with shared fields? TypeScript's discriminated unions don't play well with inheritance, but repetition is annoying.

2. **Computed bounds caching** - When do we recompute the document's overall bounds? On every change? Lazily? For a large document, union of all bounds is O(n).

3. **Quadtree integration** - Should the document own the quadtree, or should that be a separate concern? Owning it means keeping it in sync. Separate means possible inconsistency.

4. **Change events** - Should document operations emit events for what changed? This helps renderers do incremental updates instead of full redraws.

## Success Criteria

The document model is done when:

1. All element types can be created and stored
2. Spatial queries return correct elements
3. Undo/redo works correctly with immutable updates
4. Serialization round-trips without data loss
5. Performance is acceptable with 10,000+ elements
