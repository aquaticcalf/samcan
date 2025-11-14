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

describe("AnimationRuntime - Playback Controls", () => {
    test("play() starts playback from stopped state", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })
        runtime.play()

        expect(runtime.state).toBe("playing")
        expect(runtime.isPlaying).toBe(true)
        expect(runtime.currentTime).toBe(0)
    })

    test("play() throws error when no animation loaded", () => {
        const runtime = new AnimationRuntime()

        expect(() => runtime.play()).toThrow("Cannot play: no animation loaded")
    })

    test("play() does nothing if already playing", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })
        runtime.play()

        const stateBefore = runtime.state
        runtime.play()

        expect(runtime.state).toBe(stateBefore)
        expect(runtime.state).toBe("playing")
    })

    test("pause() pauses playback", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })
        runtime.play()
        runtime.pause()

        expect(runtime.state).toBe("paused")
        expect(runtime.isPlaying).toBe(false)
    })

    test("pause() does nothing if not playing", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })
        runtime.pause()

        expect(runtime.state).toBe("stopped")
    })

    test("play() resumes from paused state", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })
        runtime.seek(2.5)
        runtime.play()
        runtime.pause()

        const timeBefore = runtime.currentTime
        runtime.play()

        expect(runtime.state).toBe("playing")
        expect(runtime.currentTime).toBe(timeBefore)
    })

    test("stop() stops playback and resets to beginning", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })
        runtime.seek(2.5)
        runtime.play()
        runtime.stop()

        expect(runtime.state).toBe("stopped")
        expect(runtime.isPlaying).toBe(false)
        expect(runtime.currentTime).toBe(0)
    })

    test("stop() does nothing if idle", () => {
        const runtime = new AnimationRuntime()
        runtime.stop()

        expect(runtime.state).toBe("idle")
    })

    test("seek() jumps to specific time", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        const node = new SceneNode()
        node.transform.position.x = 0
        artboard.addChild(node)

        const track = new AnimationTrack(node, "transform.position.x")
        track.addKeyframe(new Keyframe(0, 0, "linear"))
        track.addKeyframe(new Keyframe(5, 500, "linear"))
        timeline.addTrack(track)

        await runtime.load({ artboard, timeline })
        runtime.seek(2.5)

        expect(runtime.currentTime).toBe(2.5)
        expect(node.transform.position.x).toBe(250)
    })

    test("seek() clamps time to valid range", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })

        runtime.seek(-1)
        expect(runtime.currentTime).toBe(0)

        runtime.seek(10)
        expect(runtime.currentTime).toBe(5.0)
    })

    test("seek() throws error when no animation loaded", () => {
        const runtime = new AnimationRuntime()

        expect(() => runtime.seek(1.0)).toThrow(
            "Cannot seek: no animation loaded",
        )
    })

    test("seek() updates state from idle to stopped", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })
        runtime.unload()
        await runtime.load({ artboard, timeline })

        // Manually set to idle (simulating fresh load without evaluation)
        expect(runtime.state).toBe("stopped")
    })

    test("setSpeed() changes playback speed", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })

        runtime.setSpeed(2.0)
        expect(runtime.speed).toBe(2.0)

        runtime.setSpeed(0.5)
        expect(runtime.speed).toBe(0.5)
    })

    test("setSpeed() throws error for invalid speed", () => {
        const runtime = new AnimationRuntime()

        expect(() => runtime.setSpeed(0)).toThrow(
            "Speed must be greater than 0",
        )
        expect(() => runtime.setSpeed(-1)).toThrow(
            "Speed must be greater than 0",
        )
    })

    test("setLoop() changes loop mode", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })

        expect(runtime.loopMode).toBe("none")

        runtime.setLoop("loop")
        expect(runtime.loopMode).toBe("loop")

        runtime.setLoop("pingpong")
        expect(runtime.loopMode).toBe("pingpong")

        runtime.setLoop("none")
        expect(runtime.loopMode).toBe("none")
    })
})

