# samcan API Reference

Complete API reference for the samcan animation runtime.

## High-Level API

The high-level API provides simple, convenient methods for common use cases. This is the recommended API for most applications.

### Functions

#### `createPlayer(config: PlayerConfig): Promise<AnimationPlayer>`

Create an animation player with the specified configuration.

**Parameters:**
- `config.canvas` (HTMLCanvasElement) - The canvas element to render to
- `config.backend?` (RendererBackend) - Preferred rendering backend (default: "webgl")
- `config.autoplay?` (boolean) - Start playing immediately after loading (default: false)
- `config.loop?` (boolean) - Loop the animation (default: false)
- `config.speed?` (number) - Playback speed multiplier (default: 1.0)
- `config.assetManager?` (AssetManager) - Custom asset manager instance

**Returns:** Promise<AnimationPlayer>

**Example:**
```typescript
const player = await createPlayer({
  canvas: document.getElementById('canvas'),
  autoplay: true,
  loop: true
})
```

---

#### `play(canvas: HTMLCanvasElement, url: string, options?): Promise<AnimationPlayer>`

Load and play an animation with minimal configuration. This is the simplest way to play an animation.

**Parameters:**
- `canvas` (HTMLCanvasElement) - Canvas element to render to
- `url` (string) - URL of the animation file
- `options.loop?` (boolean) - Loop the animation
- `options.speed?` (number) - Playback speed multiplier
- `options.backend?` (RendererBackend) - Preferred rendering backend

**Returns:** Promise<AnimationPlayer>

**Example:**
```typescript
const player = await play(canvas, 'animation.samcan', { loop: true })
```

---

#### `loadAnimation(url: string): Promise<SamcanFile>`

Load an animation file from a URL without creating a player.

**Parameters:**
- `url` (string) - URL of the animation file

**Returns:** Promise<SamcanFile>

**Example:**
```typescript
const animation = await loadAnimation('animation.samcan')
console.log(animation.metadata.name)
```

---

#### `getBackendInfo(): BackendInfo`

Get information about available rendering backends.

**Returns:** Object with backend availability information
- `available` (RendererBackend[]) - Array of available backends
- `canvas2d` (boolean) - Canvas2D support
- `webgl` (boolean) - WebGL support
- `webgpu` (boolean) - WebGPU support

**Example:**
```typescript
const info = getBackendInfo()
console.log('Available:', info.available)
```

---

### AnimationPlayer Class

The main class for controlling animation playback.

#### Properties

- `runtime: AnimationRuntime` - Access to underlying runtime (readonly)
- `renderer: Renderer` - Access to renderer instance (readonly)
- `assetManager: AssetManager` - Access to asset manager (readonly)
- `currentTime: number` - Current playback time in seconds (readonly)
- `duration: number` - Animation duration in seconds (readonly)
- `isPlaying: boolean` - Whether animation is currently playing (readonly)
- `artboard: Artboard | null` - The loaded artboard (readonly)

#### Methods

##### `load(source: string | SamcanFile, options?: LoadOptions): Promise<void>`

Load an animation from a URL or SamcanFile object.

**Parameters:**
- `source` - URL string or SamcanFile object
- `options.preloadAssets?` (boolean) - Preload all assets (default: true)
- `options.assetTimeout?` (number) - Asset loading timeout in ms (default: 30000)

---

##### `play(): void`

Start or resume playback.

---

##### `pause(): void`

Pause playback at current time.

---

##### `stop(): void`

Stop playback and reset to beginning.

---

##### `seek(time: number): void`

Seek to a specific time in the animation.

**Parameters:**
- `time` (number) - Time in seconds

---

##### `setSpeed(speed: number): void`

Set playback speed multiplier.

**Parameters:**
- `speed` (number) - Speed multiplier (1.0 = normal, 2.0 = double speed, 0.5 = half speed)

---

##### `setLoop(loop: boolean): void`

Set loop mode.

**Parameters:**
- `loop` (boolean) - Whether to loop the animation

---

##### `on(event: string, callback: () => void): () => void`

Register an event listener.

**Parameters:**
- `event` - Event name: "play", "pause", "stop", "complete", or "loop"
- `callback` - Callback function

**Returns:** Unsubscribe function

---

##### `resize(width: number, height: number): void`

Resize the canvas and renderer.

**Parameters:**
- `width` (number) - New width in pixels
- `height` (number) - New height in pixels

---

##### `destroy(): void`

Clean up resources.

---

## Core Runtime API

For advanced usage, you can access the core runtime classes directly.

### AnimationRuntime

The core animation engine.

