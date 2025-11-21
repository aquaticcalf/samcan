# samcan API Documentation

This document is a complete reference plus practical guidance for the public API surface exported from `samcan`.

## Index
1. High-Level Player API
2. Core Runtime
3. Rendering Abstraction
4. Scene Graph
5. Animation System (Timeline / Tracks / Keyframes / Easing)
6. State Machine System
7. Assets & Loading
8. Serialization & File Format
9. Plugin System
10. Command / Editor Utilities
11. Math & Geometry Primitives
12. Timing (Clock / Scheduler)
13. Error Handling
14. Performance Considerations
15. Type Glossary

---
## 1. High-Level Player API
Recommended entry points for 90% of use cases: simple playback, control, backend selection.

### React Wrapper (optional convenience)
A small React integration is available via the `samcan/react` subpath.

- `<SamcanPlayer>` component
  - Props extend `UseSamcanPlayerOptions` plus layout/styling:
    - `src?: string`
    - `autoplay?: boolean`
    - `loadOptions?: LoadOptions`
    - `config?: Omit<PlayerConfig, 'canvas'>`
    - `width?: number` / `height?: number` - CSS dimensions in pixels; if omitted, component fills container (100% width/height)
    - `style?: React.CSSProperties`
    - `className?: string`
    - `onReady?: (player: AnimationPlayer | null) => void`

  - The component automatically resizes the canvas buffer to match displayed dimensions with proper device pixel ratio handling, preventing scaling artifacts.

  - Typical usage (see `PlayerConfig` below for all options):
    ```tsx
    // Fixed size
    <SamcanPlayer
      src="/animations/hero.samcan"
      autoplay
      config={{ backend: 'canvas2d', loop: true, speed: 1.5 }}
      width={800}
      height={600}
    />

    // Responsive (fills container)
    <SamcanPlayer
      src="/animations/hero.samcan"
      autoplay
      style={{ width: '100%', height: '400px' }}
    />
    ```

- `useSamcanPlayer(options?: UseSamcanPlayerOptions)` hook
  - Options mirror the component props minus layout/styling.
  - Returns `{ canvasRef, player, isLoading, error }`.

Import examples:
```ts
import { SamcanPlayer, useSamcanPlayer } from 'samcan/react'
```

### `createPlayer(config: PlayerConfig): Promise<AnimationPlayer>`
Creates a configured player with chosen backend and returns an `AnimationPlayer` instance.

Config:
- `canvas: HTMLCanvasElement` required target
- `backend?: RendererBackend` default `'webgl'`
- `autoplay?: boolean` default `false`
- `loop?: boolean` default `false` (internally sets runtime loop mode)
- `speed?: number` default `1.0`
- `assetManager?: AssetManager` optional shared manager

### `play(canvas: HTMLCanvasElement, url: string, options?)`
Convenience one-liner: creates player, loads file, applies options, begins playback.
Options: `{ loop?: boolean; speed?: number; backend?: RendererBackend }`.

### `loadAnimation(url: string): Promise<SamcanFile>`
Fetch + parse (and decompress if `.gz`) without creating a player. Use for inspection or custom runtime wiring.

### `getBackendInfo()`
Returns `{ available: RendererBackend[]; canvas2d: boolean; webgl: boolean; webgpu: boolean }` for environment capability checks.

### `AnimationPlayer` Overview
Wrapper around `AnimationRuntime` providing ergonomic surface.
Properties (readonly): `runtime`, `renderer`, `assetManager`, `currentTime`, `duration`, `isPlaying`, `artboard`.
Methods:
- `load(source: string | SamcanFile, options?: LoadOptions)`
- `play()`, `pause()`, `stop()`
- `seek(time: number)` seconds
- `setSpeed(multiplier: number)`
- `setLoop(loop: boolean)` (maps to runtime loop mode "loop" or "none")
- `on(event, callback): () => void` events: `play`, `pause`, `stop`, `complete`, `loop`
- `resize(width, height)` adjusts renderer
- `destroy()` unloads animation (runtime resources preserved for reuse of renderer / asset manager)

LoadOptions: `{ preloadAssets?: boolean = true; assetTimeout?: number = 30000 }`.

---
## 2. Core Runtime
`AnimationRuntime` orchestrates timing, evaluation, rendering, events, and plugins.

