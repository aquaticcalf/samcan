# Design Document: samcan Animation Runtime Core

## Overview

samcan is architected as a layered system with clear separation of concerns. The core runtime is framework-agnostic and can run in any JavaScript environment (browser, Node.js, Deno, Bun). The architecture follows modern animation engine patterns inspired by Rive, Lottie, and research from game engines like Unity's animation system and Unreal's Sequencer.

The system is divided into five primary layers:

1. **Core Runtime Layer** - Animation playback engine, timing, and lifecycle management
2. **Renderer Abstraction Layer** - Unified interface for multiple rendering backends
3. **Scene Graph Layer** - Hierarchical representation of visual elements
4. **Animation Data Layer** - Timeline, keyframes, state machines, and interpolation
5. **Serialization Layer** - File format and data persistence

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                       │
│              (Editor, Player, Embedded Usage)               │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Public API Layer                         │
│         (Animation, Artboard, StateMachine APIs)            │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐    ┌───────▼─────┐
│  Core Runtime  │   │   Scene Graph   │    │  Animation  │
│     Engine     │   │     Manager     │    │    Data     │
│                │   │                 │    │   System    │
│  - Playback    │   │  - Hierarchy    │    │ - Timeline  │
│  - Timing      │   │  - Transform    │    │ - Keyframes │
│  - Lifecycle   │   │  - Culling      │    │ - State     │
└───────┬────────┘   └────────┬────────┘    │   Machine   │
        │                     │             └──────┬──────┘
        │                     │                    │
        └─────────────────────┼────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│              Renderer Abstraction Layer                     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Canvas2D   │  │    WebGL     │  │   WebGPU     │       │
│  │   Renderer   │  │   Renderer   │  │   Renderer   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Asset Management                          │
│            (Images, Fonts, Resources)                       │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Core Runtime Engine

The runtime engine manages the animation lifecycle and timing.

#### AnimationRuntime

```typescript
interface AnimationRuntime {
  // Lifecycle
  load(data: AnimationData): Promise<void>
  unload(): void
  
  // Playback control
  play(): void
  pause(): void
  stop(): void
  seek(time: number): void
  
  // Configuration
  setSpeed(speed: number): void
  setLoop(loop: boolean | number): void
  
  // State
  readonly isPlaying: boolean
  readonly currentTime: number
  readonly duration: number
  
  // Events
  on(event: RuntimeEvent, callback: EventCallback): void
  off(event: RuntimeEvent, callback: EventCallback): void
}

type RuntimeEvent = 
  | 'play' 
  | 'pause' 
  | 'stop' 
  | 'complete' 
  | 'loop'
  | 'stateChange'
```

#### Clock System

The clock system provides high-precision timing using `performance.now()` and handles frame scheduling.

```typescript
interface Clock {
  start(): void
  stop(): void
  tick(): number // Returns delta time in milliseconds
  readonly elapsed: number
  readonly deltaTime: number
}

interface Scheduler {
  schedule(callback: FrameCallback): void
  unschedule(callback: FrameCallback): void
  readonly fps: number
}
```

### 2. Renderer Abstraction Layer

The renderer provides a unified interface across different backends.

#### Renderer Interface

```typescript
interface Renderer {
  // Initialization
  initialize(canvas: HTMLCanvasElement): Promise<void>
  resize(width: number, height: number): void
  
  // Frame lifecycle
  beginFrame(): void
  endFrame(): void
  clear(color?: Color): void
  
  // Drawing primitives
  drawPath(path: Path, paint: Paint): void
  drawImage(image: ImageAsset, transform: Matrix): void
  drawText(text: string, font: Font, position: Vector2, paint: Paint): void
  
  // State management
  save(): void
  restore(): void
  transform(matrix: Matrix): void
  
  // Capabilities
  readonly backend: RendererBackend
  readonly capabilities: RendererCapabilities
}

type RendererBackend = 'canvas2d' | 'webgl' | 'webgpu'

interface RendererCapabilities {
  maxTextureSize: number
  supportsBlendModes: boolean
  supportsFilters: boolean
}
```

#### Renderer Factory

```typescript
class RendererFactory {
  static create(
    preferredBackend?: RendererBackend,
    fallbackOrder: RendererBackend[] = ['webgpu', 'webgl', 'canvas2d']
  ): Renderer {
    // Try preferred backend first, then fallback
  }
}
```

