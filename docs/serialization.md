# Serialization

## Problem Statement

Users need to save their work and load it later. The document in memory must become bytes on disk (or in a database, or sent over network).

Serialization concerns:

- **Format** - JSON? Binary? Custom?
- **Completeness** - What's saved vs reconstructed?
- **Compatibility** - Old files work with new versions?
- **Size** - Large documents shouldn't be huge files
- **Speed** - Save/load should be fast

## Design Decisions

### Why JSON as primary format?

Options:

- **JSON** - Text, human-readable, widely supported
- **Binary** - Compact, fast parsing, opaque
- **Protobuf/MessagePack** - Schema-based, efficient
- **Custom** - Whatever we want

We use JSON because:

1. **Debugging** - Can open file in text editor
2. **Tooling** - jq, JSON viewers, etc.
3. **Interop** - Every language has JSON support
4. **Diffable** - Version control works
5. **Simple** - No schema compilation, no format documentation

The cost is size and parse speed. Acceptable for most documents.

We can add binary export later for large documents.

### Why not store everything?

Some data is derived or ephemeral:

- **Derived**: Splines computed from points, element bounds from geometry
- **Ephemeral**: Selection state, undo history, loaded image bitmaps

Storing derived data:

- Pro: Faster load (no recomputation)
- Con: Larger file, stale if computation changes

We store source data, not derived:

```typescript
// Stored
points: vector2[]

// NOT stored (recomputed on load)
spline: spline
bounds: rectangle
simplified_points: vector2[]
```

Exception: if recomputation is expensive (>100ms), consider caching.

### Why include version number?

```json
{
  "version": 1,
  "document": { ... }
}
```

Without version, we can't know what format old files use. Changes become breaking.

With version, we can:

1. Detect old formats
2. Run migration logic
3. Warn about unsupported future versions

Version is semantic: increment when format changes.

### Why separate schema from serialization?

The schema defines what the format looks like:

```typescript
type document_v1_schema = {
  version: 1
  id: string
  elements: element_v1_schema[]
  layers: layer_v1_schema[]
}
```

Serialization converts runtime types to schema:

```typescript
function serialize_document(doc: document): document_v1_schema
function deserialize_document(data: document_v1_schema): document
```

This separation allows:

- Schema validation (is this valid v1 format?)
- Multiple schema versions coexisting
- Clear migration paths

### Why migrations instead of backwards-compatible changes?

Option 1: Make all changes additive (new optional fields)

```json
// v1
{ "color": "#ff0000" }
// v2 - added opacity
{ "color": "#ff0000", "opacity": 0.5 }  // opacity optional, default 1
```

Option 2: Version + migration

```typescript
function migrate_v1_to_v2(v1: schema_v1): schema_v2 {
  return { ...v1, opacity: 1.0 }
}
```

Additive works until it doesn't - eventually you need breaking changes:

- Rename a field
- Change a type
- Remove unused cruft

We use version + migration. Additive for minor changes, new version for structural changes.

### Why compress large documents?

A document with 10,000 strokes × 100 points × 16 bytes = 16MB uncompressed.

Options:

1. **No compression** - Simple, large files
2. **gzip wrapper** - `file.json.gz`
3. **Internal compression** - Compress before JSON stringify

We use gzip wrapper:

- Standard format (gunzip works)
- Browser has CompressionStream API
- Typically 5-10x reduction for coordinate data

Files are `.samcan` (uncompressed JSON) or `.samcan.gz` (gzipped).

### Why handle images separately?

Images can be:

1. **Embedded** - Base64 in JSON (huge, but self-contained)
2. **External** - URL/path reference (small, but dependencies)
3. **Bundled** - Zip archive with JSON + image files

For single-file sharing: embed small images, external large ones
For project files: bundled archive

```typescript
type image_reference =
  | { type: "embedded"; data: string } // base64
  | { type: "external"; url: string } // http or relative path
  | { type: "bundled"; path: string } // path within archive
```

Default: embed images under 100KB, external otherwise.

## Schema Design

### Document Schema (v1)

```typescript
type document_v1 = {
  version: 1
  id: string
  name: string
  created_at: string // ISO 8601
  modified_at: string

  elements: element_v1[]
  layers: layer_v1[]

  viewport: {
    x: number
    y: number
    zoom: number
  }
}

type element_v1 = stroke_v1 | shape_v1 | image_v1 | text_v1

type stroke_v1 = {
  type: "stroke"
  id: string
  layer_id: string
  z_index: number

  points: [number, number][]
  pressure: number[] | null
  color: string // hex
  width: number
  opacity: number
}

type shape_v1 = {
  type: "shape"
  id: string
  layer_id: string
  z_index: number

  shape_type: "rectangle" | "ellipse" | "line" | "arrow"
  bounds: [number, number, number, number]
  fill: string | null
  stroke: string | null
  stroke_width: number
  // ... shape-specific fields
}

type layer_v1 = {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  element_ids: string[]
}
```