Key properties: `artboard`, `timeline`, `renderer`, `currentTime`, `duration`, `speed`, `loopMode`, `isPlaying`, `state`.
Loop modes: `"none" | "loop" | "pingpong"`.
Playback control: `play()`, `pause()`, `stop()`, `seek(sec)`, `setSpeed(mult)`, `setLoop(mode)`.
Events via `on(event, fn)` / `once(event, fn)` / `off(event)` / `removeAllListeners()`.
Events: `play`, `pause`, `stop`, `complete`, `loop`, `stateChange`.
Plugins accessed via `runtime.plugins` (PluginRegistry).

Internal scheduling: integrates `Clock` (high precision) + `Scheduler` (frame callbacks). Frame evaluation handles loop wrapping and ping-pong reversal automatically.

---
## 3. Rendering Abstraction
Factory selects backend; renderer API hides implementation details.

### `RendererFactory.create(canvas, preferred?, fallbackOrder?)`
Attempts preferred then fallback order (default: `webgpu -> webgl -> canvas2d`). Emits warnings on fallback.

### Capability Queries
- `RendererFactory.isBackendAvailable(backend)`
- `RendererFactory.getAvailableBackends()`

### `Renderer` (selected subset - see type exports)
Lifecycle: `initialize(canvas)`, `resize(w,h)`, `beginFrame()`, `endFrame()`, `clear(color?)`.

---
## 4. Scene Graph
Hierarchical composition enabling transforms, opacity inheritance, visibility, culling.

`SceneNode` base:
- Properties: `transform`, `visible`, `opacity`, `parent`, `children[]`
- Methods: `addChild(node)`, `removeChild(node)`, `getWorldTransform()`, `getWorldOpacity()`, `getOwnWorldBounds()`, `getWorldBounds()`.

Node Types:
- `Artboard(width, height, backgroundColor)` root; acts as container
- `GroupNode(transform)` structural grouping
- `ShapeNode(path, transform)` vector shape (properties: `path`, `fill`, `stroke`, `strokeWidth`)
- `ImageNode(imageData, transform)` supports asset ID or loaded HTMLImageElement / ImageData, optional `sourceRect`

Transforms use `Transform` (position: `Vector2`, rotation radians, scale `Vector2`, pivot `Vector2`).

---
## 5. Animation System
### Timeline
`Timeline(duration, fps=60)` holds `AnimationTrack[]`. `evaluate(time)` clamps and evaluates all tracks.

### AnimationTrack
Targets a property path on a `SceneNode`. Methods: `addKeyframe(k)`, `removeKeyframe(k)`, `evaluate(time)` - performs interpolation and writes value to property path.
Property paths accept nested syntax (`transform.position.x`, `opacity`, etc.).

### Keyframe
`new Keyframe(time, value, interpolation="linear", easing?)`.
Interpolation types: `"linear" | "step" | "cubic" | "bezier"`.
Easing: any `(t:number)=>number`; common easings exposed via `Easing` collection.

Interpolation behavior (numeric):
- linear: straight blend
- step: previous value until next keyframe
- cubic: custom ease-in-out curve
- bezier: simplified smooth curve (approx cubic-bezier 0.42,0,0.58,1)
Non-numeric defaults to step behavior.

---
## 6. State Machine System
Interactive higher-level animation logic.

### `StateMachine`
Stores `AnimationState` objects, transitions, inputs & events. Methods: `addState`, `removeState`, `changeState(id)`, `addTransition`, `removeTransition`, `trigger(eventName)`, `setInput(name, value)`, specialized `setBooleanInput`, `setNumberInput`, getters for input values, `update(deltaSeconds)`, `reset()`.
Automatically evaluates transitions each update; chooses highest priority valid transition.

### `AnimationState`
Represents a timeline + configuration: id, name, `timeline`, `speed`, `loop`. Has activation lifecycle (enter/exit) used by controllers.

### Transitions
`StateTransition(from, to, conditions[], duration=0, priority=0)`. Conditions must all pass.
Condition types & classes:
- Events: `EventCondition(eventName)` (fires on one frame after `trigger()`)
- Booleans: `BooleanCondition(inputName, expectedValue)`
- Numbers: `NumberCondition(inputName, operator, threshold)` where operator: `equals | notEquals | greaterThan | greaterThanOrEqual | lessThan | lessThanOrEqual`
- Time: `TimeCondition(durationSeconds)` (state active time >= duration)