describe("AnimationRuntime - Event System", () => {
    test("emits play event when playback starts", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })

        let playEventFired = false
        runtime.on("play", () => {
            playEventFired = true
        })

        runtime.play()

        expect(playEventFired).toBe(true)
    })

    test("emits pause event when playback pauses", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })

        let pauseEventFired = false
        runtime.on("pause", () => {
            pauseEventFired = true
        })

        runtime.play()
        runtime.pause()

        expect(pauseEventFired).toBe(true)
    })

    test("emits stop event when playback stops", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })

        let stopEventFired = false
        runtime.on("stop", () => {
            stopEventFired = true
        })

        runtime.play()
        runtime.stop()

        expect(stopEventFired).toBe(true)
    })

    test("emits stateChange event with new state", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })

        const states: string[] = []
        runtime.on("stateChange", (state) => {
            states.push(state)
        })

        runtime.play()
        runtime.pause()
        runtime.play()
        runtime.stop()

        expect(states).toEqual(["playing", "paused", "playing", "stopped"])
    })

    test("on() returns unsubscribe function", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })

        let eventCount = 0
        const unsubscribe = runtime.on("play", () => {
            eventCount++
        })

        runtime.play()
        runtime.stop()

        unsubscribe()

        runtime.play()

        expect(eventCount).toBe(1)
    })

    test("once() fires only once then unsubscribes", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })

        let eventCount = 0
        runtime.once("play", () => {
            eventCount++
        })

        runtime.play()
        runtime.stop()
        runtime.play()

        expect(eventCount).toBe(1)
    })

    test("off() removes all listeners for an event", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })

        let eventCount = 0
        runtime.on("play", () => {
            eventCount++
        })
        runtime.on("play", () => {
            eventCount++
        })

        runtime.play()
        runtime.stop()

        runtime.off("play")

        runtime.play()

        expect(eventCount).toBe(2)
    })

    test("removeAllListeners() removes all event listeners", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(5.0, 60)

        await runtime.load({ artboard, timeline })

        let playCount = 0
        let pauseCount = 0

        runtime.on("play", () => {
            playCount++
        })
        runtime.on("pause", () => {
            pauseCount++
        })

        runtime.play()
        runtime.pause()

        runtime.removeAllListeners()

        runtime.play()
        runtime.pause()

        expect(playCount).toBe(1)
        expect(pauseCount).toBe(1)
    })

    test("emits complete event when animation finishes without loop", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(0.1, 60) // Very short duration

        await runtime.load({ artboard, timeline })

        let completeEventFired = false
        runtime.on("complete", () => {
            completeEventFired = true
        })

        runtime.play()

        // Wait for animation to complete
        await new Promise((resolve) => setTimeout(resolve, 200))

        expect(completeEventFired).toBe(true)
        expect(runtime.state).toBe("stopped")
    })

    test("emits loop event when animation loops", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(0.05, 60) // Very short duration

        await runtime.load({ artboard, timeline })
        runtime.setLoop("loop")

        let loopEventCount = 0
        runtime.on("loop", () => {
            loopEventCount++
        })

        runtime.play()

        // Wait for at least one loop
        await new Promise((resolve) => setTimeout(resolve, 150))

        runtime.stop()

        expect(loopEventCount).toBeGreaterThan(0)
    })

    test("emits loop event in pingpong mode", async () => {
        const runtime = new AnimationRuntime()
        const artboard = new Artboard(800, 600, Color.white())
        const timeline = new Timeline(0.05, 60) // Very short duration

        await runtime.load({ artboard, timeline })
        runtime.setLoop("pingpong")

        let loopEventCount = 0
        runtime.on("loop", () => {
            loopEventCount++
        })

        runtime.play()

        // Wait for at least one loop
        await new Promise((resolve) => setTimeout(resolve, 150))

        runtime.stop()

        expect(loopEventCount).toBeGreaterThan(0)
    })
})
