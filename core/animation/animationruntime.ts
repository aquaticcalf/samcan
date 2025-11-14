import type { Artboard } from "../scene/nodes/artboard"
import type { ImageAsset, Renderer } from "../renderer/renderer"
import type { SceneNode } from "../scene/node"
import type { Path } from "../math/path"
import type { Paint } from "../math/paint"
import type { Rectangle } from "../math/rectangle"
import { Matrix } from "../math/matrix"
import { Clock } from "../timing/clock"
import { Scheduler } from "../timing/scheduler"
import { Timeline } from "./timeline"
import { EventEmitter } from "../../editor/events/emitter"
import { PluginRegistry } from "../plugin/pluginregistry"

/**
 * Animation data structure that can be loaded into the runtime
 */
export interface AnimationData {
    artboard: Artboard
    timeline: Timeline
}

/**
 * Playback state of the animation runtime
 */
export type PlaybackState = "idle" | "playing" | "paused" | "stopped"

/**
 * Loop mode for animation playback
 */
export type LoopMode = "none" | "loop" | "pingpong"

/**
 * Runtime events that can be emitted during animation playback
 */
export interface RuntimeEvents {
    play: void
    pause: void
    stop: void
    complete: void
    loop: void
    stateChange: PlaybackState
}

/**
 * Type for runtime event names
 */
export type RuntimeEvent = keyof RuntimeEvents

/**
 * AnimationRuntime manages the lifecycle and playback of animations
 * Connects Clock, Scheduler, and Timeline to execute animations
 */
export class AnimationRuntime {
    private _artboard: Artboard | null = null
    private _timeline: Timeline | null = null
    private _renderer: Renderer | null = null
    private _clock: Clock
    private _scheduler: Scheduler
    private _state: PlaybackState = "idle"
    private _currentTime: number = 0
    private _speed: number = 1.0
    private _loopMode: LoopMode = "none"
    private _direction: number = 1 // 1 for forward, -1 for reverse (used in pingpong)
    private _events: EventEmitter<RuntimeEvents>
    private _pluginRegistry: PluginRegistry

    constructor(renderer?: Renderer) {
        this._renderer = renderer ?? null
        this._clock = new Clock()
        this._scheduler = new Scheduler()
        this._events = new EventEmitter<RuntimeEvents>()
        this._pluginRegistry = new PluginRegistry(this)
    }

    /**
     * Load animation data into the runtime
     * @param data Animation data containing artboard and timeline
     */
    async load(data: AnimationData): Promise<void> {
        // Unload any existing animation first
        if (this._artboard !== null || this._timeline !== null) {
            this.unload()
        }

        // Validate the data
        if (!data.artboard) {
            throw new Error("AnimationData must contain an artboard")
        }

        if (!data.timeline) {
            throw new Error("AnimationData must contain a timeline")
        }

        // Load the animation data
        this._artboard = data.artboard
        this._timeline = data.timeline
        this._currentTime = 0
        this._state = "stopped"

        // Evaluate timeline at time 0 to set initial state
        this._timeline.evaluate(0)
    }

    /**
     * Unload the current animation and clean up resources
     */
    unload(): void {
        // Stop playback if running
        if (this._state === "playing") {
            this._stopPlayback()
        }

        // Clear all plugins
        this._pluginRegistry.clear()

        // Clear animation data
        this._artboard = null
        this._timeline = null
        this._currentTime = 0
        this._state = "idle"
    }

    /**
     * Get the current playback state
     */
    get state(): PlaybackState {
        return this._state
    }

    /**
     * Check if animation is currently playing
     */
    get isPlaying(): boolean {
        return this._state === "playing"
    }

    /**
     * Get the current playback time in seconds
     */
    get currentTime(): number {
        return this._currentTime
    }

    /**
     * Get the duration of the loaded animation in seconds
     * Returns 0 if no animation is loaded
     */
    get duration(): number {
        return this._timeline?.duration ?? 0
    }

