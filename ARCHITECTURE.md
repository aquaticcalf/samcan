# Samcan Architecture

This document provides a comprehensive overview of samcan's architecture, design patterns, and code organization.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Application                     │
│                                                          │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │   Direct   │  │    React     │  │  Other Frameworks│ │
│  │    API     │  │   Wrapper    │  │    (Future)     │ │
│  └────────────┘  └──────────────┘  └─────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Core Runtime API                       │
│                      (api.ts)                            │
│                                                          │
│  • createPlayer()   • play()   • loadAnimation()        │
│  • AnimationPlayer  • getBackendInfo()                  │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌────────────────┐ ┌──────────┐ ┌──────────────┐
│  Animation     │ │  Scene   │ │  Renderer    │
│    System      │ │  Graph   │ │    System    │
└────────────────┘ └──────────┘ └──────────────┘
         │               │               │
         │               │               │
         ▼               ▼               ▼
┌────────────────────────────────────────────────────────┐
│                    Support Systems                      │
│                                                         │
│  ┌───────┐  ┌───────┐  ┌────────┐  ┌────────────┐    │
│  │ Math  │  │ Asset │  │ Timing │  │   Plugin   │    │
│  │ Lib   │  │  Mgr  │  │ System │  │   System   │    │
│  └───────┘  └───────┘  └────────┘  └────────────┘    │
└────────────────────────────────────────────────────────┘
```

## Core Modules

### 1. Animation System

The animation system provides timeline-based and state-machine driven animation capabilities.

```
Animation System
│
├── Timeline
│   ├── AnimationTrack (property animations)
│   │   └── Keyframe (time, value, interpolation)
│   └── Easing Functions
│
├── StateMachine
│   ├── AnimationState (named timeline)
│   └── StateTransition (conditions, blending)
│
└── AnimationRuntime (playback engine)
    ├── Clock (time tracking)
    ├── Scheduler (task scheduling)
    └── Event System
```

**Key Classes:**
- `Timeline`: Container for animation tracks
- `AnimationTrack`: Animates a specific property on a node
- `Keyframe`: Time/value pair with interpolation
- `StateMachine`: Interactive state-based animation
- `AnimationRuntime`: Main playback engine

### 2. Scene Graph

Hierarchical tree structure for organizing visual elements.

```
SceneNode (base class)
│
├── Artboard (root container)
├── GroupNode (organization)
├── ShapeNode (vector shapes)
└── ImageNode (bitmaps)

Each node has:
- Transform (position, rotation, scale, pivot)
- Visibility & Opacity
- Parent-child relationships
- World/local transform caching
- Dirty flag propagation
```

**Key Patterns:**
- **Composite Pattern**: Parent-child hierarchy
- **Dirty Flags**: Optimize transform/bounds recalculation
- **Transform Inheritance**: World transforms computed from hierarchy

### 3. Renderer System

Abstracted rendering with multiple backend implementations.

```
Renderer Interface
│
├── Canvas2DRenderer
│   ├── 2D Canvas API
│   ├── Path rendering
│   └── Batch optimization
│
├── WebGLRenderer
│   ├── Shader-based rendering
│   ├── Vertex batching
│   ├── Hardware acceleration
│   └── Texture management
│
└── WebGPURenderer (future)
    └── Modern GPU API

RendererFactory
└── Automatic fallback (WebGL → Canvas2D → WebGPU)
```

**Design Patterns:**
- **Strategy Pattern**: Renderer interface with multiple implementations
- **Factory Pattern**: RendererFactory with automatic fallback
- **Batch Pattern**: Reduce draw calls

### 4. Serialization System

Modular serialization/deserialization system.

```
Serializer (coordinator)
│
├── PrimitiveSerializers
│   └── Color, Vector2, Matrix, Transform, Paint
│
├── NodeSerializers
│   └── Scene graph nodes
│
├── AnimationSerializers
│   └── Timeline, Keyframes, StateMachine
│
├── AssetSerializers
│   └── Asset bundling, image conversion
│
└── FileSerializers
    └── Validation, versioning, compression
```

**Features:**
- JSON-based `.samcan` file format
- Version migration system
- Compression support (gzip)
- Streaming for large files

### 5. Command System

Undo/redo functionality using Command Pattern.

```
Command Interface
├── execute(args)
├── undo()
└── validate(args)

CommandHistory
├── Undo stack
├── Redo stack
└── execute(), undo(), redo()

Editor Commands
├── AddNodeCommand
├── DeleteNodeCommand
├── ModifyPropertyCommand
├── AddKeyframeCommand
└── MoveKeyframeCommand
```

## Data Flow

### Playback Flow

```
1. User Action
   ↓
2. AnimationRuntime.play()
   ↓
3. Clock updates (deltaTime)
   ↓
4. Timeline.evaluate(time)
   ↓
5. AnimationTrack.evaluate(time)
   ├── Find keyframes
   ├── Interpolate values
   └── Set property on node
   ↓
6. Scene Graph Update
   ├── Transform invalidation
   ├── Bounds recalculation
   └── Dirty flag propagation
   ↓
7. Renderer.render(scene)
   ├── Traverse scene graph
   ├── Batch draw calls
   └── Draw to canvas
   ↓
8. Canvas Output
```

### State Machine Flow

```
StateMachine
   ↓
Evaluate Transitions
   ├── Event conditions
   ├── Boolean conditions
   ├── Number conditions
   └── Time conditions
   ↓
