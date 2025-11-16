import { describe, expect, test } from "bun:test"
import { Vector2 } from "../core/math/vector2"
import { Matrix } from "../core/math/matrix"
import { Color } from "../core/math/color"
import {
    lerp,
    clamp,
    map,
    approximately,
    degToRad,
    radToDeg,
    normalizeAngle,
    angleDelta,
    smoothstep,
    smootherstep,
    inverseLerp,
    pingPong,
    repeat,
    sign,
    cubicBezierInterpolate,
    quadraticBezier,
} from "../core/math/utils"

describe("Vector2", () => {
    describe("construction and static methods", () => {
        test("creates vector with default values", () => {
            const v = new Vector2()
            expect(v.x).toBe(0)
            expect(v.y).toBe(0)
        })

        test("creates vector with specified values", () => {
            const v = new Vector2(3, 4)
            expect(v.x).toBe(3)
            expect(v.y).toBe(4)
        })

        test("creates zero vector", () => {
            const v = Vector2.zero()
            expect(v.x).toBe(0)
            expect(v.y).toBe(0)
        })

        test("creates one vector", () => {
            const v = Vector2.one()
            expect(v.x).toBe(1)
            expect(v.y).toBe(1)
        })

        test("creates right vector", () => {
            const v = Vector2.right()
            expect(v.x).toBe(1)
            expect(v.y).toBe(0)
        })

        test("creates up vector", () => {
            const v = Vector2.up()
            expect(v.x).toBe(0)
            expect(v.y).toBe(1)
        })
    })

    describe("arithmetic operations", () => {
        test("adds two vectors", () => {
            const v1 = new Vector2(1, 2)
            const v2 = new Vector2(3, 4)
            const result = v1.add(v2)
            expect(result.x).toBe(4)
            expect(result.y).toBe(6)
        })

        test("subtracts two vectors", () => {
            const v1 = new Vector2(5, 7)
            const v2 = new Vector2(2, 3)
            const result = v1.subtract(v2)
            expect(result.x).toBe(3)
            expect(result.y).toBe(4)
        })

        test("multiplies vector by scalar", () => {
            const v = new Vector2(2, 3)
            const result = v.multiply(3)
            expect(result.x).toBe(6)
            expect(result.y).toBe(9)
        })

        test("divides vector by scalar", () => {
            const v = new Vector2(6, 9)
            const result = v.divide(3)
            expect(result.x).toBe(2)
            expect(result.y).toBe(3)
        })

        test("calculates dot product", () => {
            const v1 = new Vector2(2, 3)
            const v2 = new Vector2(4, 5)
            const result = v1.dot(v2)
            expect(result).toBe(23) // 2*4 + 3*5 = 8 + 15 = 23
        })
    })

    describe("length and distance", () => {
        test("calculates length", () => {
            const v = new Vector2(3, 4)
            expect(v.length()).toBe(5)
        })

        test("calculates squared length", () => {
            const v = new Vector2(3, 4)
            expect(v.lengthSquared()).toBe(25)
        })

        test("normalizes vector", () => {
            const v = new Vector2(3, 4)
            const normalized = v.normalize()
            expect(normalized.length()).toBeCloseTo(1, 5)
            expect(normalized.x).toBeCloseTo(0.6, 5)
            expect(normalized.y).toBeCloseTo(0.8, 5)
        })

        test("handles zero vector normalization", () => {
            const v = new Vector2(0, 0)
            const normalized = v.normalize()
            expect(normalized.x).toBe(0)
            expect(normalized.y).toBe(0)
        })

        test("calculates distance between vectors", () => {
            const v1 = new Vector2(0, 0)
            const v2 = new Vector2(3, 4)
            expect(v1.distance(v2)).toBe(5)
        })

        test("calculates squared distance", () => {
            const v1 = new Vector2(0, 0)
            const v2 = new Vector2(3, 4)
            expect(v1.distanceSquared(v2)).toBe(25)
        })
    })

    describe("utility methods", () => {
        test("clones vector", () => {
            const v1 = new Vector2(5, 10)
            const v2 = v1.clone()
            expect(v2.x).toBe(5)
            expect(v2.y).toBe(10)
            expect(v2).not.toBe(v1)
        })

        test("checks equality", () => {
            const v1 = new Vector2(1, 2)
            const v2 = new Vector2(1, 2)
            const v3 = new Vector2(1.0001, 2.0001)
            expect(v1.equals(v2)).toBe(true)
            expect(v1.equals(v3)).toBe(false)
            expect(v1.equals(v3, 0.001)).toBe(true)
        })

        test("sets components", () => {
            const v = new Vector2()
            v.set(7, 8)
            expect(v.x).toBe(7)
            expect(v.y).toBe(8)
        })

        test("sets from another vector", () => {
            const v1 = new Vector2(3, 4)
            const v2 = new Vector2()
            v2.setFrom(v1)
            expect(v2.x).toBe(3)
            expect(v2.y).toBe(4)
        })

        test("lerps between vectors", () => {
            const v1 = new Vector2(0, 0)
            const v2 = new Vector2(10, 20)
            const result = v1.lerp(v2, 0.5)
            expect(result.x).toBe(5)
            expect(result.y).toBe(10)
        })
    })
})

