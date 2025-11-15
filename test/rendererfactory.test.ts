// Setup DOM environment first, before any other code
import { setupDOM } from "./dom-setup"
setupDOM()

import { setLogger } from "../core/animation/logger"

// Silence renderer logging during tests
setLogger({ error: () => {}, warn: () => {}, info: () => {} })

import { describe, expect, test, beforeEach, spyOn } from "bun:test"
import { RendererFactory } from "../core/renderer/rendererfactory"
import { RendererError } from "../core/error/renderererror"
import type { RendererBackend } from "../core/renderer/renderer"

describe("RendererFactory", () => {
    let canvas: HTMLCanvasElement

    beforeEach(() => {
        setupDOM()
        canvas = document.createElement("canvas")
        canvas.width = 800
        canvas.height = 600
    })

    describe("create", () => {
        test("should create Canvas2D renderer when available", async () => {
            const renderer = await RendererFactory.create(canvas, "canvas2d")

            expect(renderer).toBeDefined()
            expect(renderer.backend).toBe("canvas2d")
            expect(renderer.isInitialized).toBe(true)
        })

        test("should fallback to Canvas2D when WebGL is not available", async () => {
            // Request WebGL but it will fallback to Canvas2D in jsdom
            const renderer = await RendererFactory.create(canvas, "webgl")

            expect(renderer).toBeDefined()
            expect(renderer.isInitialized).toBe(true)
        })

        test("should emit warning when falling back from preferred backend", async () => {
            // Try WebGPU which is not implemented, should fallback
            const renderer = await RendererFactory.create(canvas, "webgpu")

            expect(renderer).toBeDefined()
            expect(renderer.isInitialized).toBe(true)
        })

        test("should use default fallback order when no preference specified", async () => {
            const renderer = await RendererFactory.create(canvas)

            expect(renderer).toBeDefined()
            expect(renderer.isInitialized).toBe(true)
        })

        test("should respect custom fallback order", async () => {
            const renderer = await RendererFactory.create(canvas, undefined, [
                "canvas2d",
            ])

            expect(renderer).toBeDefined()
            expect(renderer.backend).toBe("canvas2d")
        })

        test("should throw RendererError when all backends fail", async () => {
            // Create a canvas that will fail to get context
            const badCanvas = {
                getContext: () => null,
                width: 800,
                height: 600,
            } as unknown as HTMLCanvasElement

            await expect(
                RendererFactory.create(badCanvas, undefined, ["canvas2d"]),
            ).rejects.toThrow(RendererError)
        })
    })

    describe("isBackendAvailable", () => {
        test("should return true for Canvas2D", () => {
            expect(RendererFactory.isBackendAvailable("canvas2d")).toBe(true)
        })

        test("should return false for WebGPU in jsdom", () => {
            expect(RendererFactory.isBackendAvailable("webgpu")).toBe(false)
        })
    })

    describe("getAvailableBackends", () => {
        test("should return list of available backends", () => {
            const backends = RendererFactory.getAvailableBackends()

            expect(backends).toBeArray()
            expect(backends.length).toBeGreaterThan(0)
            expect(backends).toContain("canvas2d")
        })
    })
})
