import type { AnimationRuntime } from "../animation/animationruntime"

/**
 * Plugin metadata containing identification and version information
 */
export interface PluginMetadata {
    /** Unique name identifier for the plugin */
    readonly name: string
    /** Semantic version string (e.g., "1.0.0") */
    readonly version: string
    /** Optional description of plugin functionality */
    readonly description?: string
    /** Optional author information */
    readonly author?: string
}

/**
 * Base Plugin interface defining the lifecycle contract for samcan plugins.
 * Plugins extend the animation runtime with custom behaviors and effects.
 *
 * Lifecycle:
 * 1. Plugin is registered with PluginRegistry
 * 2. initialize() is called with AnimationRuntime reference
 * 3. update() is called on each frame (if implemented)
 * 4. cleanup() is called when plugin is unregistered (if implemented)
 */
export interface Plugin {
    /** Plugin identification and version metadata */
    readonly metadata: PluginMetadata

    /**
     * Initialize the plugin with access to the animation runtime.
     * Called once when the plugin is registered.
     *
     * @param runtime - The AnimationRuntime instance this plugin is attached to
     * @throws Error if initialization fails
     */
    initialize(runtime: AnimationRuntime): void

    /**
     * Optional update hook called on each animation frame.
     * Use this for per-frame logic, monitoring, or dynamic behavior.
     *
     * @param deltaTime - Time elapsed since last frame in milliseconds
     */
    update?(deltaTime: number): void

    /**
     * Optional cleanup hook called when the plugin is unregistered.
     * Use this to release resources, remove event listeners, etc.
     */
    cleanup?(): void
}

/**
 * Type guard to validate if an object implements the Plugin interface
 */
export function isPlugin(obj: unknown): obj is Plugin {
    if (typeof obj !== "object" || obj === null) {
        return false
    }

    const plugin = obj as Partial<Plugin>

    // Check required metadata
    if (
        typeof plugin.metadata !== "object" ||
        plugin.metadata === null ||
        typeof plugin.metadata.name !== "string" ||
        typeof plugin.metadata.version !== "string"
    ) {
        return false
    }

    // Check required initialize method
    if (typeof plugin.initialize !== "function") {
        return false
    }

    // Check optional methods if present
    if (plugin.update !== undefined && typeof plugin.update !== "function") {
        return false
    }

    if (plugin.cleanup !== undefined && typeof plugin.cleanup !== "function") {
        return false
    }

    return true
}
