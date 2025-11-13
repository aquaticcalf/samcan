# Project Structure

## Directory Organization

```
samcan/
├── core/                    # Core animation runtime modules
│   ├── command/            # Command pattern for undo/redo
│   ├── math/               # Mathematical primitives
│   │   └── path/          # Path operations and utilities
│   └── scene/             # Scene graph and node hierarchy
├── .kiro/                  # Kiro IDE configuration
│   ├── specs/             # Feature specifications
│   └── steering/          # AI assistant guidance rules
└── index.ts               # Main entry point
```

## Module Architecture

### core/math
Mathematical primitives and utilities for 2D graphics:
- `vector2.ts`: 2D vector operations (position, direction, scale)
- `matrix.ts`: Transformation matrices for affine transformations
- `color.ts`: Color representation and manipulation
- `paint.ts`: Fill and stroke styling
- `rectangle.ts`: Bounding box and rectangle operations
- `utils.ts`: Shared mathematical utilities
- `path/`: Path primitives and boolean operations

### core/scene
Scene graph and node hierarchy:
- `node.ts`: Base SceneNode class with parent-child relationships
- `transform.ts`: Local and world transform management
- `index.ts`: Public API exports

### core/command
Command pattern implementation:
- `command.ts`: Command interface for undo/redo operations
- `index.ts`: Public API exports

## Code Organization Patterns

- Each module exports through `index.ts` for clean public API
- Core modules are re-exported from `core/index.ts`
- Classes use private fields with underscore prefix
- Getters return readonly types to prevent external mutation
- Dirty flag patterns for performance (e.g., `_worldTransformDirty`)

## Naming Conventions

- Classes: PascalCase (e.g., `SceneNode`, `Vector2`)
- Private fields: underscore prefix (e.g., `_parent`, `_children`)
- Public methods: camelCase with descriptive names
- Static factory methods: camelCase (e.g., `Vector2.zero()`)
- Interfaces: PascalCase, often with descriptive suffixes
- file names: small letters, no "-" or "_"
