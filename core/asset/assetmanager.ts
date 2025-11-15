import type { AssetType } from "../serialization"
import type { Asset, FontAsset, RuntimeImageAsset } from "./types"
import type { SceneNode } from "../scene/node"
import { ImageNode } from "../scene/nodes/imagenode"
import { AssetError } from "../error/asseterror"

/**
 * Event types emitted by AssetManager
 */
export type AssetEventType =
    | "load-start"
    | "load-success"
    | "load-error"
    | "load-retry"
    | "unload"

/**
 * Event data for asset events
 */
export interface AssetEvent {
    type: AssetEventType
    assetId: string
    assetUrl: string
    assetType: AssetType
    error?: AssetError
    retryAttempt?: number
    timestamp: Date
}

/**
 * Callback function for asset events
 */
export type AssetEventCallback = (event: AssetEvent) => void

/**
 * Options for asset loading
 */
export interface AssetLoadOptions {
    fallbackUrl?: string
    maxRetries?: number
    retryDelay?: number
    family?: string
    weight?: string
    style?: string
    display?: FontDisplay
}

/**
 * AssetManager handles loading, caching, and lifecycle management of assets
 * such as images, fonts, and audio files.
 * Requirement 10.5: Provides error handling, placeholder assets, and retry logic
 */
export class AssetManager {
    private _assets: Map<string, Asset> = new Map()
    private _loadingPromises: Map<string, Promise<Asset>> = new Map()
    private _placeholderImage: RuntimeImageAsset | null = null
    private _assetDependencies: Map<string, Set<string>> = new Map() // artboardId -> Set of assetIds
    private _eventListeners: Map<AssetEventType, Set<AssetEventCallback>> =
        new Map()

    /**
     * Get readonly access to loaded assets
     */
    get loadedAssets(): ReadonlyMap<string, Asset> {
        return this._assets
    }

    /**
     * Register an event listener for asset events
     * @param eventType - The type of event to listen for
     * @param callback - The callback function to invoke when the event occurs
     */
    on(eventType: AssetEventType, callback: AssetEventCallback): void {
        let listeners = this._eventListeners.get(eventType)
        if (!listeners) {
            listeners = new Set()
            this._eventListeners.set(eventType, listeners)
        }
        listeners.add(callback)
    }

    /**
     * Unregister an event listener
     * @param eventType - The type of event to stop listening for
     * @param callback - The callback function to remove
     */
    off(eventType: AssetEventType, callback: AssetEventCallback): void {
        const listeners = this._eventListeners.get(eventType)
        if (listeners) {
            listeners.delete(callback)
            if (listeners.size === 0) {
                this._eventListeners.delete(eventType)
            }
        }
    }

    /**
     * Emit an asset event to all registered listeners
     * @param event - The event to emit
     */
    private _emitEvent(event: AssetEvent): void {
        const listeners = this._eventListeners.get(event.type)
        if (listeners) {
            for (const callback of listeners) {
                try {
                    callback(event)
                } catch (error) {
                    // Prevent listener errors from breaking the asset manager
                    console.error(
                        `Error in asset event listener for ${event.type}:`,
                        error,
                    )
                }
            }
        }
    }

    /**
     * Get a 1x1 placeholder image for fallback scenarios
     */
    getPlaceholderImage(): RuntimeImageAsset {
        if (!this._placeholderImage) {
            // Create a 1x1 transparent PNG data URL
            const dataUrl =
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NgYGD4DwABBAEAwgMZAAAAAElFTkSuQmCC"

            const img = new Image()
            img.src = dataUrl

            this._placeholderImage = {
                id: "__placeholder__",
                type: "image",
                url: dataUrl,
                loaded: true,
                width: 1,
                height: 1,
                data: img,
            }
        }
        return this._placeholderImage
    }

    /**
     * Load an image with optional fallback URL and retry logic
     * @param url - The URL of the image to load
     * @param options - Optional configuration including fallback URL and retry settings
     * @returns Promise that resolves to the loaded image asset
     */
    async loadImage(
        url: string,
        options?: AssetLoadOptions,
    ): Promise<RuntimeImageAsset> {
        try {
            const asset = await this.load(url, "image", options)
            return asset as RuntimeImageAsset
        } catch (error) {
            // Try fallback URL if provided
            if (options?.fallbackUrl) {
                try {
                    const fallbackAsset = await this.load(
                        options.fallbackUrl,
                        "image",
                        options,
                    )
                    return fallbackAsset as RuntimeImageAsset
                } catch (fallbackError) {
                    // Return placeholder if fallback also fails
                    return this.getPlaceholderImage()
                }
            }
            // Return placeholder on failure
            return this.getPlaceholderImage()
        }
    }

