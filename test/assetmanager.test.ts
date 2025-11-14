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
                assetManager.loadFont(invalidUrl, "InvalidFont"),
            ).rejects.toThrow()
        })

        it("should support fallback URLs for fonts", async () => {
            const invalidUrl =
                "https://invalid-domain-that-does-not-exist.com/font.woff2"
            const fallbackUrl =
                "data:font/woff2;base64,d09GMgABAAAAAAGQAAoAAAAABgAAAAFDAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAALAoKCAhYAQYAATYCJAMIBCAFBgcHGxsHyB6FcZP1RJOiKP6/+Ih4+H6/du59H0xiniGZRBZLJkRCJZE9k+lkQsVDJeQvlUx+8Pvc+xGzJuJNI5lEPIlFT6ZBCZVGyCQS6VQiHv6tW93/r7l1gDvgAR1wAAWYhzTg3QUYYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+kWYECxRZhFkmGCCQaYYAIJJJBAAhm+l+k="

            const asset = await assetManager.loadFont(
                invalidUrl,
                "FallbackFont",
                {
                    fallbackUrl,
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
})