describe("Matrix", () => {
    describe("construction and static methods", () => {
        test("creates identity matrix by default", () => {
            const m = new Matrix()
            expect(m.a).toBe(1)
            expect(m.b).toBe(0)
            expect(m.c).toBe(0)
            expect(m.d).toBe(1)
            expect(m.tx).toBe(0)
            expect(m.ty).toBe(0)
        })

        test("creates matrix with specified values", () => {
            const m = new Matrix(2, 0, 0, 2, 10, 20)
            expect(m.a).toBe(2)
            expect(m.d).toBe(2)
            expect(m.tx).toBe(10)
            expect(m.ty).toBe(20)
        })

        test("creates identity matrix", () => {
            const m = Matrix.identity()
            expect(m.isIdentity()).toBe(true)
        })

        test("creates translation matrix", () => {
            const m = Matrix.translate(5, 10)
            expect(m.tx).toBe(5)
            expect(m.ty).toBe(10)
            expect(m.a).toBe(1)
            expect(m.d).toBe(1)
        })

        test("creates scale matrix", () => {
            const m = Matrix.scale(2, 3)
            expect(m.a).toBe(2)
            expect(m.d).toBe(3)
        })

        test("creates uniform scale matrix", () => {
            const m = Matrix.scale(2)
            expect(m.a).toBe(2)
            expect(m.d).toBe(2)
        })

        test("creates rotation matrix", () => {
            const m = Matrix.rotate(Math.PI / 2)
            expect(m.a).toBeCloseTo(0, 5)
            expect(m.b).toBeCloseTo(1, 5)
            expect(m.c).toBeCloseTo(-1, 5)
            expect(m.d).toBeCloseTo(0, 5)
        })

        test("creates matrix from TRS", () => {
            const translation = new Vector2(10, 20)
            const rotation = Math.PI / 4
            const scale = new Vector2(2, 2)
            const m = Matrix.fromTRS(translation, rotation, scale)

            expect(m.tx).toBe(10)
            expect(m.ty).toBe(20)
            expect(m.a).toBeCloseTo(Math.SQRT2, 5)
            expect(m.d).toBeCloseTo(Math.SQRT2, 5)
        })
    })

    describe("matrix operations", () => {
        test("multiplies two matrices", () => {
            const m1 = Matrix.translate(5, 10)
            const m2 = Matrix.scale(2, 2)
            const result = m1.multiply(m2)

            expect(result.a).toBe(2)
            expect(result.d).toBe(2)
            expect(result.tx).toBe(5)
            expect(result.ty).toBe(10)
        })

        test("calculates determinant", () => {
            const m = new Matrix(2, 0, 0, 3, 0, 0)
            expect(m.determinant()).toBe(6)
        })

        test("inverts matrix", () => {
            const m = Matrix.translate(5, 10)
            const inv = m.invert()
            const identity = m.multiply(inv)

            expect(identity.isIdentity()).toBe(true)
        })

        test("handles non-invertible matrix", () => {
            const m = new Matrix(0, 0, 0, 0, 0, 0)
            const inv = m.invert()
            expect(inv.isIdentity()).toBe(true)
        })

        test("transforms point", () => {
            const m = Matrix.translate(5, 10)
            const p = new Vector2(2, 3)
            const result = m.transformPoint(p)

            expect(result.x).toBe(7)
            expect(result.y).toBe(13)
        })

        test("transforms vector without translation", () => {
            const m = Matrix.translate(5, 10).multiply(Matrix.scale(2, 2))
            const v = new Vector2(3, 4)
            const result = m.transformVector(v)

            expect(result.x).toBe(6)
            expect(result.y).toBe(8)
        })
    })

    describe("matrix composition", () => {
        test("appends translation", () => {
            const m = Matrix.identity()
            const result = m.appendTranslation(5, 10)
            expect(result.tx).toBe(5)
            expect(result.ty).toBe(10)
        })

        test("appends rotation", () => {
            const m = Matrix.identity()
            const result = m.appendRotation(Math.PI / 2)
            expect(result.a).toBeCloseTo(0, 5)
            expect(result.b).toBeCloseTo(1, 5)
        })

        test("appends scale", () => {
            const m = Matrix.identity()
            const result = m.appendScale(2, 3)
            expect(result.a).toBe(2)
            expect(result.d).toBe(3)
        })

        test("prepends translation", () => {
            const m = Matrix.scale(2, 2)
            const result = m.prependTranslation(5, 10)
            expect(result.tx).toBe(5)
            expect(result.ty).toBe(10)
        })

        test("prepends rotation", () => {
            const m = Matrix.translate(10, 0)
            const result = m.prependRotation(Math.PI / 2)
            expect(result.tx).toBeCloseTo(0, 5)
            expect(result.ty).toBeCloseTo(10, 5)
        })

        test("prepends scale", () => {
            const m = Matrix.translate(5, 10)
            const result = m.prependScale(2, 2)
            expect(result.tx).toBe(10)
            expect(result.ty).toBe(20)
        })
    })

    describe("utility methods", () => {
        test("clones matrix", () => {
            const m1 = new Matrix(2, 0, 0, 2, 5, 10)
            const m2 = m1.clone()
            expect(m2.a).toBe(2)
            expect(m2.tx).toBe(5)
            expect(m2).not.toBe(m1)
        })

        test("checks equality", () => {
            const m1 = new Matrix(1, 0, 0, 1, 5, 10)
            const m2 = new Matrix(1, 0, 0, 1, 5, 10)
            const m3 = new Matrix(1, 0, 0, 1, 5.0001, 10.0001)

            expect(m1.equals(m2)).toBe(true)
            expect(m1.equals(m3)).toBe(false)
            expect(m1.equals(m3, 0.01)).toBe(true)
        })

        test("checks if identity", () => {
            const m1 = Matrix.identity()
            const m2 = Matrix.translate(1, 0)

            expect(m1.isIdentity()).toBe(true)
            expect(m2.isIdentity()).toBe(false)
        })

        test("sets from another matrix", () => {
            const m1 = new Matrix(2, 0, 0, 2, 5, 10)
            const m2 = new Matrix()
            m2.setFrom(m1)

            expect(m2.a).toBe(2)
            expect(m2.tx).toBe(5)
        })

        test("sets to identity", () => {
            const m = new Matrix(2, 0, 0, 2, 5, 10)
            m.setIdentity()
            expect(m.isIdentity()).toBe(true)
        })
    })
})

