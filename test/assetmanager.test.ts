import { describe, expect, it, beforeEach } from "bun:test"
import { AssetManager } from "../core/asset"
import { Artboard } from "../core/scene/nodes/artboard"
import { ImageNode } from "../core/scene/nodes/imagenode"
import { Color } from "../core/math/color"
import { setupDOM } from "./dom-setup"

setupDOM()

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

        it("should emit load-start and load-success events on successful load", async () => {
            const events: string[] = []

            assetManager.on("load-start", (event) => {
                events.push(`start:${event.assetType}`)
            })

            assetManager.on("load-success", (event) => {
                events.push(`success:${event.assetType}`)
            })

            const dataUrl =
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2P8z8DwHwYYGBj+AwABBgEAW3pB4QAAAABJRU5ErkJggg=="

            await assetManager.loadImage(dataUrl)

            expect(events).toEqual(["start:image", "success:image"])
        })

        it("should emit load-error event on load failure", async () => {
            const events: string[] = []
            let errorEvent: any = null

            assetManager.on("load-start", (event) => {
                events.push(`start:${event.assetType}`)
            })

            assetManager.on("load-error", (event) => {
                events.push(`error:${event.assetType}`)
                errorEvent = event
            })

            // Use an invalid network URL that will fail immediately
            const invalidUrl =
                "https://invalid-domain-that-does-not-exist.com/image.png"

            // loadImage returns placeholder on failure, so we need to use load() to see the error
            try {
                await assetManager.load(invalidUrl, "image", { maxRetries: 0 })
            } catch (error) {
                // Expected to throw
            }

            expect(events).toContain("start:image")
            expect(events).toContain("error:image")
            expect(errorEvent).toBeDefined()
            expect(errorEvent.error).toBeDefined()
        })

        it("should emit load-retry events when retrying", async () => {
            const events: string[] = []
            const retryEvents: any[] = []

            assetManager.on("load-retry", (event) => {
                events.push(`retry:${event.retryAttempt}`)
                retryEvents.push(event)
            })

            // Use an invalid network URL that will fail immediately
            const invalidUrl =
                "https://invalid-domain-that-does-not-exist.com/image.png"

            try {
                await assetManager.load(invalidUrl, "image", {
                    maxRetries: 2,
                    retryDelay: 10,
                })
            } catch (error) {
                // Expected to throw after retries
            }

            expect(events).toContain("retry:1")
            expect(events).toContain("retry:2")
            expect(retryEvents).toHaveLength(2)
            expect(retryEvents[0]?.retryAttempt).toBe(1)
            expect(retryEvents[1]?.retryAttempt).toBe(2)
        })

        it("should allow removing event listeners", async () => {
            const events: string[] = []

            const callback = (event: any) => {
                events.push(`start:${event.assetType}`)
            }

            assetManager.on("load-start", callback)
            assetManager.off("load-start", callback)

            const dataUrl =
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2P8z8DwHwYYGBj+AwABBgEAW3pB4QAAAABJRU5ErkJggg=="

            await assetManager.loadImage(dataUrl)

            expect(events).toHaveLength(0)
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

            const asset = await assetManager.loadImage(invalidUrl, {
                maxRetries: 0,
            })

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
                maxRetries: 0,
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

        it("should emit unload event when unloading assets", async () => {
            const events: string[] = []

            assetManager.on("unload", (event) => {
                events.push(`unload:${event.assetType}`)
            })

            const dataUrl =
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2P8z8DwHwYYGBj+AwABBgEAW3pB4QAAAABJRU5ErkJggg=="

            await assetManager.loadImage(dataUrl)
            assetManager.unload(dataUrl)

            expect(events).toContain("unload:image")
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

    describe("Font Loading", () => {
        it("should load a font using data URL", async () => {
            // Create a minimal WOFF2 font data URL (this is a valid minimal font)
            const fontDataUrl =
                "data:font/woff2;base64,d09GMgABAAAAAAGQAAoAAAAABgAAAAFDAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAALAoKCAhYAQYAATYCJAMIBCAFBgcHGxsHyB6FcZP1RJOiKP6/+Ih4+H6/du59H0xiniGZRBZLJkRCJZE9k+lkQsVDJeQvlUx+8Pvc+xGzJuJNI5lEPIlFT6ZBCZVGyCQS6VQiHv6tW93/r7l1gDvgAR1wAAWYhzTg3QUYYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+k="

            const asset = await assetManager.loadFont(fontDataUrl, "TestFont")

            expect(asset).toBeDefined()
            expect(asset.type).toBe("font")
            expect(asset.loaded).toBe(true)
            expect(asset.family).toBe("TestFont")
            expect(asset.fontFace).toBeDefined()
        })

        it("should cache loaded fonts", async () => {
            const fontDataUrl =
                "data:font/woff2;base64,d09GMgABAAAAAAGQAAoAAAAABgAAAAFDAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAALAoKCAhYAQYAATYCJAMIBCAFBgcHGxsHyB6FcZP1RJOiKP6/+Ih4+H6/du59H0xiniGZRBZLJkRCJZE9k+lkQsVDJeQvlUx+8Pvc+xGzJuJNI5lEPIlFT6ZBCZVGyCQS6VQiHv6tW93/r7l1gDvgAR1wAAWYhzTg3QUYYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+k="

            const asset1 = await assetManager.loadFont(fontDataUrl, "TestFont")
            const asset2 = await assetManager.loadFont(fontDataUrl, "TestFont")

            expect(asset1).toBe(asset2)
        })

        it("should support font weight and style options", async () => {
            const fontDataUrl =
                "data:font/woff2;base64,d09GMgABAAAAAAGQAAoAAAAABgAAAAFDAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAALAoKCAhYAQYAATYCJAMIBCAFBgcHGxsHyB6FcZP1RJOiKP6/+Ih4+H6/du59H0xiniGZRBZLJkRCJZE9k+lkQsVDJeQvlUx+8Pvc+xGzJuJNI5lEPIlFT6ZBCZVGyCQS6VQiHv6tW93/r7l1gDvgAR1wAAWYhzTg3QUYYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+k="

            const asset = await assetManager.loadFont(
                fontDataUrl,
                "TestFontBold",
                {
                    weight: "bold",
                    style: "italic",
                },
            )

            expect(asset).toBeDefined()
            expect(asset.family).toBe("TestFontBold")
            expect(asset.fontFace.weight).toBe("bold")
            expect(asset.fontFace.style).toBe("italic")
        })

        it("should throw error on font load failure", async () => {
            const invalidUrl =
                "https://invalid-domain-that-does-not-exist.com/font.woff2"

            await expect(
                assetManager.load(invalidUrl, "font", {
                    family: "InvalidFont",
                    maxRetries: 0,
                }),
            ).rejects.toThrow()
        })

        it("should support fallback URLs for fonts", async () => {
            const invalidUrl =
                "https://invalid-domain-that-does-not-exist.com/font.woff2"
            const fallbackUrl =
                "data:font/woff2;base64,d09GMgABAAAAAAGQAAoAAAAABgAAAAFDAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAALAoKCAhYAQYAATYCJAMIBCAFBgcHGxsHyB6FcZP1RJOiKP6/+Ih4+H6/du59H0xiniGZRBZLJkRCJZE9k+lkQsVDJeQvlUx+8Pvc+xGzJuJNI5lEPIlFT6ZBCZVGyCQS6VQiHv6tW93/r7l1gDvgAR1wAAWYhzTg3QUYYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+k="

            const asset = await assetManager.loadFont(
                invalidUrl,
                "FallbackFont",
                {
                    fallbackUrl,
                    maxRetries: 0,
                },
            )

            expect(asset).toBeDefined()
            expect(asset.type).toBe("font")
            expect(asset.loaded).toBe(true)
        })

        it("should unload fonts and remove from document.fonts", async () => {
            const fontDataUrl =
                "data:font/woff2;base64,d09GMgABAAAAAAGQAAoAAAAABgAAAAFDAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAALAoKCAhYAQYAATYCJAMIBCAFBgcHGxsHyB6FcZP1RJOiKP6/+Ih4+H6/du59H0xiniGZRBZLJkRCJZE9k+lkQsVDJeQvlUx+8Pvc+xGzJuJNI5lEPIlFT6ZBCZVGyCQS6VQiHv6tW93/r7l1gDvgAR1wAAWYhzTg3QUYYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+k="

            await assetManager.loadFont(fontDataUrl, "UnloadTest")
            assetManager.unload(fontDataUrl)

            const retrieved = assetManager.get(fontDataUrl)
            expect(retrieved).toBeNull()
        })

        it("should preload multiple fonts", async () => {
            const fontDataUrl1 =
                "data:font/woff2;base64,d09GMgABAAAAAAGQAAoAAAAABgAAAAFDAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAALAoKCAhYAQYAATYCJAMIBCAFBgcHGxsHyB6FcZP1RJOiKP6/+Ih4+H6/du59H0xiniGZRBZLJkRCJZE9k+lkQsVDJeQvlUx+8Pvc+xGzJuJNI5lEPIlFT6ZBCZVGyCQS6VQiHv6tW93/r7l1gDvgAR1wAAWYhzTg3QUYYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+k="
            const fontDataUrl2 =
                "data:font/woff2;base64,d09GMgABAAAAAAGQAAoAAAAABgAAAAFDAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAALAoKCAhYAQYAATYCJAMIBCAFBgcHGxsHyB6FcZP1RJOiKP6/+Ih4+H6/du59H0xiniGZRBZLJkRCJZE9k+lkQsVDJeQvlUx+8Pvc+xGzJuJNI5lEPIlFT6ZBCZVGyCQS6VQiHv6tW93/r7l1gDvgAR1wAAWYhzTg3QUYYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+k="

            await assetManager.preload([
                { url: fontDataUrl1, type: "font", family: "PreloadFont1" },
                { url: fontDataUrl2, type: "font", family: "PreloadFont2" },
            ])

            const asset1 = assetManager.get(fontDataUrl1)
            const asset2 = assetManager.get(fontDataUrl2)

            expect(asset1).toBeDefined()
            expect(asset2).toBeDefined()
            expect(asset1?.type).toBe("font")
            expect(asset2?.type).toBe("font")
        })
    })

    describe("Asset Dependency Tracking", () => {
        it("should track asset usage by artboard", () => {
            assetManager.trackAssetUsage("artboard1", "asset1")
            assetManager.trackAssetUsage("artboard1", "asset2")

            const assets = assetManager.getArtboardAssets("artboard1")
            expect(assets).toHaveLength(2)
            expect(assets).toContain("asset1")
            expect(assets).toContain("asset2")
        })

        it("should track multiple artboards using the same asset", () => {
            assetManager.trackAssetUsage("artboard1", "asset1")
            assetManager.trackAssetUsage("artboard2", "asset1")

            const artboards = assetManager.getAssetArtboards("asset1")
            expect(artboards).toHaveLength(2)
            expect(artboards).toContain("artboard1")
            expect(artboards).toContain("artboard2")
        })

        it("should untrack specific asset usage", () => {
            assetManager.trackAssetUsage("artboard1", "asset1")
            assetManager.trackAssetUsage("artboard1", "asset2")

            assetManager.untrackAssetUsage("artboard1", "asset1")

            const assets = assetManager.getArtboardAssets("artboard1")
            expect(assets).toHaveLength(1)
            expect(assets).toContain("asset2")
            expect(assets).not.toContain("asset1")
        })

        it("should untrack all assets for an artboard", () => {
            assetManager.trackAssetUsage("artboard1", "asset1")
            assetManager.trackAssetUsage("artboard1", "asset2")

            assetManager.untrackAssetUsage("artboard1")

            const assets = assetManager.getArtboardAssets("artboard1")
            expect(assets).toHaveLength(0)
        })

        it("should return empty array for artboard with no assets", () => {
            const assets = assetManager.getArtboardAssets("nonexistent")
            expect(assets).toHaveLength(0)
        })

        it("should return empty array for asset used by no artboards", () => {
            const artboards = assetManager.getAssetArtboards("nonexistent")
            expect(artboards).toHaveLength(0)
        })

        it("should get all dependencies", () => {
            assetManager.trackAssetUsage("artboard1", "asset1")
            assetManager.trackAssetUsage("artboard1", "asset2")
            assetManager.trackAssetUsage("artboard2", "asset1")

            const dependencies = assetManager.getAllDependencies()
            expect(dependencies.size).toBe(2)
            expect(dependencies.get("artboard1")?.size).toBe(2)
            expect(dependencies.get("artboard2")?.size).toBe(1)
        })

        it("should clear all dependencies", () => {
            assetManager.trackAssetUsage("artboard1", "asset1")
            assetManager.trackAssetUsage("artboard2", "asset2")

            assetManager.clearDependencies()

            const dependencies = assetManager.getAllDependencies()
            expect(dependencies.size).toBe(0)
        })

        it("should collect assets from scene graph", () => {
            const artboard = new Artboard(800, 600, Color.white())
            const imageNode1 = new ImageNode("asset1")
            const imageNode2 = new ImageNode("asset2")

            artboard.addChild(imageNode1)
            artboard.addChild(imageNode2)

            const assets = assetManager.collectSceneAssets(artboard)
            expect(assets).toHaveLength(2)
            expect(assets).toContain("asset1")
            expect(assets).toContain("asset2")
        })

        it("should collect assets from nested scene graph", () => {
            const artboard = new Artboard(800, 600, Color.white())
            const imageNode1 = new ImageNode("asset1")
            const imageNode2 = new ImageNode("asset2")

            artboard.addChild(imageNode1)
            imageNode1.addChild(imageNode2)

            const assets = assetManager.collectSceneAssets(artboard)
            expect(assets).toHaveLength(2)
            expect(assets).toContain("asset1")
            expect(assets).toContain("asset2")
        })

        it("should handle duplicate assets in scene graph", () => {
            const artboard = new Artboard(800, 600, Color.white())
            const imageNode1 = new ImageNode("asset1")
            const imageNode2 = new ImageNode("asset1")

            artboard.addChild(imageNode1)
            artboard.addChild(imageNode2)

            const assets = assetManager.collectSceneAssets(artboard)
            expect(assets).toHaveLength(1)
            expect(assets).toContain("asset1")
        })

        it("should ignore non-string image data in scene graph", () => {
            const artboard = new Artboard(800, 600, Color.white())
            const img = new Image()
            const imageNode = new ImageNode(img)

            artboard.addChild(imageNode)

            const assets = assetManager.collectSceneAssets(artboard)
            expect(assets).toHaveLength(0)
        })
    })
})
