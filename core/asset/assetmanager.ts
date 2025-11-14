import type { AssetType } from "../serialization"
import type { Asset, FontAsset, RuntimeImageAsset } from "./types"
import type { SceneNode } from "../scene/node"
import { ImageNode } from "../scene/nodes/imagenode"

/**
 * AssetManager handles loading, caching, and lifecycle management of assets
 * such as images, fonts, and audio files.
 */
export class AssetManager {
    private _assets: Map<string, Asset> = new Map()
    private _loadingPromises: Map<string, Promise<Asset>> = new Map()
    private _placeholderImage: RuntimeImageAsset | null = null
    private _assetDependencies: Map<string, Set<string>> = new Map() // artboardId -> Set of assetIds

    /**
     * Get readonly access to loaded assets
     */
    get loadedAssets(): ReadonlyMap<string, Asset> {
        return this._assets
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
     * Load an image with optional fallback URL
     * @param url - The URL of the image to load
     * @param options - Optional configuration including fallback URL
     * @returns Promise that resolves to the loaded image asset
     */
    async loadImage(
        url: string,
        options?: { fallbackUrl?: string },
    ): Promise<RuntimeImageAsset> {
        try {
            const asset = await this.load(url, "image")
            return asset as RuntimeImageAsset
        } catch (error) {
            // Try fallback URL if provided
            if (options?.fallbackUrl) {
                try {
                    const fallbackAsset = await this.load(
                        options.fallbackUrl,
                        "image",
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
     * Load a font with optional fallback URL
     * @param url - The URL of the font file to load
     * @param family - The font family name to use
     * @param options - Optional configuration including fallback URL and font descriptors
     * @returns Promise that resolves to the loaded font asset
     */
    async loadFont(
        url: string,
        family: string,
        options?: {
            fallbackUrl?: string
            weight?: string
            style?: string
            display?: FontDisplay
        },
    ): Promise<FontAsset> {
        try {
            const asset = await this.load(url, "font", {
                family,
                weight: options?.weight,
                style: options?.style,
                display: options?.display,
            })
            return asset as FontAsset
        } catch (error) {
            // Try fallback URL if provided
            if (options?.fallbackUrl) {
                try {
                    const fallbackAsset = await this.load(
                        options.fallbackUrl,
                        "font",
                        {
                            family,
                            weight: options?.weight,
                            style: options?.style,
                            display: options?.display,
                        },
                    )
                    return fallbackAsset as FontAsset
                } catch (fallbackError) {
                    throw new Error(
                        `Failed to load font from ${url} and fallback ${options.fallbackUrl}`,
                    )
                }
            }
            throw error
        }
    }

    /**
     * Load an asset from a URL
     * @param url - The URL of the asset to load
     * @param type - The type of asset (image, font, audio)
     * @param options - Optional configuration for asset loading
     * @returns Promise that resolves to the loaded asset
     */
    async load(
        url: string,
        type: AssetType,
        options?: {
            family?: string
            weight?: string
            style?: string
            display?: FontDisplay
        },
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

        // Start new load operation
        const promise = this._loadAsset(id, url, type, options)
        this._loadingPromises.set(id, promise)

        try {
            const asset = await promise
            this._assets.set(id, asset)
            return asset
        } finally {
            this._loadingPromises.delete(id)
        }
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
        options?: {
            family?: string
            weight?: string
            style?: string
            display?: FontDisplay
        },
    ): Promise<Asset> {
        switch (type) {
            case "image":
                return this._loadImage(id, url)
            case "font":
                if (!options?.family) {
                    throw new Error("Font family name is required")
                }
                return this._loadFont(id, url, options.family, options)
            case "audio":
                throw new Error("Audio loading not yet implemented")
            default:
                throw new Error(`Unknown asset type: ${type}`)
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

            img.onerror = () => {
                reject(new Error(`Failed to load image from URL: ${url}`))
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
        options?: {
            weight?: string
            style?: string
            display?: FontDisplay
        },
    ): Promise<FontAsset> {
        // Check if FontFace API is available
        if (typeof FontFace === "undefined") {
            throw new Error("FontFace API is not available in this environment")
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
            throw new Error(
                `Failed to load font from URL: ${url}. ${error instanceof Error ? error.message : String(error)}`,
            )
        }
    }
}
