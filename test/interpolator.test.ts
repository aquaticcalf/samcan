import { describe, expect, test } from "bun:test"
import {
    NumberInterpolator,
    Vector2Interpolator,
    ColorInterpolator,
    InterpolatorRegistry,
    Easing,
} from "../core/animation"
import { Vector2 } from "../core/math/vector2"
import { Color } from "../core/math/color"

describe("NumberInterpolator", () => {
    const interpolator = new NumberInterpolator()

    test("interpolates between two numbers linearly", () => {
        expect(interpolator.interpolate(0, 100, 0)).toBe(0)
        expect(interpolator.interpolate(0, 100, 0.5)).toBe(50)
        expect(interpolator.interpolate(0, 100, 1)).toBe(100)
    })

    test("applies easing function when provided", () => {
        const result = interpolator.interpolate(0, 100, 0.5, Easing.inQuad)
        expect(result).toBeCloseTo(25)
    })
})

describe("Vector2Interpolator", () => {
    const interpolator = new Vector2Interpolator()

    test("interpolates between two vectors", () => {
        const from = new Vector2(0, 0)
        const to = new Vector2(100, 200)

        const result = interpolator.interpolate(from, to, 0.5)
        expect(result.x).toBe(50)
        expect(result.y).toBe(100)
    })

    test("applies easing function to both components", () => {
        const from = new Vector2(0, 0)
        const to = new Vector2(100, 100)

        const result = interpolator.interpolate(from, to, 0.5, Easing.inQuad)
        expect(result.x).toBeCloseTo(25)
        expect(result.y).toBeCloseTo(25)
    })
})

describe("ColorInterpolator", () => {
    const interpolator = new ColorInterpolator()

    test("interpolates between two colors", () => {
        const from = new Color(0, 0, 0, 1)
        const to = new Color(1, 1, 1, 1)

        const result = interpolator.interpolate(from, to, 0.5)
        expect(result.r).toBeCloseTo(0.5)
        expect(result.g).toBeCloseTo(0.5)
        expect(result.b).toBeCloseTo(0.5)
        expect(result.a).toBeCloseTo(1)
    })

    test("interpolates alpha channel", () => {
        const from = new Color(1, 0, 0, 0)
        const to = new Color(1, 0, 0, 1)

        const result = interpolator.interpolate(from, to, 0.5)
        expect(result.a).toBeCloseTo(0.5)
    })
})

describe("InterpolatorRegistry", () => {
    test("provides built-in interpolators", () => {
        expect(InterpolatorRegistry.get("number")).toBeDefined()
        expect(InterpolatorRegistry.get("Vector2")).toBeDefined()
        expect(InterpolatorRegistry.get("Color")).toBeDefined()
    })

    test("gets interpolator for value type", () => {
        expect(InterpolatorRegistry.getForValue(42)).toBeDefined()
        expect(InterpolatorRegistry.getForValue(new Vector2())).toBeDefined()
        expect(InterpolatorRegistry.getForValue(new Color())).toBeDefined()
    })

    test("checks if interpolator exists", () => {
        expect(InterpolatorRegistry.has("number")).toBe(true)
        expect(InterpolatorRegistry.has("nonexistent")).toBe(false)
    })
})
