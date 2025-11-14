import type { AssetType } from "../serialization"
import type { Asset, RuntimeImageAsset } from "./types"

/**
 * AssetManager handles loading, caching, and lifecycle management of assets
 * such as images, fonts, and audio files.
 */
export class AssetManager {
    private _assets: Map<string, Asset> = new Map()
    private _loadingPromises: Map<string, Promise<Asset>> = new Map()
    private _placeholderImage: RuntimeImageAsset | null = null

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
     * Load an asset from a URL
     * @param url - The URL of the asset to load
     * @param type - The type of asset (image, font, audio)
     * @returns Promise that resolves to the loaded asset
     */
    async load(url: string, type: AssetType): Promise<Asset> {
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
        const promise = this._loadAsset(id, url, type)
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
        }

        this._assets.delete(id)
    }

    /**
     * Preload multiple assets in parallel
     * @param urls - Array of URLs to preload with their types
     * @returns Promise that resolves when all assets are loaded
     */
    async preload(
        urls: Array<{ url: string; type: AssetType }>,
    ): Promise<void> {
        const promises = urls.map(({ url, type }) => this.load(url, type))
        await Promise.all(promises)
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
    ): Promise<Asset> {
        switch (type) {
            case "image":
                return this._loadImage(id, url)
            case "font":
                throw new Error("Font loading not yet implemented")
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
}