**Key Methods:**
- `load(data: AnimationData): Promise<void>` - Load animation data
- `unload(): void` - Unload current animation
- `play(): void` - Start playback
- `pause(): void` - Pause playback
- `stop(): void` - Stop playback
- `seek(time: number): void` - Seek to time
- `setSpeed(speed: number): void` - Set playback speed
- `setLoop(mode: LoopMode): void` - Set loop mode ("none", "loop", "pingpong")
- `on<K>(event: K, callback): () => void` - Register event listener

**Key Properties:**
- `isPlaying: boolean` - Playback state
- `currentTime: number` - Current time
- `duration: number` - Animation duration
- `artboard: Artboard | null` - Loaded artboard
- `timeline: Timeline | null` - Loaded timeline
- `renderer: Renderer | null` - Renderer instance
- `plugins: PluginRegistry` - Plugin registry

---

### RendererFactory

Factory for creating renderers with automatic fallback.

**Methods:**
- `static create(canvas, preferredBackend?, fallbackOrder?): Promise<Renderer>` - Create renderer
- `static isBackendAvailable(backend): boolean` - Check backend availability
- `static getAvailableBackends(): RendererBackend[]` - Get available backends

---

### AssetManager

Manages loading and caching of assets.

**Methods:**
- `load(url, type, options?): Promise<Asset>` - Load asset
- `loadImage(url, options?): Promise<RuntimeImageAsset>` - Load image
- `loadFont(url, family, options?): Promise<FontAsset>` - Load font
- `get(id): Asset | null` - Get loaded asset
- `unload(id): void` - Unload asset
- `preload(urls): Promise<void>` - Preload multiple assets
- `on(eventType, callback): void` - Register event listener
- `off(eventType, callback): void` - Unregister event listener

**Properties:**
- `loadedAssets: ReadonlyMap<string, Asset>` - Loaded assets

---

### Serializer

Handles serialization and deserialization of animation files.

**Methods:**
- `serializeSamcanFile(artboards, metadata?, options?): SamcanFile` - Serialize to file
- `deserializeSamcanFile(data): { artboards, stateMachines }` - Deserialize file
- `toJSON(file, pretty?): string` - Convert to JSON string
- `fromJSON(json): SamcanFile` - Parse from JSON string
- `compress(data): Promise<Uint8Array>` - Compress data
- `decompress(data): Promise<string>` - Decompress data
- `toCompressedJSON(file, pretty?): Promise<Uint8Array>` - Serialize and compress
- `fromCompressedJSON(data): Promise<SamcanFile>` - Decompress and deserialize

---

## Scene Graph API

### SceneNode

Base class for all scene graph nodes.

**Properties:**
- `transform: Transform` - Local transform
- `visible: boolean` - Visibility flag
- `opacity: number` - Opacity (0-1)
- `parent: SceneNode | null` - Parent node
- `children: readonly SceneNode[]` - Child nodes

**Methods:**
- `addChild(node): void` - Add child node
- `removeChild(node): void` - Remove child node
- `getWorldTransform(): Matrix` - Get world transform matrix
- `getWorldOpacity(): number` - Get world opacity
- `getLocalBounds(): Rectangle` - Get local bounding box
- `getWorldBounds(): Rectangle` - Get world bounding box

---

### Artboard

Root container for a scene.

**Properties:**
- `width: number` - Artboard width
- `height: number` - Artboard height
- `backgroundColor: Color` - Background color

---

### ShapeNode

Node for rendering vector shapes.

**Properties:**
- `path: Path` - Vector path
- `fill: Paint | null` - Fill paint
- `stroke: Paint | null` - Stroke paint
- `strokeWidth: number` - Stroke width

---

### ImageNode

Node for rendering images.

**Properties:**
- `imageData: string | HTMLImageElement | ImageData` - Image data or asset ID
- `sourceRect: Rectangle | null` - Source rectangle for cropping

---

### GroupNode

Container node for grouping other nodes.

---

## Animation API

### Timeline

Manages animation tracks and keyframes.

**Properties:**
- `duration: number` - Timeline duration in seconds
- `fps: number` - Frames per second
- `tracks: readonly AnimationTrack[]` - Animation tracks

**Methods:**
- `addTrack(track): void` - Add animation track
- `removeTrack(track): void` - Remove animation track
- `evaluate(time): void` - Evaluate all tracks at given time

---

### AnimationTrack

Animates a specific property of a scene node.

**Properties:**
- `target: SceneNode` - Target node
- `property: string` - Property path (e.g., "position.x")
- `keyframes: readonly Keyframe[]` - Keyframes

**Methods:**
- `addKeyframe(keyframe): void` - Add keyframe
- `removeKeyframe(keyframe): void` - Remove keyframe
- `evaluate(time): any` - Evaluate value at time

---

### Keyframe

Defines a value at a specific time.

