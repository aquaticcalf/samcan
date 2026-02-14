# Spatial Index

## Problem Statement

With thousands of elements on a canvas, we can't check every element for every operation:

- **Hit testing** - Click at (x, y), which element is under cursor?
- **Culling** - What elements are visible in the current viewport?
- **Range queries** - What elements are in this selection rectangle?

Linear search is O(n). We need O(log n) or better.

## Design Decisions

### Why a quadtree?

Common spatial index structures:

- **Quadtree** - 2D recursive subdivision
- **R-tree** - Bounding rectangle hierarchy
- **Grid** - Fixed cell subdivision
- **K-d tree** - Binary space partitioning

We chose quadtree because:

1. **Already implemented** - `math/quadtree.ts` exists
2. **Good for 2D** - Designed specifically for 2D spatial data
3. **Dynamic** - Handles insertions and deletions well
4. **Simple to understand** - Recursive subdivision is intuitive

R-trees can be faster for range queries but are more complex. Grids are simpler but waste memory on sparse data.

### Why wrap the quadtree instead of using it directly?

The `math/quadtree.ts` stores `quadtree_point` - just coordinates and arbitrary data. But we need to:

1. **Store bounds, not points** - Elements have size, not just position
2. **Track element IDs** - Lookup elements from query results
3. **Keep in sync** - Quadtree must update when document changes
4. **Handle transforms** - Element bounds are in world space

The spatial index module wraps the quadtree with these features.

### Why use element centers for quadtree insertion?

The quadtree stores points. Elements have bounds. We could:

1. **Store centers** - Insert element at center of its bounds
2. **Store all corners** - Insert element 4 times at each corner
3. **Store bounds directly** - Modify quadtree to handle rectangles

We use centers because:

- Simple - one insertion per element
- Works for queries - center in range means element probably overlaps
- Post-filter handles edge cases - verify actual intersection

The query returns candidates, then we filter by actual bounds intersection.

### Why maintain a separate bounds map?

```typescript
type spatial_index = {
  quadtree: quadtree
  bounds_map: Map<string, rectangle> // id → bounds
}
```

The quadtree doesn't store bounds, just the center point and element ID. When we need to verify intersection, we look up bounds from the map.

Alternative: store bounds in quadtree data field. But quadtree data is `unknown`, and we'd need to cast.

Separate map is cleaner and lets us update bounds without rebuilding quadtree (if element moved slightly but stayed in same quadtree cell).

### Why rebuild vs incremental update?

When elements change, we could:

1. **Rebuild entire quadtree** - Simple, correct, O(n)
2. **Remove + reinsert changed elements** - Incremental, O(log n) per change

We support both:

- Small changes (single element moved) → incremental update
- Large changes (many elements, or document load) → full rebuild

The quadtree's remove operation is already implemented. For most frame-by-frame updates, incremental is fine.

### Why expanded query bounds?

When querying for visible elements:

```typescript
function query_visible_elements(index, viewport_bounds) {
  const expanded = expand_rectangle(viewport_bounds, margin)
  return query_range(index, expanded)
}
```

We expand the query bounds because:

1. **Element centers outside view** - Large element might have center outside viewport but still visible
2. **Prefetching** - Load elements just outside view for smooth panning
3. **Stroke width** - Element bounds don't include stroke, which extends past bounds

The margin should be at least `max_element_size / 2 + max_stroke_width`.

## Implementation

### Index Structure

```typescript
type spatial_index = {
  quadtree: quadtree
  bounds_map: Map<string, rectangle>
  element_positions: Map<string, vector2> // cached centers for quick removal
}
```

### Query Flow

```
query_range(bounds)
    ↓
quadtree query returns candidate IDs
    ↓
for each ID:
  get actual bounds from bounds_map
  check intersects_rectangle(actual_bounds, query_bounds)
    ↓
return filtered results
```

### Insertion Flow

```
insert_element(id, bounds)
    ↓
compute center of bounds
    ↓
store in bounds_map: id → bounds
store in element_positions: id → center
    ↓
insert into quadtree at center with id as data
```

### Update Flow

```
update_element(id, new_bounds)
    ↓
get old_center from element_positions
compute new_center from new_bounds
    ↓
if centers are same (within epsilon):
  just update bounds_map
else:
  remove from quadtree at old_center
  insert into quadtree at new_center
  update bounds_map and element_positions
```

## Types

```typescript
type spatial_index = {
  readonly quadtree: quadtree
  readonly bounds_map: Map<string, rectangle>
  readonly element_positions: Map<string, vector2>
  readonly config: spatial_index_config
}

type spatial_index_config = {
  readonly capacity: number // quadtree node capacity
  readonly max_depth: number // quadtree max depth
  readonly world_bounds: rectangle // initial quadtree bounds
}

type spatial_query_result = {
  readonly id: string
  readonly bounds: rectangle
}
```