describe("Color", () => {
    describe("construction and static methods", () => {
        test("creates color with default values", () => {
            const c = new Color()
            expect(c.r).toBe(0)
            expect(c.g).toBe(0)
            expect(c.b).toBe(0)
            expect(c.a).toBe(1)
        })

        test("creates color with specified values", () => {
            const c = new Color(0.5, 0.6, 0.7, 0.8)
            expect(c.r).toBe(0.5)
            expect(c.g).toBe(0.6)
            expect(c.b).toBe(0.7)
            expect(c.a).toBe(0.8)
        })

        test("clamps values to 0-1 range", () => {
            const c = new Color(1.5, -0.5, 0.5, 2)
            expect(c.r).toBe(1)
            expect(c.g).toBe(0)
            expect(c.b).toBe(0.5)
            expect(c.a).toBe(1)
        })

        test("creates color from RGB", () => {
            const c = Color.fromRGB(255, 128, 64, 128)
            expect(c.r).toBeCloseTo(1, 5)
            expect(c.g).toBeCloseTo(0.502, 2)
            expect(c.b).toBeCloseTo(0.251, 2)
            expect(c.a).toBeCloseTo(0.502, 2)
        })

        test("creates color from hex", () => {
            const c = Color.fromHex("#ff8040")
            expect(c.r).toBeCloseTo(1, 5)
            expect(c.g).toBeCloseTo(0.502, 2)
            expect(c.b).toBeCloseTo(0.251, 2)
            expect(c.a).toBe(1)
        })

        test("creates color from hex with alpha", () => {
            const c = Color.fromHex("#ff804080")
            expect(c.r).toBeCloseTo(1, 5)
            expect(c.a).toBeCloseTo(0.502, 2)
        })

        test("creates predefined colors", () => {
            expect(Color.white().equals(new Color(1, 1, 1, 1))).toBe(true)
            expect(Color.black().equals(new Color(0, 0, 0, 1))).toBe(true)
            expect(Color.red().equals(new Color(1, 0, 0, 1))).toBe(true)
            expect(Color.green().equals(new Color(0, 1, 0, 1))).toBe(true)
            expect(Color.blue().equals(new Color(0, 0, 1, 1))).toBe(true)
            expect(Color.transparent().equals(new Color(0, 0, 0, 0))).toBe(true)
        })
    })

    describe("conversion methods", () => {
        test("converts to RGBA string", () => {
            const c = new Color(1, 0.5, 0.25, 0.8)
            expect(c.toRGBA()).toBe("rgba(255, 128, 64, 0.8)")
        })

        test("converts to hex string", () => {
            const c = Color.fromRGB(255, 128, 64)
            expect(c.toHex()).toBe("#ff8040")
        })

        test("converts to hex string with alpha", () => {
            const c = Color.fromRGB(255, 128, 64, 128)
            expect(c.toHex()).toBe("#ff804080")
        })
    })

    describe("utility methods", () => {
        test("lerps between colors", () => {
            const c1 = new Color(0, 0, 0, 1)
            const c2 = new Color(1, 1, 1, 1)
            const result = c1.lerp(c2, 0.5)

            expect(result.r).toBeCloseTo(0.5, 5)
            expect(result.g).toBeCloseTo(0.5, 5)
            expect(result.b).toBeCloseTo(0.5, 5)
        })

        test("clones color", () => {
            const c1 = new Color(0.5, 0.6, 0.7, 0.8)
            const c2 = c1.clone()

            expect(c2.r).toBe(0.5)
            expect(c2.g).toBe(0.6)
            expect(c2).not.toBe(c1)
        })

        test("checks equality", () => {
            const c1 = new Color(0.5, 0.6, 0.7, 0.8)
            const c2 = new Color(0.5, 0.6, 0.7, 0.8)
            const c3 = new Color(0.5002, 0.6002, 0.7002, 0.8002)

            expect(c1.equals(c2)).toBe(true)
            expect(c1.equals(c3)).toBe(false)
            expect(c1.equals(c3, 0.01)).toBe(true)
        })

        test("sets from another color", () => {
            const c1 = new Color(0.5, 0.6, 0.7, 0.8)
            const c2 = new Color()
            c2.setFrom(c1)

            expect(c2.r).toBe(0.5)
            expect(c2.g).toBe(0.6)
        })

        test("sets components", () => {
            const c = new Color()
            c.set(0.5, 0.6, 0.7, 0.8)

            expect(c.r).toBe(0.5)
            expect(c.g).toBe(0.6)
            expect(c.b).toBe(0.7)
            expect(c.a).toBe(0.8)
        })

        test("clamps values when setting", () => {
            const c = new Color()
            c.set(1.5, -0.5, 0.5, 2)

            expect(c.r).toBe(1)
            expect(c.g).toBe(0)
            expect(c.b).toBe(0.5)
            expect(c.a).toBe(1)
        })
    })
})