**Properties:**
- `time: number` - Time in seconds
- `value: any` - Keyframe value
- `interpolation: InterpolationType` - Interpolation type
- `easing?: EasingFunction` - Easing function

---

### StateMachine

Manages animation states and transitions.

**Properties:**
- `currentState: AnimationState | null` - Current active state
- `states: ReadonlyMap<string, AnimationState>` - All states
- `transitions: readonly StateTransition[]` - State transitions

**Methods:**
- `addState(state): void` - Add state
- `removeState(stateId): void` - Remove state
- `addTransition(transition): void` - Add transition
- `changeState(stateId): void` - Change to state
- `trigger(eventName): void` - Trigger event
- `setInput(name, value): void` - Set input value
- `update(deltaTime): void` - Update state machine

---

## Math API

### Vector2

2D vector for positions, directions, and scales.

**Static Methods:**
- `Vector2.zero(): Vector2` - Create zero vector (0, 0)
- `Vector2.one(): Vector2` - Create one vector (1, 1)

**Methods:**
- `add(other): Vector2` - Add vectors
- `subtract(other): Vector2` - Subtract vectors
- `multiply(scalar): Vector2` - Multiply by scalar
- `dot(other): number` - Dot product
- `length(): number` - Vector length
- `normalize(): Vector2` - Normalize vector
- `distance(other): number` - Distance to other vector

---

### Matrix

2D affine transformation matrix.

**Static Methods:**
- `Matrix.identity(): Matrix` - Create identity matrix
- `Matrix.translation(x, y): Matrix` - Create translation matrix
- `Matrix.rotation(angle): Matrix` - Create rotation matrix
- `Matrix.scale(x, y): Matrix` - Create scale matrix

**Methods:**
- `multiply(other): Matrix` - Multiply matrices
- `invert(): Matrix` - Invert matrix
- `transformPoint(point): Vector2` - Transform point

---

### Color

RGBA color representation.

**Static Methods:**
- `Color.white(): Color` - White color
- `Color.black(): Color` - Black color
- `Color.red(): Color` - Red color
- `Color.green(): Color` - Green color
- `Color.blue(): Color` - Blue color
- `Color.fromHex(hex): Color` - Create from hex string

**Methods:**
- `toHex(): string` - Convert to hex string
- `lerp(other, t): Color` - Interpolate to other color

---

### Paint

Fill and stroke styling.

**Static Methods:**
- `Paint.solid(color, blendMode?): Paint` - Create solid color paint
- `Paint.linearGradient(start, end, stops, blendMode?): Paint` - Create linear gradient
- `Paint.radialGradient(center, radius, stops, focal?, blendMode?): Paint` - Create radial gradient

---

### Path

Vector path for shapes.

**Methods:**
- `moveTo(x, y): void` - Move to point
- `lineTo(x, y): void` - Line to point
- `curveTo(cp1x, cp1y, cp2x, cp2y, x, y): void` - Cubic bezier curve
- `close(): void` - Close path
- `getBounds(): Rectangle` - Get bounding box
- `clone(): Path` - Clone path
- `transform(matrix): Path` - Transform path

---

## Types

### PlayerConfig

Configuration for creating an AnimationPlayer.

```typescript
interface PlayerConfig {
  canvas: HTMLCanvasElement
  backend?: RendererBackend
  autoplay?: boolean
  loop?: boolean
  speed?: number
  assetManager?: AssetManager
}
```

---

### LoadOptions

Options for loading animations.

```typescript
interface LoadOptions {
  preloadAssets?: boolean
  assetTimeout?: number
}
```

---

### RendererBackend

Rendering backend type.

```typescript
type RendererBackend = 'canvas2d' | 'webgl' | 'webgpu'
```

---

### SamcanFile

Animation file format.

```typescript
interface SamcanFile {
  version: string
  metadata: FileMetadata
  artboards: ArtboardData[]
  assets: AssetData[]
  stateMachines?: StateMachineData[]
}
```

---

## Error Handling

All errors thrown by samcan extend the `SamcanError` base class.

### Error Types

- `AnimationError` - Animation-related errors
- `RendererError` - Rendering errors
- `AssetError` - Asset loading errors
- `SerializationError` - Serialization/deserialization errors
- `PluginError` - Plugin errors

### Error Properties

All error types have:
- `message: string` - Error message
- `code: ErrorCode` - Error code
- `context?: ErrorContext` - Additional context
- `cause?: Error` - Original error (if wrapped)

### Example

```typescript
try {
  await player.load('animation.samcan')
} catch (error) {
  if (error instanceof AnimationError) {
    console.error('Animation error:', error.message, error.code)
  } else if (error instanceof AssetError) {
    console.error('Asset error:', error.message)
  }
}
```
