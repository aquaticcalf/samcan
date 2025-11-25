# samcan Project Structure

## Directory Layout

```
samcan/
├── core/                    # Core runtime (DO NOT MODIFY for editor features)
│   ├── animation/           # Animation system
│   ├── asset/               # Asset management
│   ├── command/             # Command pattern for undo/redo
│   ├── error/               # Error types
│   ├── math/                # Math utilities (Vector2, Matrix, Color, etc.)
│   ├── plugin/              # Plugin system
│   ├── renderer/            # Rendering backends
│   ├── scene/               # Scene graph nodes
│   ├── serialization/       # File format
│   ├── timing/              # Clock and scheduling
│   ├── api.ts               # Public API (AnimationPlayer, createPlayer)
│   └── index.ts             # Core exports
│
├── core/editor/             # Editor implementation (NEW)
│   ├── core/                # Editor state, managers
│   ├── canvas/              # Viewport, rendering, input
│   ├── tools/               # Selection, shape, pen tools
│   ├── panels/              # React UI panels
│   ├── commands/            # Editor-specific commands
│   └── index.ts             # Editor exports
│
├── wrapper/                 # Framework wrappers (React, etc.)
├── test/                    # Test files
├── docs/                    # Documentation
└── .kiro/
    ├── specs/               # Feature specifications
    └── steering/            # Context for AI assistance
```

## Key Conventions

### TypeScript
- Strict mode enabled
- Use interfaces for public APIs
- Use classes for stateful components
- Export types separately from implementations

### Testing
- Tests in `test/` directory with `.test.ts` suffix
- Use Vitest as test runner
- Property-based tests use fast-check library

### Code Style
- Biome for formatting and linting
- No semicolons (configured in biome.json)
- 4-space indentation

### Imports
- Use relative imports within modules
- Use `../core` to import from core runtime
- Avoid circular dependencies