    /**
     * Get the loaded artboard
     * Returns null if no animation is loaded
     */
    get artboard(): Artboard | null {
        return this._artboard
    }

    /**
     * Get the loaded timeline
     * Returns null if no animation is loaded
     */
    get timeline(): Timeline | null {
        return this._timeline
    }

    /**
     * Get the clock instance
     */
    get clock(): Clock {
        return this._clock
    }

    /**
     * Get the scheduler instance
     */
    get scheduler(): Scheduler {
        return this._scheduler
    }

    /**
     * Get the current playback speed multiplier
     */
    get speed(): number {
        return this._speed
    }

    /**
     * Get the current loop mode
     */
    get loopMode(): LoopMode {
        return this._loopMode
    }

    /**
     * Get the renderer instance
     * Returns null if no renderer is set
     */
    get renderer(): Renderer | null {
        return this._renderer
    }

    /**
     * Set the renderer instance
     * @param renderer The renderer to use for rendering the scene graph
     */
    setRenderer(renderer: Renderer): void {
        this._renderer = renderer
    }

    /**
     * Get the plugin registry instance
     */
    get plugins(): PluginRegistry {
        return this._pluginRegistry
    }

    /**
     * Start or resume animation playback
     * If paused, resumes from current time
     * If stopped, starts from beginning
     */
    play(): void {
        if (!this._timeline) {
            throw new Error("Cannot play: no animation loaded")
        }

        if (this._state === "playing") {
            return // Already playing
        }

        // If stopped, reset to beginning
        if (this._state === "stopped") {
            this._currentTime = 0
            this._direction = 1
            this._timeline.evaluate(this._currentTime)
        }

        this._startPlayback()
        this._events.emit("play", undefined)
        this._events.emit("stateChange", this._state)
    }

    /**
     * Pause animation playback
     * Maintains current time position
     */
    pause(): void {
        if (this._state !== "playing") {
            return // Not playing, nothing to pause
        }

        this._state = "paused"
        this._clock.stop()
        this._scheduler.unschedule(this._onFrame)
        this._events.emit("pause", undefined)
        this._events.emit("stateChange", this._state)
    }

    /**
     * Stop animation playback and reset to beginning
     */
    stop(): void {
        if (this._state === "idle") {
            return // No animation loaded
        }

        const wasActivelyPlaying = this._state === "playing"
        const previousState = this._state

        if (wasActivelyPlaying) {
            this._stopPlayback()
        } else {
            this._state = "stopped"
        }

        // Reset to beginning
        this._currentTime = 0
        this._direction = 1

        if (this._timeline) {
            this._timeline.evaluate(this._currentTime)
        }

        // Emit events only if we were in a meaningful state (playing or paused)
        if (previousState === "playing" || previousState === "paused") {
            this._events.emit("stop", undefined)
            this._events.emit("stateChange", this._state)
        }
    }

    /**
     * Seek to a specific time in the animation
     * @param time Time in seconds to seek to
     */
    seek(time: number): void {
        if (!this._timeline) {
            throw new Error("Cannot seek: no animation loaded")
        }

        // Clamp time to valid range
        this._currentTime = Math.max(0, Math.min(time, this._timeline.duration))

        // Evaluate timeline at new time
        this._timeline.evaluate(this._currentTime)

        // Update state if currently idle
        if (this._state === "idle") {
            this._state = "stopped"
        }
    }

    /**
     * Set the playback speed multiplier
     * @param speed Speed multiplier (1.0 = normal, 2.0 = double speed, 0.5 = half speed)
     */
    setSpeed(speed: number): void {
        if (speed <= 0) {
            throw new Error("Speed must be greater than 0")
        }

        this._speed = speed
    }

    /**
     * Set the loop mode for playback
     * @param mode Loop mode: "none" (play once), "loop" (repeat), or "pingpong" (reverse on each loop)
     */
    setLoop(mode: LoopMode): void {
        this._loopMode = mode
    }

