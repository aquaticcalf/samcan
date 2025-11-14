import { describe, expect, it, beforeEach } from "bun:test"
import { AssetManager } from "../core/asset"

describe("AssetManager", () => {
    let assetManager: AssetManager

    beforeEach(() => {
        assetManager = new AssetManager()
    })

    describe("Image Loading", () => {
        it("should provide a placeholder image", () => {
            const placeholder = assetManager.getPlaceholderImage()

            expect(placeholder).toBeDefined()
            expect(placeholder.type).toBe("image")
            expect(placeholder.loaded).toBe(true)
            expect(placeholder.width).toBe(1)
            expect(placeholder.height).toBe(1)
        })

        it("should return the same placeholder instance on multiple calls", () => {
            const placeholder1 = assetManager.getPlaceholderImage()
            const placeholder2 = assetManager.getPlaceholderImage()

            expect(placeholder1).toBe(placeholder2)
        })

        it("should load a valid image using data URL", async () => {
            // Create a simple 2x2 red pixel PNG as data URL
            const dataUrl =
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2P8z8DwHwYYGBj+AwABBgEAW3pB4QAAAABJRU5ErkJggg=="

            const asset = await assetManager.loadImage(dataUrl)

            expect(asset).toBeDefined()
            expect(asset.type).toBe("image")
            expect(asset.loaded).toBe(true)
            expect(asset.width).toBeGreaterThan(0)
            expect(asset.height).toBeGreaterThan(0)
            expect(asset.data).toBeDefined()
        })

        it("should cache loaded images", async () => {
            const dataUrl =
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2P8z8DwHwYYGBj+AwABBgEAW3pB4QAAAABJRU5ErkJggg=="

            const asset1 = await assetManager.loadImage(dataUrl)
            const asset2 = await assetManager.loadImage(dataUrl)

            expect(asset1).toBe(asset2)
        })

        it("should return placeholder on load failure", async () => {
            const invalidUrl =
                "https://invalid-domain-that-does-not-exist.com/image.png"

            const asset = await assetManager.loadImage(invalidUrl)

            // Should return placeholder instead of throwing
            expect(asset).toBeDefined()
            expect(asset.type).toBe("image")
            expect(asset.loaded).toBe(true)
        })

        it("should support fallback URLs", async () => {
            const invalidUrl =
                "https://invalid-domain-that-does-not-exist.com/image.png"
            const fallbackUrl =
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2P8z8DwHwYYGBj+AwABBgEAW3pB4QAAAABJRU5ErkJggg=="

            const asset = await assetManager.loadImage(invalidUrl, {
                fallbackUrl,
            })

            expect(asset).toBeDefined()
            expect(asset.type).toBe("image")
            expect(asset.loaded).toBe(true)
            expect(asset.width).toBeGreaterThan(0)
        })

        it("should retrieve loaded assets by ID", async () => {
            const dataUrl =
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2P8z8DwHwYYGBj+AwABBgEAW3pB4QAAAABJRU5ErkJggg=="

            await assetManager.loadImage(dataUrl)
            const retrieved = assetManager.get(dataUrl)

            expect(retrieved).toBeDefined()
            expect(retrieved?.type).toBe("image")
        })

        it("should unload assets and free resources", async () => {
            const dataUrl =
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2P8z8DwHwYYGBj+AwABBgEAW3pB4QAAAABJRU5ErkJggg=="

            await assetManager.loadImage(dataUrl)
            assetManager.unload(dataUrl)

            const retrieved = assetManager.get(dataUrl)
            expect(retrieved).toBeNull()
        })

        it("should preload multiple images", async () => {
            const dataUrl1 =
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2P8z8DwHwYYGBj+AwABBgEAW3pB4QAAAABJRU5ErkJggg=="
            const dataUrl2 =
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NgYGD4DwABBAEAwgMZAAAAAElFTkSuQmCC"

            await assetManager.preload([
                { url: dataUrl1, type: "image" },
                { url: dataUrl2, type: "image" },
            ])

            const asset1 = assetManager.get(dataUrl1)
            const asset2 = assetManager.get(dataUrl2)

            expect(asset1).toBeDefined()
            expect(asset2).toBeDefined()
        })
    })
})
