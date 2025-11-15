import {
    AnimationRuntime,
    type AnimationData,
} from "./animation/animationruntime"
import { RendererFactory } from "./renderer/rendererfactory"
import { AssetManager } from "./asset/assetmanager"
import { Serializer } from "./serialization/serializer"
import type { Renderer, RendererBackend } from "./renderer/renderer"
import type { SamcanFile } from "./serialization/types"
import type { Artboard } from "./scene/nodes/artboard"
import type { SceneNode } from "./scene/node"
import { AnimationError } from "./error/animationerror"

/**
 * Configuration options for creating an animation player
 */
export interface PlayerConfig {
    /**
     * The canvas element to render to
     */
    canvas: HTMLCanvasElement

    /**
     * Preferred rendering backend (will fallback automatically if unavailable)
     * @default "webgl"
     */
    backend?: RendererBackend

    /**
     * Whether to start playing immediately after loading
     * @default false
     */
    autoplay?: boolean

    /**
     * Whether to loop the animation
     * @default false
     */
    loop?: boolean

    /**
     * Playback speed multiplier
     * @default 1.0
     */
    speed?: number

    /**
     * Asset manager instance (optional, will create one if not provided)
     */
    assetManager?: AssetManager
}

/**
 * Options for loading animations
 */
export interface LoadOptions {
    /**
     * Whether to preload all assets before resolving
     * @default true
     */
    preloadAssets?: boolean

    /**
     * Timeout in milliseconds for asset loading
     * @default 30000 (30 seconds)
     */
    assetTimeout?: number
}

/**
 * Simple animation player that wraps AnimationRuntime with convenient defaults
 * This is the recommended way to play animations in most applications
 *
 * @example
 * ```typescript
 * // Create a player
 * const player = await samcan.createPlayer({
 *   canvas: document.getElementById('canvas'),
 *   autoplay: true,
 *   loop: true
 * })
 *
 * // Load and play an animation
 * await player.load('animation.samcan')
 *
 * // Control playback
 * player.pause()
 * player.play()
 * player.stop()
 * ```
 */
export class AnimationPlayer {
    private _runtime: AnimationRuntime
    private _renderer: Renderer
    private _assetManager: AssetManager
    private _serializer: Serializer
    private _config: Required<
        Omit<PlayerConfig, "canvas" | "backend" | "assetManager">
    >

    constructor(
        runtime: AnimationRuntime,
        renderer: Renderer,
        assetManager: AssetManager,
        config: PlayerConfig,
    ) {
        this._runtime = runtime
        this._renderer = renderer
        this._assetManager = assetManager
        this._serializer = new Serializer()
        this._config = {
            autoplay: config.autoplay ?? false,
            loop: config.loop ?? false,
            speed: config.speed ?? 1.0,
        }

        // Apply initial configuration
        this._runtime.setSpeed(this._config.speed)
        this._runtime.setLoop(this._config.loop ? "loop" : "none")
    }

    /**
     * Get the underlying AnimationRuntime instance for advanced usage
     */
    get runtime(): AnimationRuntime {
        return this._runtime
    }

    /**
     * Get the renderer instance
     */
    get renderer(): Renderer {
        return this._renderer
    }

    /**
     * Get the asset manager instance
     */
    get assetManager(): AssetManager {
        return this._assetManager
    }

