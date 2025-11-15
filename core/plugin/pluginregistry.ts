import type { AnimationRuntime } from "../animation/animationruntime"
import { getLogger } from "../animation/logger"
import { isPlugin, type Plugin } from "./plugin"

/**
 * Error thrown when plugin registration or validation fails
 */
export class PluginRegistrationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "PluginRegistrationError"
    }
}

/**
 * Registry for managing plugin lifecycle and collection.
 * Handles plugin registration, validation, and unregistration.
 */
export class PluginRegistry {
    private readonly _plugins: Map<string, Plugin> = new Map()
    private readonly _runtime: AnimationRuntime

    /**
     * Create a new PluginRegistry
     * @param runtime - The AnimationRuntime instance plugins will be attached to
     */
    constructor(runtime: AnimationRuntime) {
        this._runtime = runtime
    }

    /**
     * Register a plugin with the registry.
     * Validates the plugin interface and initializes it.
     *
     * @param plugin - The plugin to register
     * @throws PluginRegistrationError if validation fails or plugin name already exists
     * @throws Error if plugin initialization fails
     */
    register(plugin: unknown): void {
        // Validate plugin interface
        if (!isPlugin(plugin)) {
            throw new PluginRegistrationError(
                "Invalid plugin: must implement Plugin interface with metadata and initialize method",
            )
        }

        const pluginName = plugin.metadata.name

        // Check for duplicate plugin names
        if (this._plugins.has(pluginName)) {
            throw new PluginRegistrationError(
                `Plugin "${pluginName}" is already registered`,
            )
        }

        // Initialize the plugin
        try {
            plugin.initialize(this._runtime)
        } catch (error) {
            throw new PluginRegistrationError(
                `Failed to initialize plugin "${pluginName}": ${error instanceof Error ? error.message : String(error)}`,
            )
        }

        // Add to registry
        this._plugins.set(pluginName, plugin)
    }

    /**
     * Unregister a plugin by name.
     * Calls cleanup if the plugin implements it.
     *
     * @param pluginName - Name of the plugin to unregister
     * @returns true if plugin was found and unregistered, false if not found
     */
    unregister(pluginName: string): boolean {
        const plugin = this._plugins.get(pluginName)

        if (!plugin) {
            return false
        }

        // Call cleanup if implemented
        if (plugin.cleanup) {
            try {
                plugin.cleanup()
            } catch (error) {
                getLogger().error(
                    `Error during cleanup of plugin "${pluginName}":`,
                    error,
                )
            }
        }

        this._plugins.delete(pluginName)
        return true
    }

    /**
     * Get a plugin by name
     * @param pluginName - Name of the plugin to retrieve
     * @returns The plugin if found, undefined otherwise
     */
    get(pluginName: string): Plugin | undefined {
        return this._plugins.get(pluginName)
    }

    /**
     * Check if a plugin is registered
     * @param pluginName - Name of the plugin to check
     * @returns true if plugin is registered
     */
    has(pluginName: string): boolean {
        return this._plugins.has(pluginName)
    }

    /**
     * Get all registered plugins
     * @returns Readonly array of all registered plugins
     */
    get plugins(): readonly Plugin[] {
        return Array.from(this._plugins.values())
    }

    /**
     * Get the number of registered plugins
     */
    get size(): number {
        return this._plugins.size
    }

    /**
     * Unregister all plugins
     */
    clear(): void {
        // Call cleanup on all plugins
        for (const plugin of this._plugins.values()) {
            if (plugin.cleanup) {
                try {
                    plugin.cleanup()
                } catch (error) {
                    getLogger().error(
                        `Error during cleanup of plugin "${plugin.metadata.name}":`,
                        error,
                    )
                }
            }
        }

        this._plugins.clear()
    }

    /**
     * Update all plugins that implement the update method.
     * Called on each animation frame.
     *
     * @param deltaTime - Time elapsed since last frame in milliseconds
     */
    update(deltaTime: number): void {
        for (const plugin of this._plugins.values()) {
            if (plugin.update) {
                try {
                    plugin.update(deltaTime)
                } catch (error) {
                    getLogger().error(
                        `Error during update of plugin "${plugin.metadata.name}":`,
                        error,
                    )
                }
            }
        }
    }
}