### 3. Scene Graph Layer

The scene graph represents the visual hierarchy and handles transformations.

#### Node Hierarchy

```typescript
interface SceneNode {
  readonly id: string
  name: string
  
  // Hierarchy
  parent: SceneNode | null
  children: SceneNode[]
  addChild(node: SceneNode): void
  removeChild(node: SceneNode): void
  
  // Transform
  transform: Transform
  readonly worldTransform: Matrix
  
  // Visibility
  visible: boolean
  opacity: number
  
  // Rendering
  render(renderer: Renderer): void
  
  // Hit testing
  hitTest(point: Vector2): boolean
}

interface Transform {
  position: Vector2
  rotation: number // radians
  scale: Vector2
  pivot: Vector2
  
  toMatrix(): Matrix
}
```

#### Specialized Node Types

```typescript
interface ShapeNode extends SceneNode {
  path: Path
  fill: Paint | null
  stroke: Paint | null
  strokeWidth: number
}

interface ImageNode extends SceneNode {
  image: ImageAsset
  sourceRect: Rectangle
}

interface GroupNode extends SceneNode {
  // Container for other nodes
  clipToBounds: boolean
}

interface Artboard extends GroupNode {
  width: number
  height: number
  backgroundColor: Color
}
```

### 4. Animation Data System

#### Timeline

```typescript
interface Timeline {
  readonly duration: number
  readonly fps: number
  
  tracks: AnimationTrack[]
  
  evaluate(time: number): void
  addTrack(track: AnimationTrack): void
  removeTrack(track: AnimationTrack): void
}

interface AnimationTrack {
  readonly target: SceneNode
  readonly property: string // e.g., 'position.x', 'rotation', 'opacity'
  
  keyframes: Keyframe[]
  
  evaluate(time: number): any
  addKeyframe(keyframe: Keyframe): void
  removeKeyframe(keyframe: Keyframe): void
}

interface Keyframe {
  time: number
  value: any
  interpolation: InterpolationType
  easing?: EasingFunction
}

type InterpolationType = 
  | 'linear'
  | 'step'
  | 'cubic'
  | 'bezier'

type EasingFunction = (t: number) => number
```

#### Interpolation System

```typescript
interface Interpolator<T> {
  interpolate(from: T, to: T, t: number, easing: EasingFunction): T
}

// Built-in interpolators for common types
class NumberInterpolator implements Interpolator<number> { }
class Vector2Interpolator implements Interpolator<Vector2> { }
class ColorInterpolator implements Interpolator<Color> { }
class PathInterpolator implements Interpolator<Path> { }
```

#### State Machine

```typescript
interface StateMachine {
  readonly currentState: AnimationState | null
  
  states: Map<string, AnimationState>
  transitions: StateTransition[]
  
  addState(state: AnimationState): void
  removeState(stateId: string): void
  addTransition(transition: StateTransition): void
  
  trigger(eventName: string): void
  setInput(name: string, value: any): void
  
  update(deltaTime: number): void
}

interface AnimationState {
  readonly id: string
  name: string
  timeline: Timeline
  speed: number
  loop: boolean
}

interface StateTransition {
  from: string // state id
  to: string // state id
  conditions: TransitionCondition[]
  duration: number // blend duration
  priority: number
}

interface TransitionCondition {
  type: 'event' | 'boolean' | 'number' | 'time'
  evaluate(context: StateMachineContext): boolean
}
```

### 5. Vector Graphics System

#### Path Representation

```typescript
interface Path {
  commands: PathCommand[]
  
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  curveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void
  close(): void
  
  getBounds(): Rectangle
  clone(): Path
  transform(matrix: Matrix): Path
}

type PathCommand = 
  | { type: 'M', x: number, y: number }
  | { type: 'L', x: number, y: number }
  | { type: 'C', cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number }
  | { type: 'Q', cpx: number, cpy: number, x: number, y: number }
  | { type: 'Z' }

interface Paint {
  type: 'solid' | 'linear-gradient' | 'radial-gradient'
  color?: Color
  gradient?: Gradient
  blendMode: BlendMode
}

type BlendMode = 
  | 'normal' 
  | 'multiply' 
  | 'screen' 
  | 'overlay' 
  | 'darken' 
  | 'lighten'
```

#### Boolean Operations