    /**
     * Register an event listener for runtime events
     * @param event Event name to listen for
     * @param callback Function to call when event is emitted
     * @returns Unsubscribe function to remove the listener
     */
    on<K extends RuntimeEvent>(
        event: K,
        callback: (data: RuntimeEvents[K]) => void,
    ): () => void {
        return this._events.on(event, callback)
    }

    /**
     * Register a one-time event listener that automatically unsubscribes after first call
     * @param event Event name to listen for
     * @param callback Function to call when event is emitted
     */
    once<K extends RuntimeEvent>(
        event: K,
        callback: (data: RuntimeEvents[K]) => void,
    ): void {
        this._events.once(event, callback)
    }

    /**
     * Remove all listeners for a specific event
     * @param event Event name to remove listeners for
     */
    off(event: RuntimeEvent): void {
        this._events.off(event)
    }

    /**
     * Remove all event listeners
     */
    removeAllListeners(): void {
        this._events.removeAllListeners()
    }

    /**
     * Internal method to start playback
     * Connects clock and scheduler for frame updates
     */
    private _startPlayback(): void {
        if (!this._timeline) {
            throw new Error("Cannot start playback: no animation loaded")
        }

        this._state = "playing"
        this._clock.start()

        // Schedule the update callback
        this._scheduler.schedule(this._onFrame)
    }

    /**
     * Internal method to stop playback
     * Disconnects clock and scheduler
     */
    private _stopPlayback(): void {
        this._state = "stopped"
        this._clock.stop()
        this._scheduler.unschedule(this._onFrame)
    }

    /**
     * Frame callback that updates the animation
     * Bound to this instance to maintain context
     */
    private _onFrame = (deltaTime: number): void => {
        if (!this._timeline || this._state !== "playing") {
            return
        }

        // Update clock
        this._clock.tick()

        // Update plugins with error handling
        this._pluginRegistry.update(deltaTime)

        // Update current time based on delta and speed
        // Convert deltaTime from milliseconds to seconds
        const deltaSeconds = (deltaTime / 1000) * this._speed * this._direction

        this._currentTime += deltaSeconds

        // Handle loop modes
        const duration = this._timeline.duration

        if (this._loopMode === "none") {
            // No looping - stop at end
            if (this._currentTime >= duration || this._currentTime < 0) {
                this._currentTime = Math.max(
                    0,
                    Math.min(duration, this._currentTime),
                )
                this._timeline.evaluate(this._currentTime)
                this._renderFrame()
                this._stopPlayback()
                this._emitPlaybackComplete()
                return
            }
        } else if (this._loopMode === "loop") {
            // Loop mode - wrap around
            if (this._currentTime >= duration) {
                this._currentTime = this._currentTime % duration
                this._emitLoopEvent()
            } else if (this._currentTime < 0) {
                this._currentTime = duration + (this._currentTime % duration)
                this._emitLoopEvent()
            }
        } else if (this._loopMode === "pingpong") {
            // Ping-pong mode - reverse direction at boundaries
            if (this._currentTime >= duration) {
                this._currentTime = duration - (this._currentTime - duration)
                this._direction = -1
                this._emitLoopEvent()
            } else if (this._currentTime < 0) {
                this._currentTime = -this._currentTime
                this._direction = 1
                this._emitLoopEvent()
            }
        }

        // Evaluate timeline at current time
        this._timeline.evaluate(this._currentTime)

        // Render the scene graph
        this._renderFrame()
    }

    /**
     * Helper method to emit loop event
     */
    private _emitLoopEvent(): void {
        this._events.emit("loop", undefined)
    }

    /**
     * Helper method to emit complete event and state change
     */
    private _emitPlaybackComplete(): void {
        this._events.emit("complete", undefined)
        this._events.emit("stateChange", this._state)
    }

