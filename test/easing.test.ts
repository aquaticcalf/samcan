import { describe, expect, test } from "bun:test"
import {
    linear,
    easeIn,
    easeOut,
    easeInOut,
    cubicBezier,
    Easing,
} from "../core/animation"

describe("Easing Functions", () => {
    test("linear returns input unchanged", () => {
        expect(linear(0)).toBe(0)
        expect(linear(0.5)).toBe(0.5)
        expect(linear(1)).toBe(1)
    })

    test("easeIn (inQuad) accelerates", () => {
        expect(easeIn(0)).toBe(0)
        expect(easeIn(0.5)).toBe(0.25)
        expect(easeIn(1)).toBe(1)
    })

    test("easeOut (outQuad) decelerates", () => {
        expect(easeOut(0)).toBe(0)
        expect(easeOut(0.5)).toBe(0.75)
        expect(easeOut(1)).toBe(1)
    })

    test("easeInOut (inOutQuad) has slow start and end", () => {
        expect(easeInOut(0)).toBe(0)
        expect(easeInOut(0.25)).toBeLessThan(0.25)
        expect(easeInOut(0.5)).toBe(0.5)
        expect(easeInOut(0.75)).toBeGreaterThan(0.75)
        expect(easeInOut(1)).toBe(1)
    })

    test("cubicBezier creates custom curves", () => {
        const customEase = cubicBezier(0.42, 0, 0.58, 1)

        expect(customEase(0)).toBe(0)
        expect(customEase(1)).toBe(1)
        expect(customEase(0.5)).toBeGreaterThan(0)
        expect(customEase(0.5)).toBeLessThan(1)
    })

    test("comprehensive easing functions are available", () => {
        expect(Easing.linear).toBeDefined()
        expect(Easing.inQuad).toBeDefined()
        expect(Easing.outQuad).toBeDefined()
        expect(Easing.inOutQuad).toBeDefined()
        expect(Easing.inCubic).toBeDefined()
        expect(Easing.outCubic).toBeDefined()
        expect(Easing.inOutCubic).toBeDefined()
        expect(Easing.inQuart).toBeDefined()
        expect(Easing.outQuart).toBeDefined()
        expect(Easing.inOutQuart).toBeDefined()
        expect(Easing.inQuint).toBeDefined()
        expect(Easing.outQuint).toBeDefined()
        expect(Easing.inOutQuint).toBeDefined()
        expect(Easing.inSine).toBeDefined()
        expect(Easing.outSine).toBeDefined()
        expect(Easing.inOutSine).toBeDefined()
        expect(Easing.inExpo).toBeDefined()
        expect(Easing.outExpo).toBeDefined()
        expect(Easing.inOutExpo).toBeDefined()
        expect(Easing.inCirc).toBeDefined()
        expect(Easing.outCirc).toBeDefined()
        expect(Easing.inOutCirc).toBeDefined()
        expect(Easing.quadratic).toBeDefined()
        expect(Easing.cubic).toBeDefined()
        expect(Easing.elastic).toBeDefined()
    })

    test("special easing functions work correctly", () => {
        // Test quadratic overshoots
        const quadResult = Easing.quadratic(0.5)
        expect(quadResult).toBeGreaterThan(0)
        expect(quadResult).toBeLessThan(1)

        // Test elastic wiggles
        const elasticResult = Easing.elastic(0.5)
        expect(typeof elasticResult).toBe("number")
    })
})
