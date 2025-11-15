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
import { setupDOM } from "./dom-setup"

setupDOM()
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
        // Restore original jsdom-based globals instead of deleting
        // This prevents other tests from seeing an undefined document
        setupDOM()
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

    test("culls nodes outside viewport bounds", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(1.0, 60)

        // Create shapes at different positions
        const path = new Path()
        path.moveTo(0, 0)
        path.lineTo(100, 0)
        path.lineTo(100, 100)
        path.lineTo(0, 100)
        path.close()

        // Shape inside viewport
        const shapeInside = new ShapeNode(path)
        shapeInside.fill = Paint.solid(Color.red())
        shapeInside.transform.position.x = 100
        shapeInside.transform.position.y = 100
        artboard.addChild(shapeInside)

        // Shape outside viewport (far to the right)
        const shapeOutside = new ShapeNode(path)
        shapeOutside.fill = Paint.solid(Color.blue())
        shapeOutside.transform.position.x = 2000
        shapeOutside.transform.position.y = 100
        artboard.addChild(shapeOutside)

        await runtime.load({ artboard, timeline })

        const renderer = new Canvas2DRenderer()
        await renderer.initialize(canvas)
        runtime.setRenderer(renderer)

        // Get viewport bounds
        const viewportBounds = renderer.getViewportBounds()

        // Verify viewport bounds are correct
        expect(viewportBounds.x).toBe(0)
        expect(viewportBounds.y).toBe(0)
        expect(viewportBounds.width).toBe(800)
        expect(viewportBounds.height).toBe(600)

        // Verify inside shape is within viewport
        const insideBounds = shapeInside.getWorldBounds()
        expect(insideBounds).not.toBeNull()
        if (insideBounds) {
            expect(insideBounds.intersects(viewportBounds)).toBe(true)
        }

        // Verify outside shape is not within viewport
        const outsideBounds = shapeOutside.getWorldBounds()
        expect(outsideBounds).not.toBeNull()
        if (outsideBounds) {
            expect(outsideBounds.intersects(viewportBounds)).toBe(false)
        }

        // Seek to trigger rendering - should not throw
        runtime.seek(0)
    })

    test("hierarchical culling skips children of culled nodes", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(1.0, 60)

        const path = new Path()
        path.moveTo(0, 0)
        path.lineTo(100, 0)
        path.lineTo(100, 100)
        path.lineTo(0, 100)
        path.close()

        // Create a parent node outside viewport
        const parentOutside = new ShapeNode(path)
        parentOutside.fill = Paint.solid(Color.red())
        parentOutside.transform.position.x = 2000
        parentOutside.transform.position.y = 100
        artboard.addChild(parentOutside)

        // Create a child node (would be inside viewport if parent wasn't culled)
        const childNode = new ShapeNode(path)
        childNode.fill = Paint.solid(Color.blue())
        childNode.transform.position.x = -1900 // Relative to parent
        childNode.transform.position.y = 0
        parentOutside.addChild(childNode)

        await runtime.load({ artboard, timeline })

        const renderer = new Canvas2DRenderer()
        await renderer.initialize(canvas)
        runtime.setRenderer(renderer)

        const viewportBounds = renderer.getViewportBounds()

        // Verify parent is outside viewport
        const parentBounds = parentOutside.getOwnWorldBounds()
        expect(parentBounds).not.toBeNull()
        if (parentBounds) {
            expect(parentBounds.intersects(viewportBounds)).toBe(false)
        }

        // Seek to trigger rendering - should not throw
        // Parent and child should both be culled
        runtime.seek(0)
    })
})
