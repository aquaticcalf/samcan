/**
 * samcan - Open-source animation runtime and authoring system
 * A modern reimagination of Adobe Flash for the web
 *
 * @packageDocumentation
 */

// High-level API (recommended for most users)
export {
    createPlayer,
    play,
    loadAnimation,
    getBackendInfo,
    AnimationPlayer,
    type PlayerConfig,
    type LoadOptions,
} from "./core/api"

// Core runtime classes
export {
    AnimationRuntime,
    type AnimationData,
} from "./core/animation/animationruntime"
export { RendererFactory } from "./core/renderer/rendererfactory"
export { AssetManager } from "./core/asset/assetmanager"
export { Serializer } from "./core/serialization/serializer"

// Scene graph
export { SceneNode } from "./core/scene/node"
export { Transform } from "./core/scene/transform"
export { Artboard } from "./core/scene/nodes/artboard"
export { GroupNode } from "./core/scene/nodes/groupnode"
export { ShapeNode } from "./core/scene/nodes/shapenode"
export { ImageNode } from "./core/scene/nodes/imagenode"

// Animation system
export { Timeline } from "./core/animation/timeline"
export { AnimationTrack } from "./core/animation/animationtrack"
export { Keyframe } from "./core/animation/keyframe"
export { StateMachine } from "./core/animation/statemachine"
export { AnimationState } from "./core/animation/animationstate"
export { StateTransition } from "./core/animation/statetransition"
export { Easing } from "./core/animation/easing"

// Math primitives
export { Vector2 } from "./core/math/vector2"
export { Matrix } from "./core/math/matrix"
export { Color } from "./core/math/color"
export { Rectangle } from "./core/math/rectangle"
export { Paint } from "./core/math/paint"
export { Path } from "./core/math/path"

// Timing
export { Clock } from "./core/timing/clock"
export { Scheduler } from "./core/timing/scheduler"

// Renderer types
export type {
    Renderer,
    RendererBackend,
    RendererCapabilities,
} from "./core/renderer/renderer"

// Serialization types
export type {
    SamcanFile,
    ArtboardData,
    TimelineData,
} from "./core/serialization/types"

// Asset types
export type { Asset, RuntimeImageAsset, FontAsset } from "./core/asset/types"

// Plugin system
export { PluginRegistry } from "./core/plugin/pluginregistry"
export type { Plugin } from "./core/plugin/plugin"

// Command system
export type { Command } from "./core/command/command"
export { CommandHistory } from "./core/command/commandhistory"

// Error types
export { SamcanError } from "./core/error/samcanerror"
export { AnimationError } from "./core/error/animationerror"
export { RendererError } from "./core/error/renderererror"
export { AssetError } from "./core/error/asseterror"
export { SerializationError } from "./core/error/serializationerror"
export { PluginError } from "./core/error/pluginerror"