Transition Triggered?
   ├─ No → Continue current state
   └─ Yes → Change to new state
            ↓
          Blend between states
            ↓
          Update timeline playback
```

## Design Patterns

### 1. Command Pattern
**Where**: `core/command/`
**Why**: Enables undo/redo functionality
**How**: Encapsulates operations with execute() and undo() methods

### 2. Factory Pattern
**Where**: `core/renderer/rendererfactory.ts`
**Why**: Abstract renderer creation with automatic fallback
**How**: `create()` method tries backends in priority order

### 3. Strategy Pattern
**Where**: `core/renderer/`
**Why**: Swap rendering backends at runtime
**How**: `Renderer` interface with multiple implementations

### 4. Observer Pattern
**Where**: Event emitters throughout
**Why**: Decouple components with events
**How**: `on()`, `off()`, `emit()` methods

### 5. Object Pool Pattern
**Where**: `core/math/pools.ts`
**Why**: Reduce GC pressure in tight loops
**How**: Pre-allocate Vector2, Matrix, Color objects

### 6. Composite Pattern
**Where**: `core/scene/`
**Why**: Hierarchical scene graph structure
**How**: SceneNode with parent-child relationships

## Performance Optimizations

### 1. Math Classes
- Direct public field access (no getters/setters)
- Reduces overhead in tight render loops
- Classes: Vector2, Matrix, Color, Rectangle, Transform

### 2. Object Pooling
- Reuse frequently allocated objects
- Reduces garbage collection pressure
- Used for: Vector2, Matrix, Color

### 3. Dirty Flags
- Only recalculate when needed
- Transform caching with invalidation
- Bounds caching

### 4. Batch Rendering
- Group similar draw calls
- Reduce state changes
- WebGL vertex batching

### 5. Lazy Evaluation
- Defer expensive calculations
- Compute world transforms on demand
- Calculate bounds only when needed

## Module Dependencies

```
api.ts
├── animation/
│   ├── animationruntime
│   ├── timeline
│   ├── statemachine
│   └── timing/
├── renderer/
│   ├── rendererfactory
│   ├── canvas2drenderer
│   └── webglrenderer
├── scene/
│   ├── node
│   └── nodes/
├── asset/
│   └── assetmanager
└── serialization/
    └── serializer

Dependencies Flow: (⇒ indicates "depends on")
api.ts ⇒ animation ⇒ scene ⇒ math
api.ts ⇒ renderer ⇒ math
api.ts ⇒ asset
api.ts ⇒ serialization ⇒ (animation + scene + math)
```

**Key Principles:**
- No circular dependencies
- Math library has no dependencies
- Core runtime independent of editor
- Framework wrappers depend on core, not vice versa

## Type System

### Strict TypeScript
- `strictNullChecks: true`
- No `any` types
- Branded types for IDs
- Generic constraints for type safety

### Error Handling
```
SamcanError (base)
├── AnimationError
├── RendererError
├── AssetError
├── SerializationError
└── PluginError
```

All errors include:
- Error code (for programmatic handling)
- Context object (relevant data)
- Timestamp
- Stack trace

## File Format

### .samcan File Structure
```json
{
  "version": "1.0.0",
  "metadata": {
    "name": "My Animation",
    "author": "Author Name",
    "created": "2026-01-27T00:00:00Z",
    "modified": "2026-01-27T00:00:00Z"
  },
  "artboards": [
    {
      "id": "node_0",
      "width": 800,
      "height": 600,
      "backgroundColor": { "r": 1, "g": 1, "b": 1, "a": 1 },
      "nodes": [...],
      "timeline": {...}
    }
  ],
  "assets": [...],
  "stateMachines": [...]
}
```

### Version Migration
- Semantic versioning (major.minor.patch)
- Automatic migration within same major version
- Breaking changes increment major version

## Extension Points

### 1. Plugins
```typescript
interface Plugin {
    onLoad?(): void
    onUnload?(): void
    onPlay?(): void
    onPause?(): void
    onUpdate?(deltaTime: number): void
    onRender?(): void
}
```

### 2. Custom Renderers
Implement `Renderer` interface to add new backends

### 3. Custom Commands
Extend `BaseCommand` for new editor operations

### 4. Custom Node Types
Extend `SceneNode` for new visual elements (future)

## Testing Strategy

### Test Pyramid
```
        ╱╲
       ╱E2╲       E2E Tests (few)
      ╱────╲
     ╱ Int  ╲     Integration Tests (some)
    ╱────────╲
   ╱   Unit   ╲   Unit Tests (many)
  ╱────────────╲
```

### Test Categories
1. **Unit Tests**: Individual classes and functions
2. **Integration Tests**: Multiple components working together
3. **Property-Based Tests**: Math operations with fast-check
4. **System Tests**: Full playback and rendering

### Coverage Goals
- Core runtime: >90%
- Public API: 100%
- Math library: 100% (property-based testing)

## Future Architecture Plans

### Phase 1: Editor Implementation
- Canvas viewport manager
- Selection tools
- Property panels
- Timeline UI

### Phase 2: Advanced Features
- Text rendering
- Filters and effects
- WebGPU renderer
- Worker thread support

### Phase 3: Ecosystem
- Plugin marketplace
- Template library
- Animation converter tools
- Cloud rendering service

---

This architecture emphasizes:
- **Modularity**: Clear separation of concerns
- **Extensibility**: Plugin system and interfaces
- **Performance**: Optimized for 60fps animation
- **Type Safety**: Strong TypeScript throughout
- **Testability**: Comprehensive test coverage