Blend `duration` reserved for future interpolation of state outputs.

### Controllers
Plugins that implement `AnimationController` get callbacks `onStateEnter`, `onStateExit`, `onTransition`.

---
## 7. Assets & Loading
`AssetManager` provides loading, caching, retry, fallback, dependency tracking.

Events: `load-start`, `load-success`, `load-error`, `load-retry`, `unload` via `.on(type, cb)` / `.off(type, cb)`.

Methods:
- `load(url, type, options?)` generic loader (image/font/audio placeholder)
- `loadImage(url, options?)` returns `RuntimeImageAsset` (fallback + placeholder pixel on failure)
- `loadFont(url, family, options?)` returns `FontAsset`
- `preload([{ url, type, ... }])` parallel batch
- `get(id)` / `unload(id)`
- Dependency tracking: `trackAssetUsage(artboardId, assetId)`, `getArtboardAssets(artboardId)`, `getAssetArtboards(assetId)`

Retry Options: `maxRetries`, `retryDelay` (exponential backoff), `fallbackUrl` for substitution, font descriptors (`family`, `weight`, `style`, `display`).

Placeholder: 1x1 transparent image used for failed image loads.

---
## 8. Serialization & File Format
`Serializer` converts runtime objects <-> data model; supports streaming & compression.

Key methods:
- Serialize: `serializeArtboard`, `serializeTimeline`, `serializeSamcanFile(artboards, metadata, { includeAssets, assetManager })`
- Deserialize: `deserializeArtboard`, `deserializeTimeline`, `deserializeSamcanFile`, per sub-structures
- Compression: `toCompressedJSON(file)`, `fromCompressedJSON(data)`
- Incremental parsing: `fromJSONIncremental(json)`, streaming: `fromJSONStream(stream)`, compressed streaming: `fromCompressedStream(stream)`, `fromCompressedJSONIncremental(data)`
- Asset bundling: `createAssetBundle(assetIds, assetManager)` -> map of blobs / URLs

File structure (`SamcanFile`): `version`, `metadata { name, author?, created, modified, description? }`, `artboards[]`, `assets[]`, optional `stateMachines[]`.

---
## 9. Plugin System
`PluginRegistry` manages plugin lifecycle.

Register: `plugins.register(plugin)` (interface validation) -> calls `plugin.initialize(runtime)`.
Unregister: `plugins.unregister(name)` -> calls `cleanup()` if present.
Update cycle: each frame invokes `plugin.update(deltaMs)` if implemented.

Plugin interface:
```ts
interface Plugin {
  metadata: { name: string; version: string; description?: string; author?: string }
  initialize(runtime: AnimationRuntime): void
  update?(deltaMs: number): void
  cleanup?(): void
}
```

Errors in plugins are caught & logged without halting runtime.

---
## 10. Command / Editor Utilities
Support undoable editing flows for authoring tools.

`Command` interface: `{ name, description, execute(args), undo(), canUndo }`.
`CommandHistory`: `execute(command)`, `undo()`, `redo()`, `clear()`, `canUndo`, `canRedo`, `maxHistorySize`.

Core editor commands (examples): `AddNodeCommand`, `DeleteNodeCommand`, `ModifyPropertyCommand`, `AddKeyframeCommand` (see source). Extend by implementing `Command` and pushing into history.

---
## 11. Math & Geometry Primitives
- `Vector2(x,y)` operations: length, normalize, distance, dot, add/subtract/multiply (methods or external utils) plus static helpers `Vector2.zero()`, `Vector2.one()`.
- `Matrix(a,b,c,d,tx,ty)` affine transform: multiply/invert/transformPoint.
- `Color(r,g,b,a)` methods: `lerp(other,t)`, conversions (e.g., to hex via helper), static `white/black/red/green/blue/fromHex`.
- `Rectangle(x,y,width,height)` intersection tests used for culling.
- `Paint` factories: `Paint.solid(color, blendMode?)`, `Paint.linearGradient(start,end,stops, blendMode?)`, `Paint.radialGradient(center,radius,stops,focal?, blendMode?)`.
- `Path` building: `moveTo`, `lineTo`, `curveTo`, `close`, `getBounds`, `clone`, `transform`. Boolean ops available via `path.operations` module (union/intersection/difference/xor).

