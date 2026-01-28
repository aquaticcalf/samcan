import type { SceneNode } from "../../scene/node"
import type { Artboard } from "../../scene/nodes/artboard"
import type { AssetData, AssetType } from "../types"

/**
 * Handles asset bundling and conversion
 */
export class AssetSerializers {
    /**
     * Collect asset data from artboards
     */
    collectAssets(
        artboards: Artboard[],
        assetManager: {
            loadedAssets: ReadonlyMap<
                string,
                { id: string; type: string; url: string }
            >
            collectSceneAssets: (node: SceneNode) => string[]
        },
    ): AssetData[] {
        const assetIds = new Set<string>()

        // Collect all asset IDs from all artboards
        for (const artboard of artboards) {
            const artboardAssets = assetManager.collectSceneAssets(artboard)
            for (const assetId of artboardAssets) {
                assetIds.add(assetId)
            }
        }

        // Convert asset IDs to AssetData
        const assets: AssetData[] = []
        for (const assetId of assetIds) {
            const asset = assetManager.loadedAssets.get(assetId)
            if (asset) {
                assets.push({
                    id: asset.id,
                    type: asset.type as AssetType,
                    name: this.getAssetNameFromUrl(asset.url),
                    url: asset.url,
                })
            }
        }

        return assets
    }

    /**
     * Extract a name from an asset URL
     */
    getAssetNameFromUrl(url: string): string {
        try {
            const urlObj = new URL(url)
            const pathname = urlObj.pathname
            const parts = pathname.split("/")
            const filename = parts[parts.length - 1] ?? "asset"
            return filename
        } catch {
            // If URL parsing fails, try to extract filename from path
            const parts = url.split("/")
            return parts[parts.length - 1] ?? "asset"
        }
    }

    /**
     * Create an asset bundle for export
     * Returns a map of asset IDs to their data (for embedding or separate export)
     */
    async createAssetBundle(
        assetIds: string[],
        assetManager: {
            loadedAssets: ReadonlyMap<
                string,
                {
                    id: string
                    type: string
                    url: string
                    data?: HTMLImageElement | ImageBitmap | FontFace
                }
            >
        },
    ): Promise<Map<string, { type: string; data: Blob | string }>> {
        const bundle = new Map<string, { type: string; data: Blob | string }>()

        for (const assetId of assetIds) {
            const asset = assetManager.loadedAssets.get(assetId)
            if (!asset) {
                continue
            }

            // For images, convert to blob
            if (asset.type === "image" && asset.data) {
                if (asset.data instanceof HTMLImageElement) {
                    const blob = await this.imageToBlob(asset.data)
                    if (blob) {
                        bundle.set(assetId, { type: "image", data: blob })
                    }
                } else if (asset.data instanceof ImageBitmap) {
                    const blob = await this.imageBitmapToBlob(asset.data)
                    if (blob) {
                        bundle.set(assetId, { type: "image", data: blob })
                    }
                }
            }
            // For fonts, store the URL (fonts are typically referenced, not embedded)
            else if (asset.type === "font") {
                bundle.set(assetId, { type: "font", data: asset.url })
            }
        }

        return bundle
    }

    /**
     * Convert HTMLImageElement to Blob
     */
    private async imageToBlob(image: HTMLImageElement): Promise<Blob | null> {
        try {
            const canvas = document.createElement("canvas")
            canvas.width = image.naturalWidth
            canvas.height = image.naturalHeight

            const ctx = canvas.getContext("2d")
            if (!ctx) {
                return null
            }

            ctx.drawImage(image, 0, 0)

            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    resolve(blob)
                }, "image/png")
            })
        } catch {
            return null
        }
    }

    /**
     * Convert ImageBitmap to Blob
     */
    private async imageBitmapToBlob(
        imageBitmap: ImageBitmap,
    ): Promise<Blob | null> {
        try {
            const canvas = document.createElement("canvas")
            canvas.width = imageBitmap.width
            canvas.height = imageBitmap.height

            const ctx = canvas.getContext("2d")
            if (!ctx) {
                return null
            }

            ctx.drawImage(imageBitmap, 0, 0)

            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    resolve(blob)
                }, "image/png")
            })
        } catch {
            return null
        }
    }
}