## Functions

### Creation

```typescript
function create_spatial_index(config: spatial_index_config): spatial_index
function create_spatial_index_from_document(
  doc: document,
  config: spatial_index_config,
): spatial_index
```

### Modification

```typescript
function insert_spatial_index(index: spatial_index, id: string, bounds: rectangle): spatial_index
function remove_spatial_index(index: spatial_index, id: string): spatial_index
function update_spatial_index(index: spatial_index, id: string, bounds: rectangle): spatial_index
function clear_spatial_index(index: spatial_index): spatial_index
function rebuild_spatial_index(index: spatial_index, elements: Map<string, element>): spatial_index
```

### Queries

```typescript
function query_range_spatial_index(
  index: spatial_index,
  bounds: rectangle,
  out_results: spatial_query_result[],
): spatial_query_result[]

function query_point_spatial_index(
  index: spatial_index,
  x: number,
  y: number,
  out_results: spatial_query_result[],
): spatial_query_result[]

function query_radius_spatial_index(
  index: spatial_index,
  x: number,
  y: number,
  radius: number,
  out_results: spatial_query_result[],
): spatial_query_result[]

function query_frustum_spatial_index(
  index: spatial_index,
  frustum: frustum,
  out_results: spatial_query_result[],
): spatial_query_result[]
```

### Utilities

```typescript
function count_spatial_index(index: spatial_index): number
function bounds_of_spatial_index(index: spatial_index, out: rectangle): rectangle
function debug_render_spatial_index(index: spatial_index, renderer: renderer): void
```

## File Structure

```
spatial/
  types.ts         # spatial_index, config, query_result
  index.ts         # Creation, modification, rebuild
  query.ts         # Range, point, radius, frustum queries
  sync.ts          # Document change → index update logic
```

## Dependencies

From `math/`:

- `quadtree` - Core spatial data structure
- `rectangle` - Bounds representation
- `frustum` - View frustum queries
- `vector2` - Center point computation

## Integration Points

- **Document**: When elements change, spatial index must update
- **Camera**: Frustum culling uses spatial index queries
- **Hit Testing**: Point queries find clicked elements
- **Selection**: Range queries for marquee selection
- **LOD**: Distance queries for level-of-detail selection

## Synchronization Strategy

The spatial index must stay in sync with the document. Options:

1. **Manual sync** - Caller updates index when document changes
2. **Event-based sync** - Document emits change events, index listens
3. **Derived state** - Index is computed from document on demand

We use manual sync for simplicity. The pattern:

```typescript
// When adding element
document = add_element_document(document, element)
spatial_index = insert_spatial_index(spatial_index, element.id, element.bounds)

// When removing element
document = remove_element_document(document, id)
spatial_index = remove_spatial_index(spatial_index, id)

// When updating element
document = update_element_document(document, id, new_element)
spatial_index = update_spatial_index(spatial_index, id, new_element.bounds)
```

A higher-level wrapper could automate this.

## Performance Considerations

### Quadtree Sizing

The initial world bounds should encompass expected content. If elements are inserted outside bounds, the quadtree doesn't expand automatically (our implementation returns the unchanged tree).

Options:

1. Use very large initial bounds (-1M to +1M)
2. Rebuild with expanded bounds when needed
3. Modify quadtree to support expansion

Large initial bounds work for infinite canvas. The quadtree only subdivides where content exists.

### Query Optimization

For culling, we query once per frame. The result is stable while panning smoothly - same elements are visible. Cache the result and invalidate on:

- Camera movement beyond threshold
- Document change
- Zoom change

### Batch Operations

When loading a document:

```typescript
// Bad: O(n log n) with many tree modifications
for (element of elements) {
  index = insert_spatial_index(index, element.id, element.bounds)
}

// Good: O(n) bulk build
index = rebuild_spatial_index(index, elements)
```

Bulk operations should use a single tree construction.

## Open Questions

1. **Multiple quadtrees per layer?** - Would allow faster per-layer queries. But complicates cross-layer operations.

2. **Dynamic expansion** - Should the quadtree expand when elements are added outside current bounds? Or require explicit resize?

3. **Deletion reclamation** - After many deletions, quadtree has empty nodes. When to collapse/rebuild?

## Success Criteria

The spatial index is done when:

1. Range queries return correct elements (no false negatives)
2. Queries are fast enough for 60fps (< 1ms for typical viewport)
3. Index stays in sync with document changes
4. 10,000 elements are handled efficiently
5. Memory usage is reasonable (not O(n) maps duplicating all bounds)