```typescript
interface PathOperations {
  union(path1: Path, path2: Path): Path
  intersection(path1: Path, path2: Path): Path
  difference(path1: Path, path2: Path): Path
  xor(path1: Path, path2: Path): Path
}
```

### 6. Serialization System

#### File Format

The samcan file format is JSON-based with the following structure:

```typescript
interface SamcanFile {
  version: string // e.g., "1.0.0"
  metadata: {
    name: string
    author?: string
    created: string // ISO date
    modified: string // ISO date
  }
  
  artboards: ArtboardData[]
  assets: AssetData[]
  stateMachines?: StateMachineData[]
}

interface ArtboardData {
  id: string
  name: string
  width: number
  height: number
  backgroundColor: ColorData
  
  nodes: NodeData[]
  timeline: TimelineData
}

interface NodeData {
  id: string
  type: 'shape' | 'image' | 'group' | 'text'
  name: string
  transform: TransformData
  visible: boolean
  opacity: number
  
  // Type-specific data
  shape?: ShapeData
  image?: ImageData
  text?: TextData
  
  children?: NodeData[]
}
```

#### Serializer

```typescript
interface Serializer {
  serialize(artboard: Artboard): SamcanFile
  deserialize(data: SamcanFile): Artboard
  
  validate(data: unknown): data is SamcanFile
  migrate(data: SamcanFile, targetVersion: string): SamcanFile
}
```

### 7. Command System (Editor Support)

```typescript
interface Command<T = any> {
  name: string
  description: string
  execute(args: T[]): void
  undo(): void
  canUndo: boolean
}

interface CommandHistory {
  execute(command: Command): void
  undo(): void
  redo(): void
  clear(): void
  
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly maxHistorySize: number
}

// Example commands
class AddNodeCommand implements Command<SceneNode> { }
class DeleteNodeCommand implements Command<string> { }
class ModifyPropertyCommand implements Command<PropertyChange> { }
class AddKeyframeCommand implements Command<KeyframeData> { }
```

### 8. Asset Management

```typescript
interface AssetManager {
  load(url: string, type: AssetType): Promise<Asset>
  get(id: string): Asset | null
  unload(id: string): void
  preload(urls: string[]): Promise<void>
  
  readonly loadedAssets: Map<string, Asset>
}

type AssetType = 'image' | 'font' | 'audio'

interface Asset {
  readonly id: string
  readonly type: AssetType
  readonly url: string
  readonly loaded: boolean
}

interface ImageAsset extends Asset {
  readonly width: number
  readonly height: number
  readonly data: HTMLImageElement | ImageBitmap
}

interface FontAsset extends Asset {
  readonly family: string
  readonly fontFace: FontFace
}
```

### 9. Plugin System

```typescript
interface Plugin {
  readonly name: string
  readonly version: string
  
  initialize(runtime: AnimationRuntime): void
  update?(deltaTime: number): void
  cleanup?(): void
}

interface PluginRegistry {
  register(plugin: Plugin): void
  unregister(pluginName: string): void
  get(pluginName: string): Plugin | null
  
  readonly plugins: Plugin[]
}

// Example plugin interface for custom controllers
interface AnimationController extends Plugin {
  onStateEnter?(state: AnimationState): void
  onStateExit?(state: AnimationState): void
  onTransition?(from: AnimationState, to: AnimationState): void
}
```

## Data Models

### Core Math Types

```typescript
interface Vector2 {
  x: number
  y: number
}

interface Rectangle {
  x: number
  y: number
  width: number
  height: number
}

interface Color {
  r: number // 0-1
  g: number // 0-1
  b: number // 0-1
  a: number // 0-1
}

interface Matrix {
  // 2D affine transformation matrix (3x3)
  a: number
  b: number
  c: number
  d: number
  tx: number
  ty: number
  
  multiply(other: Matrix): Matrix
  invert(): Matrix
  transformPoint(point: Vector2): Vector2
}
```

## Error Handling

### Error Types

```typescript
class SamcanError extends Error {
  constructor(message: string, public code: ErrorCode) {
    super(message)
  }
}

enum ErrorCode {
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
  UNSUPPORTED_VERSION = 'UNSUPPORTED_VERSION',
  RENDERER_INIT_FAILED = 'RENDERER_INIT_FAILED',
  ASSET_LOAD_FAILED = 'ASSET_LOAD_FAILED',
  INVALID_ANIMATION_DATA = 'INVALID_ANIMATION_DATA',
  PLUGIN_ERROR = 'PLUGIN_ERROR',
}
```

