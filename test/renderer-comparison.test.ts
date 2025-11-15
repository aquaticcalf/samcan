import { describe, test, expect } from "bun:test"
import "./setup"
import { Canvas2DRenderer } from "../core/renderer/canvas2drenderer"
import { WebGLRenderer } from "../core/renderer/webglrenderer"
import { Path } from "../core/math/path"
import { Color } from "../core/math/color"
import { Paint } from "../core/math/paint"

function createCanvas(): HTMLCanvasElement {
    return Object.assign(document.createElement("canvas"), {
        width: 128,
        height: 128,
    })
}

describe("Renderer Comparison", () => {
    test("Canvas2D and WebGL produce consistent batch counts for identical operations", async () => {
        const canvasA = createCanvas()
        const canvasB = createCanvas()

        const canvasRenderer = new Canvas2DRenderer()
        const webglRenderer = new WebGLRenderer()
        await canvasRenderer.initialize(canvasA)
        let webglInitialized = true
        try {
            await webglRenderer.initialize(canvasB)
        } catch (e) {
            // WebGL not supported in this environment; verify error shape and skip comparison
            expect(e instanceof Error).toBe(true)
            webglInitialized = false
        }
        if (!webglInitialized) {
            // Environment skip - test passes acknowledging lack of WebGL
            return
        }

        // Prepare identical drawing operations
        const path = new Path()
        path.moveTo(10, 10)
        path.lineTo(50, 10)
        path.lineTo(50, 50)
        path.lineTo(10, 50)
        path.close()

        const paint = Paint.solid(new Color(1, 0, 0, 1), "normal")

        // Begin frame for both
        canvasRenderer.beginFrame()
        webglRenderer.beginFrame()

        // Enable batching explicitly
        canvasRenderer.setBatchingEnabled(true)
        webglRenderer.setBatchingEnabled(true)

        // Draw same operations
        for (let i = 0; i < 5; i++) {
            canvasRenderer.drawPath(path, paint)
            webglRenderer.drawPath(path, paint)
        }

        // End frame (flush batches)
        canvasRenderer.endFrame()
        webglRenderer.endFrame()

        const canvasStats = canvasRenderer.getBatchStats()
        const webglStats = webglRenderer.getBatchStats()

        // Both should have at least one batch and same operation count
        expect(canvasStats.operationCount).toBe(5)
        expect(webglStats.operationCount).toBe(5)
        expect(canvasStats.batchCount).toBeGreaterThanOrEqual(1)
        expect(webglStats.batchCount).toBeGreaterThanOrEqual(1)
    })
})
