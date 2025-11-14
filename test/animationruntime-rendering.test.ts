import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import {
    AnimationRuntime,
    Timeline,
    AnimationTrack,
    Keyframe,
} from "../core/animation"
import { Artboard } from "../core/scene/nodes/artboard"
import { ShapeNode } from "../core/scene/nodes/shapenode"
import { Color } from "../core/math/color"
import { Path } from "../core/math/path"
import { Paint } from "../core/math/paint"
import { Canvas2DRenderer } from "../core/renderer/canvas2drenderer"
import { JSDOM } from "jsdom"
import { Canvas } from "canvas"

describe("AnimationRuntime - Rendering Integration", () => {
    let dom: JSDOM
    let canvas: HTMLCanvasElement

    beforeEach(() => {
        // Set up jsdom with canvas support
        dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
            pretendToBeVisual: true,
        })

        // Set up global environment with canvas support
        global.document = dom.window.document as any
        global.HTMLCanvasElement = Canvas as any

        // Create a canvas element using node-canvas
        canvas = new Canvas(800, 600) as any
    })

    afterEach(() => {
        // Clean up global state
        delete (global as any).document
        delete (global as any).HTMLCanvasElement
    })

    test("accepts renderer in constructor", () => {
        const renderer = new Canvas2DRenderer()
        const runtime = new AnimationRuntime(renderer)

        expect(runtime.renderer).toBe(renderer)
    })

    test("allows setting renderer after construction", () => {
        const runtime = new AnimationRuntime()
        const renderer = new Canvas2DRenderer()

        expect(runtime.renderer).toBeNull()

        runtime.setRenderer(renderer)

        expect(runtime.renderer).toBe(renderer)
    })

    test("renders frame when timeline is evaluated during playback", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(1.0, 60)

        // Create a simple shape
        const path = new Path()
        path.moveTo(0, 0)
        path.lineTo(100, 0)
        path.lineTo(100, 100)
        path.lineTo(0, 100)
        path.close()

        const shape = new ShapeNode(path)
        shape.fill = Paint.solid(Color.red())
        artboard.addChild(shape)

        // Add animation track
        const track = new AnimationTrack(shape, "transform.position.x")
        track.addKeyframe(new Keyframe(0, 0, "linear"))
        track.addKeyframe(new Keyframe(1, 100, "linear"))
        timeline.addTrack(track)

        await runtime.load({ artboard, timeline })

        // Use canvas from node-canvas
        const renderer = new Canvas2DRenderer()
        await renderer.initialize(canvas)
        runtime.setRenderer(renderer)

        // Seek to middle of animation
        runtime.seek(0.5)

        // Verify the shape position was updated
        expect(shape.transform.position.x).toBe(50)
    })

    test("works without renderer (no rendering)", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(1.0, 60)

        await runtime.load({ artboard, timeline })

        // Should not throw even without renderer
        runtime.play()
        runtime.pause()
        runtime.stop()

        expect(runtime.renderer).toBeNull()
    })
})