    /**
     * Load a font with optional fallback URL and retry logic
     * @param url - The URL of the font file to load
     * @param family - The font family name to use
     * @param options - Optional configuration including fallback URL, retry settings, and font descriptors
     * @returns Promise that resolves to the loaded font asset
     */
    async loadFont(
        url: string,
        family: string,
        options?: AssetLoadOptions,
    ): Promise<FontAsset> {
        const loadOptions: AssetLoadOptions = {
            ...options,
            family,
        }

        try {
            const asset = await this.load(url, "font", loadOptions)
            return asset as FontAsset
        } catch (error) {
            // Try fallback URL if provided
            if (options?.fallbackUrl) {
                try {
                    const fallbackAsset = await this.load(
                        options.fallbackUrl,
                        "font",
                        loadOptions,
                    )
                    return fallbackAsset as FontAsset
                } catch (fallbackError) {
                    const assetError =
                        fallbackError instanceof AssetError
                            ? fallbackError
                            : AssetError.fontLoadFailed(
                                  family,
                                  "Failed to load from primary and fallback URLs",
                                  fallbackError instanceof Error
                                      ? fallbackError
                                      : undefined,
                              )
                    throw assetError
                }
            }

            // Re-throw as AssetError if not already
            if (error instanceof AssetError) {
                throw error
            }
            throw AssetError.fontLoadFailed(
                family,
                error instanceof Error ? error.message : String(error),
                error instanceof Error ? error : undefined,
            )
        }
    }

    /**
     * Load an asset from a URL with retry logic
     * @param url - The URL of the asset to load
     * @param type - The type of asset (image, font, audio)
     * @param options - Optional configuration for asset loading including retry settings
     * @returns Promise that resolves to the loaded asset
     */
    async load(
        url: string,
        type: AssetType,
        options?: AssetLoadOptions,
    ): Promise<Asset> {
        // Generate ID from URL (use URL as ID for simplicity)
        const id = this._generateId(url)

        // Return cached asset if already loaded
        const cached = this._assets.get(id)
        if (cached?.loaded) {
            return cached
        }

        // Return existing loading promise if already in progress
        const loadingPromise = this._loadingPromises.get(id)
        if (loadingPromise) {
            return loadingPromise
        }

        // Emit load-start event
        this._emitEvent({
            type: "load-start",
            assetId: id,
            assetUrl: url,
            assetType: type,
            timestamp: new Date(),
        })

        // Start new load operation with retry logic
        const maxRetries = options?.maxRetries ?? 3
        const retryDelay = options?.retryDelay ?? 1000

        const promise = this._loadAssetWithRetry(
            id,
            url,
            type,
            options,
            maxRetries,
            retryDelay,
        )
        this._loadingPromises.set(id, promise)

        try {
            const asset = await promise
            this._assets.set(id, asset)

            // Emit load-success event
            this._emitEvent({
                type: "load-success",
                assetId: id,
                assetUrl: url,
                assetType: type,
                timestamp: new Date(),
            })

            return asset
        } catch (error) {
            // Emit load-error event
            const assetError =
                error instanceof AssetError
                    ? error
                    : AssetError.loadFailed(
                          url,
                          type,
                          error instanceof Error
                              ? error.message
                              : String(error),
                          error instanceof Error ? error : undefined,
                      )

            this._emitEvent({
                type: "load-error",
                assetId: id,
                assetUrl: url,
                assetType: type,
                error: assetError,
                timestamp: new Date(),
            })

            throw assetError
        } finally {
            this._loadingPromises.delete(id)
        }
    }

