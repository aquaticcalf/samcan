# Project Structure

## Directory Organization

```
samcan/
├── core/                    # Core animation runtime modules
│   ├── command/            # Command pattern for undo/redo
│   ├── math/               # Mathematical primitives
│   │   └── path/          # Path operations and utilities
│   ├── renderer/           # Multi-backend rendering system
│   ├── scene/             # Scene graph and node hierarchy
│   │   └── nodes/         # Concrete node implementations
│   └── timing/            # Animation timing and scheduling
├── editor/                 # Editor authoring tool
│   ├── core/              # Core editor functionality
│   ├── events/            # Event system
│   ├── types/             # Type definitions
│   └── index.ts           # Public API exports
├── .kiro/                  # Kiro IDE configuration
│   ├── specs/             # Feature specifications
│   │   ├── animation-runtime-core/
│   │   └── editor-authoring-tool/
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
- `nodes/`: Concrete node implementations (Artboard, GroupNode, ShapeNode, ImageNode)
- `index.ts`: Public API exports

### core/renderer
Multi-backend rendering system with automatic fallback:
- `renderer.ts`: Base Renderer interface and types
- `canvas2drenderer.ts`: Canvas2D implementation
- `webglrenderer.ts`: WebGL implementation
- `rendererfactory.ts`: Factory for creating renderers with fallback logic
- `index.ts`: Public API exports

### core/timing
Animation timing and frame scheduling:
- `clock.ts`: Time tracking and delta time calculation
- `scheduler.ts`: Frame-based callback scheduling
- `index.ts`: Public API exports

### core/command
Command pattern implementation:
- `command.ts`: Command interface for undo/redo operations
- `index.ts`: Public API exports

### editor/core
Core editor functionality:
- `editor.ts`: Main Editor class coordinating all editor functionality
- `viewport.ts`: Viewport management (zoom, pan, coordinate transformations)
- `index.ts`: Public API exports

### editor/events
Type-safe event system:
- `eventemitter.ts`: Generic EventEmitter implementation
- `index.ts`: Public API exports

### editor/types
TypeScript type definitions for editor:
- Editor configuration types
- Editor state types
- Event payload types
- `index.ts`: Public API exports

## Code Organization Patterns

### Module Exports (index.ts Pattern)
- **Every directory** should have an `index.ts` file that exports its public API
- This creates clean import paths: `import { Editor } from "./editor"` instead of `import { Editor } from "./editor/core/editor"`
- Subdirectories export through their own `index.ts`, then parent re-exports
- Example structure:
  ```
  editor/
  ├── core/
  │   ├── editor.ts
  │   ├── viewport.ts
  │   └── index.ts        # exports * from "./editor" and "./viewport"
  ├── types/
  │   └── index.ts        # exports all type definitions
  └── index.ts            # exports * from "./core" and "./types"
  ```
- This pattern applies to all modules: core, editor, and any future additions

### Other Patterns
- Classes use private fields with underscore prefix
- Getters return readonly types to prevent external mutation
- Dirty flag patterns for performance (e.g., `_worldTransformDirty`)

## Naming Conventions

- Classes: PascalCase (e.g., `SceneNode`, `Vector2`)
- Private fields: underscore prefix (e.g., `_parent`, `_children`)
- Public methods: camelCase with descriptive names
- Static factory methods: camelCase (e.g., `Vector2.zero()`)
- Interfaces: PascalCase, often with descriptive suffixes
- Type aliases: PascalCase (e.g., `EditorConfig`, `RendererBackend`)
- File names: lowercase, no separators (e.g., `eventemitter.ts`, `canvas2drenderer.ts`)
- Directory names: lowercase, no separators (e.g., `core/`, `editor/`)