### Error Recovery

- **Renderer Fallback**: If a preferred renderer fails to initialize, automatically fall back to the next available backend
- **Asset Loading**: Provide placeholder assets when loading fails, emit error events for application handling
- **Animation Data**: Validate animation data on load, skip invalid tracks/keyframes with warnings
- **Plugin Isolation**: Wrap plugin calls in try-catch to prevent plugin errors from crashing the runtime

## Testing Strategy

### Unit Testing

- **Math Utilities**: Test vector, matrix, and color operations for correctness
- **Interpolation**: Verify interpolation functions produce expected values at t=0, t=0.5, t=1
- **Path Operations**: Test path command generation and boolean operations
- **Timeline Evaluation**: Verify keyframe evaluation and track blending
- **State Machine**: Test state transitions and condition evaluation

### Integration Testing

- **Renderer Backends**: Test each renderer backend produces visually identical output
- **Serialization**: Round-trip test (serialize → deserialize → serialize) produces identical data
- **Animation Playback**: Verify playback timing accuracy across different frame rates
- **Asset Loading**: Test loading various asset formats and error handling

### Performance Testing

- **Rendering Performance**: Benchmark frame rate with varying scene complexity (100, 500, 1000, 5000 objects)
- **Memory Usage**: Monitor memory consumption during long-running animations
- **Load Time**: Measure file parsing and asset loading times for various file sizes
- **State Machine**: Benchmark transition evaluation with complex condition trees

### Visual Regression Testing

- **Snapshot Testing**: Capture rendered frames and compare against reference images
- **Cross-Browser**: Test rendering consistency across Chrome, Firefox, Safari
- **Backend Comparison**: Verify Canvas2D, WebGL, and WebGPU produce identical visual output

## Performance Optimization Strategies

### Rendering Optimizations

1. **Dirty Rectangle Tracking**: Only redraw regions that changed
2. **Culling**: Skip rendering objects outside viewport
3. **Draw Call Batching**: Combine multiple draw operations with same paint
4. **Object Pooling**: Reuse matrix and vector objects to reduce GC pressure
5. **Level of Detail**: Simplify paths when rendered at small sizes

### Animation Optimizations

1. **Lazy Evaluation**: Only evaluate tracks for visible objects
2. **Keyframe Caching**: Cache interpolated values between keyframes
3. **Transform Caching**: Cache world transforms until hierarchy changes
4. **SIMD**: Use SIMD operations for batch vector/matrix math where available

### Memory Optimizations

1. **Asset Sharing**: Share assets across multiple artboards
2. **Texture Atlasing**: Pack multiple images into single textures
3. **Path Simplification**: Reduce path complexity while maintaining visual quality
4. **Incremental Loading**: Stream large animation files in chunks

## Research Integration

### Modern Animation Techniques

- **Motion Matching**: Research from game animation for natural transitions
- **Inverse Kinematics**: For character rigging and procedural animation
- **Physics-Based Animation**: Spring dynamics and damping for natural motion
- **Procedural Animation**: Noise functions and algorithmic animation

### Rendering Research

- **GPU Path Rendering**: Techniques from Pathfinder and piet-gpu for high-performance vector rendering
- **Signed Distance Fields**: For scalable text and shape rendering
- **Compute Shaders**: Use WebGPU compute for parallel animation evaluation

### Compression and Optimization

- **Quantization**: Reduce precision of animation data where imperceptible
- **Curve Fitting**: Reduce keyframe count by fitting curves to dense data
- **Binary Format**: Optional binary format for faster parsing and smaller files

## Future Extensibility

### Planned Extensions

1. **3D Support**: Extend to 3D transforms and perspective cameras
2. **Particle Systems**: Built-in particle emitters and physics
3. **Audio Sync**: Timeline synchronization with audio tracks
4. **Scripting**: Embedded scripting language for interactive logic
5. **Collaborative Editing**: Real-time multi-user editing support
6. **Export Targets**: Export to video, GIF, sprite sheets, native formats

### API Stability

- **Semantic Versioning**: Follow semver for breaking changes
- **Deprecation Policy**: Deprecate APIs for at least one major version before removal
- **Extension Points**: Provide stable interfaces for plugins and custom renderers
