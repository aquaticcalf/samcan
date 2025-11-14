import { describe, expect, test } from "bun:test"
import { Keyframe, Easing } from "../core/animation"

describe("Keyframe", () => {
    test("stores time, value, and interpolation type", () => {
        const keyframe = new Keyframe(1.5, 100, "linear")

        expect(keyframe.time).toBe(1.5)
        expect(keyframe.value).toBe(100)
        expect(keyframe.interpolation).toBe("linear")
    })

    test("supports easing functions", () => {
        const keyframe = new Keyframe(2.0, 50, "linear", Easing.inQuad)

        expect(keyframe.easing).toBeDefined()
        expect(keyframe.easing?.(0.5)).toBeCloseTo(0.25)
    })

    test("allows updating properties", () => {
        const keyframe = new Keyframe(1.0, 10, "step")

        keyframe.time = 2.0
        keyframe.value = 20
        keyframe.interpolation = "cubic"

        expect(keyframe.time).toBe(2.0)
        expect(keyframe.value).toBe(20)
        expect(keyframe.interpolation).toBe("cubic")
    })
})
