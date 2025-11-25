# samcan Core Runtime

The `core/` folder contains the complete animation runtime that the editor builds upon. When implementing editor features, leverage these existing modules rather than reimplementing functionality.

## Core Modules

### Animation System (`core/animation/`)
- `AnimationRuntime` - Playback engine with play/pause/stop/seek/loop
- `Timeline` - Keyframe storage and evaluation
- `AnimationTrack` - Property animation tracks
- `Keyframe` - Time/value pairs with interpolation
- `Easing` - Built-in easing functions (linear, easeIn, easeOut, easeInOut, cubicBezier)
- `Interpolator` - Number, Vector2, Color interpolators
- `StateMachine` - Interactive animation states
- `StateTransition` - Transition conditions (event, boolean, number, time)

### Scene Graph (`core/scene/`)
- `SceneNode` - Base node with hierarchy, transforms, visibility, opacity
- `Transform` - Position, rotation, scale, pivot
- `Artboard` - Root container with dimensions and background color
- `ShapeNode` - Vector shapes with path, fill, stroke
- `ImageNode` - Bitmap images with source rect
- `GroupNode` - Container for organizing nodes

### Renderer (`core/renderer/`)
- `Renderer` interface - Unified drawing API
- `Canvas2DRenderer` - Canvas 2D implementation
- `WebGLRenderer` - WebGL implementation
- `RendererFactory` - Creates renderer with fallback
- `DirtyRegionManager` - Optimized redraw tracking
- `BatchManager` - Draw call batching

### Command System (`core/command/`)
- `Command` interface - Execute/undo pattern
- `BaseCommand` - Abstract base with validation helpers
- `CommandHistory` - Undo/redo stack management
- `AddNodeCommand` - Add node to scene
- `DeleteNodeCommand` - Remove node from scene
- `ModifyPropertyCommand` - Change node properties
- `AddKeyframeCommand` - Add keyframe to track

### Serialization (`core/serialization/`)
- `Serializer` - JSON serialization/deserialization
- `SamcanFile` - Root file format type
- `ArtboardData`, `NodeData`, `TimelineData` - Serializable types

### Asset Management (`core/asset/`)
- `AssetManager` - Load and cache images, fonts

### Math Utilities (`core/math/`)
- `Vector2` - 2D vector operations
- `Matrix` - 2D affine transforms
- `Rectangle` - Bounds and intersection
- `Color` - RGBA color with operations
- `Path` - Vector path commands
- `Paint` - Fill/stroke with gradients

### Plugin System (`core/plugin/`)
- `Plugin` interface - Lifecycle hooks
- `PluginRegistry` - Registration and management

### Error Handling (`core/error/`)
- `AnimationError` - Typed error codes

## Usage in Editor

When building editor features:

1. **Use existing commands** - Extend `BaseCommand` for new operations
2. **Leverage CommandHistory** - All edits should go through command history for undo/redo
3. **Use core types** - Don't recreate Vector2, Matrix, Color, etc.
4. **Use Serializer** - For save/load operations
5. **Use AnimationRuntime** - For playback preview in editor
6. **Use existing node types** - ShapeNode, ImageNode, GroupNode for scene objects

## Import Pattern

```typescript
import {
  // Scene
  SceneNode, Artboard, ShapeNode, ImageNode, GroupNode, Transform,
  // Animation
  Timeline, AnimationTrack, Keyframe, AnimationRuntime,
  // Commands
  CommandHistory, BaseCommand, AddNodeCommand, DeleteNodeCommand,
  // Math
  Vector2, Matrix, Rectangle, Color, Path, Paint,
  // Serialization
  Serializer, SamcanFile,
  // Renderer
  Renderer, RendererFactory,
  // Assets
  AssetManager,
} from '../core'
```