    /**
     * Load an animation from a URL or SamcanFile object
     *
     * @param source - URL string or SamcanFile object
     * @param options - Loading options
     */
    async load(
        source: string | SamcanFile,
        options?: LoadOptions,
    ): Promise<void> {
        const opts: Required<LoadOptions> = {
            preloadAssets: options?.preloadAssets ?? true,
            assetTimeout: options?.assetTimeout ?? 30000,
        }

        let file: SamcanFile

        // Load file from URL or use provided object
        if (typeof source === "string") {
            file = await this._loadFromUrl(source)
        } else {
            file = source
        }

        // Validate file
        if (!file.artboards || file.artboards.length === 0) {
            throw AnimationError.invalidData(
                "No artboards found in animation file",
            )
        }

        // Preload assets if requested
        if (opts.preloadAssets && file.assets && file.assets.length > 0) {
            await this._preloadAssets(file.assets, opts.assetTimeout)
        }

        // Deserialize the first artboard and its timeline
        const artboardData = file.artboards[0]
        if (!artboardData) {
            throw AnimationError.invalidData("Invalid artboard data")
        }

        const artboard = this._serializer.deserializeArtboard(artboardData)

        // Build node map for timeline deserialization
        const nodeMap = new Map<string, SceneNode>()
        _buildNodeMapForDeserialization(artboard, nodeMap)

        const timeline = this._serializer.deserializeTimeline(
            artboardData.timeline,
            nodeMap,
        )

        // Load into runtime
        const animationData: AnimationData = {
            artboard,
            timeline,
        }

        await this._runtime.load(animationData)

        // Autoplay if configured
        if (this._config.autoplay) {
            this._runtime.play()
        }
    }

    /**
     * Load animation from a URL
     */
    private async _loadFromUrl(url: string): Promise<SamcanFile> {
        try {
            const response = await fetch(url)

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`,
                )
            }

            const contentType = response.headers.get("content-type")

            // Check if compressed (gzip)
            if (contentType?.includes("gzip") || url.endsWith(".gz")) {
                const arrayBuffer = await response.arrayBuffer()
                const compressed = new Uint8Array(arrayBuffer)
                return await this._serializer.fromCompressedJSON(compressed)
            }

            // Otherwise treat as JSON
            const json = await response.text()
            return this._serializer.fromJSON(json)
        } catch (error) {
            throw AnimationError.invalidData(
                `Failed to load animation from ${url}: ${error instanceof Error ? error.message : String(error)}`,
            )
        }
    }

    /**
     * Preload assets with timeout
     */
    private async _preloadAssets(
        assets: SamcanFile["assets"],
        timeout: number,
    ): Promise<void> {
        const preloadPromise = this._assetManager.preload(
            assets.map((asset) => ({
                url: asset.url,
                type: asset.type,
                family: asset.type === "font" ? asset.name : undefined,
            })),
        )

        // Add timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Asset loading timed out after ${timeout}ms`))
            }, timeout)
        })

        await Promise.race([preloadPromise, timeoutPromise])
    }

    /**
     * Start or resume playback
     */
    play(): void {
        this._runtime.play()
    }

    /**
     * Pause playback
     */
    pause(): void {
        this._runtime.pause()
    }

    /**
     * Stop playback and reset to beginning
     */
    stop(): void {
        this._runtime.stop()
    }

    /**
     * Seek to a specific time
     * @param time - Time in seconds
     */
    seek(time: number): void {
        this._runtime.seek(time)
    }

    /**
     * Set playback speed
     * @param speed - Speed multiplier (1.0 = normal)
     */
    setSpeed(speed: number): void {
        this._config.speed = speed
        this._runtime.setSpeed(speed)
    }

    /**
     * Set loop mode
     * @param loop - Whether to loop the animation
     */
    setLoop(loop: boolean): void {
        this._config.loop = loop
        this._runtime.setLoop(loop ? "loop" : "none")
    }

    /**
     * Get current playback time in seconds
     */
    get currentTime(): number {
        return this._runtime.currentTime
    }

    /**
     * Get animation duration in seconds
     */
    get duration(): number {
        return this._runtime.duration
    }

    /**
     * Check if animation is currently playing
     */
    get isPlaying(): boolean {
        return this._runtime.isPlaying
    }

    /**
     * Get the loaded artboard
     */
    get artboard(): Artboard | null {
        return this._runtime.artboard
    }

    /**
     * Register an event listener
     * @param event - Event name
     * @param callback - Callback function
     * @returns Unsubscribe function
     */
    on(
        event: "play" | "pause" | "stop" | "complete" | "loop",
        callback: () => void,
    ): () => void {
        return this._runtime.on(event, callback)
    }

    /**
     * Resize the canvas and renderer
     * @param width - New width in pixels
     * @param height - New height in pixels
     */
    resize(width: number, height: number): void {
        this._renderer.resize(width, height)
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        this._runtime.unload()
        // Note: We don't destroy the renderer or asset manager as they might be shared
    }
}