### Why arrays for coordinates?

```typescript
// This
points: [number, number][]
bounds: [number, number, number, number]

// Not this
points: { x: number, y: number }[]
bounds: { x: number, y: number, width: number, height: number }
```

Arrays are more compact in JSON:

```json
[[0,0],[10,5],[20,10]]  // 24 chars
[{"x":0,"y":0},{"x":10,"y":5},{"x":20,"y":10}]  // 50 chars
```

For coordinate-heavy data (strokes), this matters.

### Why hex colors?

```json
"color": "#ff0000"
```

Not RGBA arrays or objects:

- Hex is readable
- CSS compatibility
- Smaller in JSON

Alpha in 8-char hex: `#ff0000ff`

## Functions

### Core Serialization

```typescript
function serialize_document(doc: document): string
function deserialize_document(json: string): document

function serialize_document_compressed(doc: document): Uint8Array
function deserialize_document_compressed(data: Uint8Array): document
```

### Partial Serialization

```typescript
function serialize_elements(elements: element[]): string
function deserialize_elements(json: string): element[]

// For clipboard
function serialize_selection(doc: document, selection: string[]): string
function deserialize_selection(json: string, target_doc: document): element[]
```

### Migration

```typescript
function detect_version(json: string): number
function migrate_document(json: string, target_version: number): string
function is_compatible(json: string): boolean
```

### Validation

```typescript
function validate_document_schema(json: unknown): json is document_v1
function get_validation_errors(json: unknown): string[]
```

## File Structure

```
serialize/
  types.ts         # Schema types (document_v1, element_v1, etc.)
  serialize.ts     # Serialize runtime → JSON
  deserialize.ts   # Deserialize JSON → runtime
  migrate.ts       # Version migrations
  validate.ts      # Schema validation
  compress.ts      # Compression utilities
  image.ts         # Image embedding/referencing
```

## Integration

### Save Flow

```
document (runtime)
    ↓
serialize_document() → document_v1 schema
    ↓
JSON.stringify()
    ↓
(optional) compress with gzip
    ↓
write to file / send to server
```

### Load Flow

```
read file / receive from server
    ↓
(if compressed) decompress
    ↓
JSON.parse()
    ↓
detect_version()
    ↓
(if old version) migrate to current
    ↓
validate_document_schema()
    ↓
deserialize_document() → runtime document
    ↓
recompute derived data (bounds, splines, etc.)
```

## Compatibility Strategy

### Forward Compatibility

New app loading old file: always supported via migrations.

### Backward Compatibility

Old app loading new file: limited support.

We add a `min_reader_version` field:

```json
{
  "version": 3,
  "min_reader_version": 2,
  ...
}
```

If `min_reader_version > app_version`, warn user to upgrade.

If `min_reader_version <= app_version`, load what we can, ignore unknown fields.

### Migration Example

v1 → v2: Added layer opacity

```typescript
function migrate_v1_to_v2(doc: document_v1): document_v2 {
  return {
    ...doc,
    version: 2,
    layers: doc.layers.map((layer) => ({
      ...layer,
      opacity: 1.0, // default for old documents
    })),
  }
}
```

## Export Formats

Beyond native format, support common exports:

### SVG Export

```typescript
function export_svg(doc: document): string
```

Vector format, editable in Illustrator/Inkscape.

- Strokes become `<path>` elements
- Shapes become SVG primitives
- Images embedded as base64 or external

### PNG/JPEG Export

```typescript
function export_image(doc: document, options: ImageExportOptions): Promise<Blob>
```

Rasterize to canvas, export via `toBlob()`.

Options: resolution, background color, bounds (whole doc or selection).

### PDF Export (Future)

Using a library like jsPDF. Lower priority.

## Open Questions

1. **Streaming** - For huge documents, can we stream serialize/deserialize to avoid loading everything in memory?

2. **Incremental saves** - Save only changed elements, not whole document? Useful for auto-save.

3. **Cloud sync format** - Different requirements than file save (smaller deltas, conflict resolution).

4. **Import from other tools** - Can we import from Excalidraw, Figma, etc.? Each is a separate project.

## Success Criteria

The serialization system is done when:

1. Save/load roundtrip preserves all document data
2. Old files load correctly with migrations
3. File size is reasonable (gzip reduces significantly)
4. Load time is acceptable (< 1s for typical document)
5. Invalid files produce helpful error messages