describe("Math Utils", () => {
    describe("interpolation functions", () => {
        test("lerp interpolates linearly", () => {
            expect(lerp(0, 10, 0)).toBe(0)
            expect(lerp(0, 10, 0.5)).toBe(5)
            expect(lerp(0, 10, 1)).toBe(10)
        })

        test("inverseLerp finds t value", () => {
            expect(inverseLerp(0, 10, 5)).toBe(0.5)
            expect(inverseLerp(0, 100, 25)).toBe(0.25)
        })

        test("smoothstep provides smooth interpolation", () => {
            const result = smoothstep(0, 1, 0.5)
            expect(result).toBe(0.5)
            expect(smoothstep(0, 1, 0)).toBe(0)
            expect(smoothstep(0, 1, 1)).toBe(1)
        })

        test("smootherstep provides smoother interpolation", () => {
            const result = smootherstep(0, 1, 0.5)
            expect(result).toBe(0.5)
            expect(smootherstep(0, 1, 0)).toBe(0)
            expect(smootherstep(0, 1, 1)).toBe(1)
        })

        test("quadraticBezier interpolates correctly", () => {
            expect(quadraticBezier(0, 0, 5, 10)).toBe(0)
            expect(quadraticBezier(1, 0, 5, 10)).toBe(10)
            expect(quadraticBezier(0.5, 0, 5, 10)).toBe(5)
        })

        test("cubicBezierInterpolate interpolates correctly", () => {
            expect(cubicBezierInterpolate(0, 0, 3, 7, 10)).toBe(0)
            expect(cubicBezierInterpolate(1, 0, 3, 7, 10)).toBe(10)
        })
    })

    describe("clamping and mapping", () => {
        test("clamp restricts value to range", () => {
            expect(clamp(5, 0, 10)).toBe(5)
            expect(clamp(-5, 0, 10)).toBe(0)
            expect(clamp(15, 0, 10)).toBe(10)
        })

        test("map transforms value between ranges", () => {
            expect(map(5, 0, 10, 0, 100)).toBe(50)
            expect(map(0, 0, 10, 0, 100)).toBe(0)
            expect(map(10, 0, 10, 0, 100)).toBe(100)
        })
    })

    describe("angle functions", () => {
        test("degToRad converts degrees to radians", () => {
            expect(degToRad(0)).toBe(0)
            expect(degToRad(180)).toBeCloseTo(Math.PI, 5)
            expect(degToRad(90)).toBeCloseTo(Math.PI / 2, 5)
        })

        test("radToDeg converts radians to degrees", () => {
            expect(radToDeg(0)).toBe(0)
            expect(radToDeg(Math.PI)).toBeCloseTo(180, 5)
            expect(radToDeg(Math.PI / 2)).toBeCloseTo(90, 5)
        })

        test("normalizeAngle normalizes to 0-2π range", () => {
            expect(normalizeAngle(0)).toBe(0)
            expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 5)
            expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo(Math.PI * 1.5, 5)
        })

        test("angleDelta finds shortest angular distance", () => {
            expect(angleDelta(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2, 5)
            expect(angleDelta(0, Math.PI * 1.5)).toBeCloseTo(-Math.PI / 2, 5)
        })
    })

    describe("utility functions", () => {
        test("approximately checks equality with epsilon", () => {
            expect(approximately(1, 1)).toBe(true)
            expect(approximately(1, 1.00001)).toBe(true)
            expect(approximately(1, 1.1)).toBe(false)
            expect(approximately(1, 1.1, 0.2)).toBe(true)
        })

        test("sign returns correct sign", () => {
            expect(sign(5)).toBe(1)
            expect(sign(-5)).toBe(-1)
            expect(sign(0)).toBe(0)
        })

        test("pingPong bounces value", () => {
            expect(pingPong(0, 10)).toBe(0)
            expect(pingPong(10, 10)).toBe(10)
            expect(pingPong(15, 10)).toBe(5)
            expect(pingPong(20, 10)).toBe(0)
        })

        test("repeat wraps value", () => {
            expect(repeat(5, 10)).toBe(5)
            expect(repeat(15, 10)).toBe(5)
            expect(repeat(25, 10)).toBe(5)
        })
    })
})