Blend Modes subset: `normal | multiply | screen | overlay | darken | lighten`.

---
## 12. Timing
- `Clock`: `start()`, `stop()`, `tick()` returns delta ms; properties `elapsed`, `deltaTime`.
- `Scheduler`: `schedule(callback)`, `unschedule(callback)`, maintains frame callbacks, exposes `fps`.

Runtime uses these to drive deterministic frame updates and plugin updates.

---
## 13. Error Handling
All domain errors extend `SamcanError` with `.code`, `.context`, `.serialize()`, `.toJSON()`.

Error Codes (`ErrorCode` enum) categories:
- Serialization: `INVALID_FILE_FORMAT`, `UNSUPPORTED_VERSION`, `SERIALIZATION_FAILED`, `DESERIALIZATION_FAILED`, `FILE_PARSE_ERROR`
- Renderer: `RENDERER_INIT_FAILED`, `RENDERER_NOT_SUPPORTED`, `WEBGL_CONTEXT_LOST`, `WEBGPU_NOT_AVAILABLE`, `CANVAS_NOT_FOUND`
- Asset: `ASSET_LOAD_FAILED`, `ASSET_NOT_FOUND`, `INVALID_ASSET_TYPE`, `ASSET_DECODE_FAILED`, `FONT_LOAD_FAILED`
- Animation: `INVALID_ANIMATION_DATA`, `TIMELINE_ERROR`, `KEYFRAME_ERROR`, `STATE_MACHINE_ERROR`
- Plugin: `PLUGIN_ERROR`, `PLUGIN_INIT_FAILED`, `PLUGIN_NOT_FOUND`
- General: `INVALID_OPERATION`, `INVALID_ARGUMENT`, `NOT_IMPLEMENTED`, `UNKNOWN_ERROR`

Specialized subclasses: `AnimationError`, `RendererError`, `AssetError`, `SerializationError`, `PluginError` each provide static constructors for clarity.

Usage:
```ts
try { /* ... */ } catch (e) {
  if (e instanceof SamcanError) {
    console.error(e.code, e.context)
  }
}
```

---
## 14. Performance Considerations
Built-in strategies:
- Dirty Region + Culling: runtime skips nodes outside viewport.
- Batching: renderer groups similar paint operations.
- Object Pooling: reused small math objects reduce GC pressure.
- Incremental Parsing / Streaming: large files parsed in chunks.
- Retry / Fallback assets prevent blocking on failures.
- Loop modes avoid unnecessary recomputation on single-play completion.

Recommend: Minimize property paths with heavy nesting, batch asset preload calls, prefer gradients only where required, use pooling for frequent temporary vectors, leverage `pingpong` loop for reversible motion instead of redundant keyframes.

---
## 15. Type Glossary (Selected)
- `PlayerConfig` - creation config for `AnimationPlayer`
- `LoadOptions` - asset preloading & timeout control
- `RendererBackend` - `'canvas2d' | 'webgl' | 'webgpu'`
- `SamcanFile` - persisted animation file structure
- `AnimationData` - `{ artboard, timeline }` runtime payload
- `LoopMode` - playback looping behavior
- `InterpolationType` - keyframe interpolation classification
- `TransitionConditionType` - state machine condition taxonomy
- `AssetType` - currently `'image' | 'font' | 'audio' (pending)'`

For exhaustive type exports inspect module surfaces or your IDE's intellisense since everything is fully typed.

---
## Practical Recipes

### Manual Runtime Construction
```ts
import { AnimationRuntime, Timeline, AnimationTrack, Keyframe, ShapeNode, Path, Transform } from 'samcan'

const path = new Path(); path.moveTo(0,0); path.lineTo(100,0)
const shape = new ShapeNode(path, new Transform())
const timeline = new Timeline(2.0, 60)
const track = new AnimationTrack(shape, 'opacity')
track.addKeyframe(new Keyframe(0, 0))
track.addKeyframe(new Keyframe(2.0, 1))
```