/**
 * Create an animation player with the specified configuration
 *
 * @param config - Player configuration
 * @returns Promise resolving to an AnimationPlayer instance
 *
 * @example
 * ```typescript
 * const player = await samcan.createPlayer({
 *   canvas: document.getElementById('canvas'),
 *   autoplay: true,
 *   loop: true,
 *   speed: 1.5
 * })
 *
 * await player.load('animation.samcan')
 * ```
 */
export async function createPlayer(
    config: PlayerConfig,
): Promise<AnimationPlayer> {
    // Create renderer with fallback
    const renderer = await RendererFactory.create(
        config.canvas,
        config.backend ?? "webgl",
    )

    // Create or use provided asset manager
    const assetManager = config.assetManager ?? new AssetManager()

    // Create runtime
    const runtime = new AnimationRuntime(renderer)

    // Create and return player
    return new AnimationPlayer(runtime, renderer, assetManager, config)
}

/**
 * Load and play an animation with minimal configuration
 * This is the simplest way to play an animation
 *
 * @param canvas - Canvas element to render to
 * @param url - URL of the animation file
 * @param options - Optional configuration
 * @returns Promise resolving to an AnimationPlayer instance
 *
 * @example
 * ```typescript
 * const player = await samcan.play(
 *   document.getElementById('canvas'),
 *   'animation.samcan',
 *   { loop: true }
 * )
 * ```
 */
export async function play(
    canvas: HTMLCanvasElement,
    url: string,
    options?: {
        loop?: boolean
        speed?: number
        backend?: RendererBackend
    },
): Promise<AnimationPlayer> {
    const player = await createPlayer({
        canvas,
        autoplay: true,
        loop: options?.loop ?? false,
        speed: options?.speed ?? 1.0,
        backend: options?.backend,
    })

    await player.load(url)

    return player
}

/**
 * Load an animation file from a URL
 *
 * @param url - URL of the animation file
 * @returns Promise resolving to a SamcanFile object
 *
 * @example
 * ```typescript
 * const animation = await samcan.loadAnimation('animation.samcan')
 * console.log(animation.metadata.name)
 * console.log(`Duration: ${animation.artboards[0].timeline.duration}s`)
 * ```
 */
export async function loadAnimation(url: string): Promise<SamcanFile> {
    const serializer = new Serializer()

    try {
        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const contentType = response.headers.get("content-type")

        // Check if compressed
        if (contentType?.includes("gzip") || url.endsWith(".gz")) {
            const arrayBuffer = await response.arrayBuffer()
            const compressed = new Uint8Array(arrayBuffer)
            return await serializer.fromCompressedJSON(compressed)
        }

        // Otherwise treat as JSON
        const json = await response.text()
        return serializer.fromJSON(json)
    } catch (error) {
        throw AnimationError.invalidData(
            `Failed to load animation from ${url}: ${error instanceof Error ? error.message : String(error)}`,
        )
    }
}

/**
 * Helper method to build node map for timeline deserialization
 * Maps node IDs (strings) to SceneNode instances
 */
function _buildNodeMapForDeserialization(
    node: SceneNode,
    nodeMap: Map<string, SceneNode>,
    idCounter = { value: 0 },
): void {
    const id = `node_${idCounter.value++}`
    nodeMap.set(id, node)

    for (const child of node.children) {
        _buildNodeMapForDeserialization(child, nodeMap, idCounter)
    }
}

/**
 * Get information about available rendering backends
 *
 * @returns Object with backend availability information
 *
 * @example
 * ```typescript
 * const info = samcan.getBackendInfo()
 * console.log('Available backends:', info.available)
 * console.log('WebGL supported:', info.webgl)
 * ```
 */
export function getBackendInfo(): {
    available: RendererBackend[]
    canvas2d: boolean
    webgl: boolean
    webgpu: boolean
} {
    const available = RendererFactory.getAvailableBackends()

    return {
        available,
        canvas2d: available.includes("canvas2d"),
        webgl: available.includes("webgl"),
        webgpu: available.includes("webgpu"),
    }
}