    /**
     * Render the current frame using the renderer
     * Renders the artboard and its scene graph
     */
    private _renderFrame(): void {
        if (!this._renderer || !this._artboard) {
            return
        }

        // Begin frame
        this._renderer.beginFrame()

        // Clear with artboard background color
        this._renderer.clear(this._artboard.backgroundColor)

        // Render the scene graph
        this._renderNode(this._artboard)

        // End frame
        this._renderer.endFrame()
    }

    /**
     * Recursively render a node and its children
     * @param node The node to render
     */
    private _renderNode(node: SceneNode): void {
        if (!this._renderer) {
            return
        }

        // Skip if not visible
        if (!node.visible) {
            return
        }

        // Save renderer state
        this._renderer.save()

        // Apply world transform
        const worldTransform = node.getWorldTransform()
        this._renderer.transform(worldTransform)

        // Apply opacity
        const worldOpacity = node.getWorldOpacity()
        this._renderer.setOpacity(worldOpacity)

        // Render the node based on its type
        this._renderNodeContent(node)

        // Render children
        for (const child of node.children) {
            this._renderNode(child)
        }

        // Restore renderer state
        this._renderer.restore()
    }

    /**
     * Render the content of a specific node type
     * @param node The node to render
     */
    private _renderNodeContent(node: SceneNode): void {
        if (!this._renderer) {
            return
        }

        // ShapeNode: has path, fill, and stroke properties
        if (this._isShapeNode(node)) {
            this._renderShapeNode(node)
            return
        }

        // ImageNode: has imageData property
        if (this._isImageNode(node)) {
            this._renderImageNode(node)
            return
        }

        // Artboard and GroupNode don't render content, only their children
    }

    /**
     * Type guard to check if a node is a ShapeNode
     * @param node The node to check
     */
    private _isShapeNode(node: SceneNode): node is SceneNode & {
        path: Path
        fill: Paint | null
        stroke: Paint | null
        strokeWidth: number
    } {
        return (
            "path" in node &&
            "fill" in node &&
            "stroke" in node &&
            "strokeWidth" in node
        )
    }

    /**
     * Type guard to check if a node is an ImageNode
     * @param node The node to check
     */
    private _isImageNode(node: SceneNode): node is SceneNode & {
        imageData: ImageData | HTMLImageElement | string
        sourceRect: Rectangle | null
    } {
        return "imageData" in node && "sourceRect" in node
    }

    /**
     * Render a ShapeNode
     * @param node The ShapeNode to render
     */
    private _renderShapeNode(
        node: SceneNode & {
            path: Path
            fill: Paint | null
            stroke: Paint | null
            strokeWidth: number
        },
    ): void {
        if (!this._renderer) {
            return
        }

        // Render fill
        if (node.fill) {
            this._renderer.drawPath(node.path, node.fill)
        }

        // Render stroke
        if (node.stroke && node.strokeWidth > 0) {
            this._renderer.drawStroke(node.path, node.stroke, node.strokeWidth)
        }
    }

    /**
     * Render an ImageNode
     * @param node The ImageNode to render
     */
    private _renderImageNode(
        node: SceneNode & {
            imageData: ImageData | HTMLImageElement | string
            sourceRect: Rectangle | null
        },
    ): void {
        if (!this._renderer) {
            return
        }

        // Only render if we have loaded image data
        const imageData = node.imageData
        if (
            typeof imageData === "string" ||
            (!(imageData instanceof HTMLImageElement) &&
                !(imageData instanceof ImageData))
        ) {
            return
        }

        // Create ImageAsset wrapper
        const imageAsset: ImageAsset = {
            width:
                imageData instanceof HTMLImageElement
                    ? imageData.naturalWidth
                    : imageData.width,
            height:
                imageData instanceof HTMLImageElement
                    ? imageData.naturalHeight
                    : imageData.height,
            data:
                imageData instanceof HTMLImageElement
                    ? imageData
                    : (imageData as unknown as ImageBitmap),
        }

        // Draw image with identity transform (node transform already applied)
        this._renderer.drawImage(imageAsset, Matrix.identity())
    }
}