    /**
     * Load an asset with retry logic
     * @param id - The asset ID
     * @param url - The URL of the asset to load
     * @param type - The type of asset
     * @param options - Optional configuration for asset loading
     * @param maxRetries - Maximum number of retry attempts
     * @param retryDelay - Delay in milliseconds between retries
     * @returns Promise that resolves to the loaded asset
     */
    private async _loadAssetWithRetry(
        id: string,
        url: string,
        type: AssetType,
        options: AssetLoadOptions | undefined,
        maxRetries: number,
        retryDelay: number,
    ): Promise<Asset> {
        let lastError: Error | null = null

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Attempt to load the asset
                return await this._loadAsset(id, url, type, options)
            } catch (error) {
                lastError =
                    error instanceof Error ? error : new Error(String(error))

                // If this is not the last attempt, emit retry event and wait
                if (attempt < maxRetries) {
                    this._emitEvent({
                        type: "load-retry",
                        assetId: id,
                        assetUrl: url,
                        assetType: type,
                        retryAttempt: attempt + 1,
                        timestamp: new Date(),
                    })

                    // Wait before retrying (exponential backoff)
                    await this._delay(retryDelay * Math.pow(2, attempt))
                }
            }
        }

        // All retries failed, throw the last error
        throw lastError
    }

    /**
     * Delay helper for retry logic
     * @param ms - Milliseconds to delay
     */
    private _delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    /**
     * Get a loaded asset by ID
     * @param id - The asset ID
     * @returns The asset if loaded, null otherwise
     */
    get(id: string): Asset | null {
        return this._assets.get(id) ?? null
    }

    /**
     * Unload an asset and free its resources
     * @param id - The asset ID to unload
     */
    unload(id: string): void {
        const asset = this._assets.get(id)
        if (!asset) {
            return
        }

        // Clean up asset-specific resources
        if (asset.type === "image") {
            const imageAsset = asset as RuntimeImageAsset
            // Revoke object URLs if using ImageBitmap
            if (
                typeof ImageBitmap !== "undefined" &&
                imageAsset.data instanceof ImageBitmap
            ) {
                imageAsset.data.close()
            }
        } else if (asset.type === "font") {
            const fontAsset = asset as FontAsset
            // Remove font from document fonts
            if (typeof document !== "undefined" && document.fonts) {
                document.fonts.delete(fontAsset.fontFace)
            }
        }

        this._assets.delete(id)

        // Emit unload event
        this._emitEvent({
            type: "unload",
            assetId: id,
            assetUrl: asset.url,
            assetType: asset.type,
            timestamp: new Date(),
        })
    }

    /**
     * Preload multiple assets in parallel
     * @param urls - Array of URLs to preload with their types
     * @returns Promise that resolves when all assets are loaded
     */
    async preload(
        urls: Array<{
            url: string
            type: AssetType
            family?: string
            weight?: string
            style?: string
            display?: FontDisplay
        }>,
    ): Promise<void> {
        const promises = urls.map(({ url, type, ...options }) =>
            this.load(url, type, options),
        )
        await Promise.all(promises)
    }

    /**
     * Track that an artboard uses a specific asset
     * @param artboardId - The ID of the artboard
     * @param assetId - The ID of the asset being used
     */
    trackAssetUsage(artboardId: string, assetId: string): void {
        let dependencies = this._assetDependencies.get(artboardId)
        if (!dependencies) {
            dependencies = new Set()
            this._assetDependencies.set(artboardId, dependencies)
        }
        dependencies.add(assetId)
    }

    /**
     * Remove asset usage tracking for an artboard
     * @param artboardId - The ID of the artboard
     * @param assetId - The ID of the asset to stop tracking (optional, removes all if not specified)
     */
    untrackAssetUsage(artboardId: string, assetId?: string): void {
        if (assetId) {
            const dependencies = this._assetDependencies.get(artboardId)
            if (dependencies) {
                dependencies.delete(assetId)
                if (dependencies.size === 0) {
                    this._assetDependencies.delete(artboardId)
                }
            }
        } else {
            this._assetDependencies.delete(artboardId)
        }
    }

    /**
     * Get all assets used by a specific artboard
     * @param artboardId - The ID of the artboard
     * @returns Array of asset IDs used by the artboard
     */
    getArtboardAssets(artboardId: string): string[] {
        const dependencies = this._assetDependencies.get(artboardId)
        return dependencies ? Array.from(dependencies) : []
    }

    /**
     * Get all artboards that use a specific asset
     * @param assetId - The ID of the asset
     * @returns Array of artboard IDs that use the asset
     */
    getAssetArtboards(assetId: string): string[] {
        const artboards: string[] = []
        for (const [artboardId, dependencies] of this._assetDependencies) {
            if (dependencies.has(assetId)) {
                artboards.push(artboardId)
            }
        }
        return artboards
    }

    /**
     * Get all asset dependencies as a map
     * @returns ReadonlyMap of artboard IDs to sets of asset IDs
     */
    getAllDependencies(): ReadonlyMap<string, ReadonlySet<string>> {
        return this._assetDependencies
    }

    /**
     * Clear all asset dependency tracking
     */
    clearDependencies(): void {
        this._assetDependencies.clear()
    }

    /**
     * Collect all asset IDs used in a scene graph
     * @param node - The root node to scan (typically an Artboard)
     * @returns Array of unique asset IDs found in the scene graph
     */
    collectSceneAssets(node: SceneNode): string[] {
        const assetIds = new Set<string>()
        this._collectSceneAssetsRecursive(node, assetIds)
        return Array.from(assetIds)
    }

    /**
     * Recursively collect asset IDs from a scene graph
     */
    private _collectSceneAssetsRecursive(
        node: SceneNode,
        assetIds: Set<string>,
    ): void {
        // Check if this node uses an asset
        if (node instanceof ImageNode) {
            const imageData = node.imageData
            // If imageData is a string, it's an asset ID or URL
            if (typeof imageData === "string") {
                const assetId = this._generateId(imageData)
                assetIds.add(assetId)
            }
        }

        // Recursively check children
        for (const child of node.children) {
            this._collectSceneAssetsRecursive(child, assetIds)
        }
    }

    /**
     * Generate a unique ID for an asset based on its URL
     */
    private _generateId(url: string): string {
        // Use URL as ID for now - could be enhanced with hashing
        return url
    }

    /**
     * Internal method to load an asset based on type
     */
    private async _loadAsset(
        id: string,
        url: string,
        type: AssetType,
        options?: AssetLoadOptions,
    ): Promise<Asset> {
        switch (type) {
            case "image":
                return this._loadImage(id, url)
            case "font":
                if (!options?.family) {
                    throw AssetError.loadFailed(
                        url,
                        type,
                        "Font family name is required",
                    )
                }
                return this._loadFont(id, url, options.family, options)
            case "audio":
                throw AssetError.loadFailed(
                    url,
                    type,
                    "Audio loading not yet implemented",
                )
            default:
                throw AssetError.loadFailed(
                    url,
                    type,
                    `Unknown asset type: ${type}`,
                )
        }
    }

    /**
     * Load an image asset
     */
    private async _loadImage(
        id: string,
        url: string,
    ): Promise<RuntimeImageAsset> {
        return new Promise((resolve, reject) => {
            const img = new Image()

            img.onload = () => {
                const asset: RuntimeImageAsset = {
                    id,
                    type: "image",
                    url,
                    loaded: true,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    data: img,
                }
                resolve(asset)
            }

            img.onerror = (event) => {
                const errorMessage =
                    event instanceof ErrorEvent
                        ? event.message
                        : "Failed to load image"
                reject(
                    AssetError.loadFailed(
                        url,
                        "image",
                        errorMessage || "Network error or invalid image format",
                    ),
                )
            }

            // Enable CORS if needed
            img.crossOrigin = "anonymous"
            img.src = url
        })
    }

    /**
     * Load a font asset using the FontFace API
     */
    private async _loadFont(
        id: string,
        url: string,
        family: string,
        options?: AssetLoadOptions,
    ): Promise<FontAsset> {
        // Check if FontFace API is available
        if (typeof FontFace === "undefined") {
            throw AssetError.fontLoadFailed(
                family,
                "FontFace API is not available in this environment",
            )
        }

        // Create FontFace with descriptors
        const fontFace = new FontFace(family, `url(${url})`, {
            weight: options?.weight ?? "normal",
            style: options?.style ?? "normal",
            display: options?.display ?? "auto",
        })

        try {
            // Load the font
            const loadedFontFace = await fontFace.load()

            // Add to document fonts if available
            if (typeof document !== "undefined" && document.fonts) {
                document.fonts.add(loadedFontFace)
            }

            const asset: FontAsset = {
                id,
                type: "font",
                url,
                loaded: true,
                family,
                fontFace: loadedFontFace,
            }

            return asset
        } catch (error) {
            throw AssetError.fontLoadFailed(
                family,
                error instanceof Error ? error.message : String(error),
                error instanceof Error ? error : undefined,
            )
        }
    }
}
