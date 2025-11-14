import { expect, test } from "bun:test"
import { AnimationTrack } from "../core/animation/animationtrack"
import { Keyframe } from "../core/animation/keyframe"
import { SceneNode } from "../core/scene/node"

test("property targeting", () => {
    const node = new SceneNode()
    node.opacity = 0.5

    const track = new AnimationTrack(node, "opacity")
    expect(track.target).toBe(node)
    expect(track.property).toBe("opacity")
})

test("keyframe management", () => {
    const node = new SceneNode()
    const track = new AnimationTrack(node, "opacity")

    track.addKeyframe(new Keyframe(0, 0, "linear"))
    track.addKeyframe(new Keyframe(1, 1, "linear"))
    track.addKeyframe(new Keyframe(2, 0, "linear"))
    expect(track.keyframes.length).toBe(3)

    const unsortedKeyframe = new Keyframe(0.5, 0.75, "cubic")
    track.addKeyframe(unsortedKeyframe)
    expect(track.keyframes[1]?.time).toBe(0.5)

    const removed = track.removeKeyframe(unsortedKeyframe)
    expect(removed).toBe(true)
    expect(track.keyframes.length).toBe(3)
})

test("interpolation", () => {
    const node = new SceneNode()
    const track = new AnimationTrack(node, "opacity")
    track.addKeyframe(new Keyframe(0, 0, "linear"))
    track.addKeyframe(new Keyframe(1, 1, "linear"))
    track.addKeyframe(new Keyframe(2, 0, "linear"))

    track.evaluate(0)
    expect(node.opacity).toBe(0)

    track.evaluate(0.5)
    expect(Math.abs(node.opacity - 0.5)).toBeLessThan(0.01)

    track.evaluate(1)
    expect(node.opacity).toBe(1)

    track.evaluate(1.5)
    expect(Math.abs(node.opacity - 0.5)).toBeLessThan(0.01)

    track.evaluate(2)
    expect(node.opacity).toBe(0)
})

test("interpolation types", () => {
    const node = new SceneNode()

    const stepTrack = new AnimationTrack(node, "opacity")
    stepTrack.addKeyframe(new Keyframe(0, 0, "step"))
    stepTrack.addKeyframe(new Keyframe(1, 1, "step"))
    stepTrack.evaluate(0.5)
    expect(node.opacity).toBe(0)

    const cubicTrack = new AnimationTrack(node, "opacity")
    cubicTrack.addKeyframe(new Keyframe(0, 0, "cubic"))
    cubicTrack.addKeyframe(new Keyframe(1, 1, "cubic"))
    cubicTrack.evaluate(0.5)
    expect(node.opacity).toBeGreaterThan(0)
    expect(node.opacity).toBeLessThan(1)
})
