import { describe, expect, test } from "bun:test"
import {
    AnimationRuntime,
    Timeline,
    AnimationTrack,
    Keyframe,
} from "../core/animation"
import { Artboard } from "../core/scene/nodes/artboard"
import { Color } from "../core/math/color"
import { SceneNode } from "../core/scene/node"

describe("AnimationRuntime", () => {
    test("initializes with idle state", () => {
        const runtime = new AnimationRuntime()

        expect(runtime.state).toBe("idle")
        expect(runtime.isPlaying).toBe(false)
        expect(runtime.currentTime).toBe(0)
        expect(runtime.duration).toBe(0)
        expect(runtime.artboard).toBeNull()
        expect(runtime.timeline).toBeNull()
    })

    test("loads animation data", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })

        expect(runtime.state).toBe("stopped")
        expect(runtime.artboard).toBe(artboard)
        expect(runtime.timeline).toBe(timeline)
        expect(runtime.duration).toBe(5.0)
        expect(runtime.currentTime).toBe(0)
    })

    test("throws error when loading invalid data", async () => {
        const runtime = new AnimationRuntime()

        await expect(
            runtime.load({
                artboard: null as unknown as Artboard,
                timeline: new Timeline(1),
            }),
        ).rejects.toThrow("AnimationData must contain an artboard")

        await expect(
            runtime.load({
                artboard: new Artboard(100, 100),
                timeline: null as unknown as Timeline,
            }),
        ).rejects.toThrow("AnimationData must contain a timeline")
    })

    test("unloads animation data", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })
        runtime.unload()

        expect(runtime.state).toBe("idle")
        expect(runtime.artboard).toBeNull()
        expect(runtime.timeline).toBeNull()
        expect(runtime.currentTime).toBe(0)
        expect(runtime.duration).toBe(0)
    })

    test("unloads previous animation when loading new one", async () => {
        const runtime = new AnimationRuntime()
        const artboard1 = new Artboard(800, 600, Color.white())
        const timeline1 = new Timeline(3.0, 60)

        await runtime.load({ artboard: artboard1, timeline: timeline1 })

        const artboard2 = new Artboard(1920, 1080, Color.black())
        const timeline2 = new Timeline(10.0, 30)

        await runtime.load({ artboard: artboard2, timeline: timeline2 })

        expect(runtime.artboard).toBe(artboard2)
        expect(runtime.timeline).toBe(timeline2)
        expect(runtime.duration).toBe(10.0)
    })

    test("evaluates timeline at time 0 on load", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        const node = new SceneNode()
        node.transform.position.x = 100
        artboard.addChild(node)

        const track = new AnimationTrack(node, "transform.position.x")
        track.addKeyframe(new Keyframe(0, 0, "linear"))
        track.addKeyframe(new Keyframe(5, 500, "linear"))
        timeline.addTrack(track)

        await runtime.load({ artboard, timeline })

        // Should evaluate at time 0, setting position to 0
        expect(node.transform.position.x).toBe(0)
    })

    test("provides access to clock and scheduler", () => {
        const runtime = new AnimationRuntime()

        expect(runtime.clock).toBeDefined()
        expect(runtime.scheduler).toBeDefined()
    })
})
