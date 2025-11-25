/**
 * Tests to verify fast-check setup and custom arbitraries work correctly
 */

import { describe, test, expect } from "bun:test"
import * as fc from "fast-check"
import {
    arbVector2,
    arbRectangle,
    arbTransform,
    arbViewportState,
    arbSceneNode,
    arbShapeNode,
    arbArtboard,
    arbScene,
    approxEqual,
    vectorApproxEqual,
} from "./editor-arbitraries"
import { Vector2 } from "../core/math/vector2"

describe("fast-check setup", () => {
    test("fast-check is installed and working", () => {
        fc.assert(
            fc.property(fc.integer(), fc.integer(), (a, b) => {
                return a + b === b + a // commutativity
            }),
            { numRuns: 100 },
        )
    })
})

describe("math arbitraries", () => {
    test("arbVector2 generates valid Vector2 instances", () => {
        fc.assert(
            fc.property(arbVector2(), (v) => {
                return (
                    v instanceof Vector2 &&
                    typeof v.x === "number" &&
                    typeof v.y === "number" &&
                    !Number.isNaN(v.x) &&
                    !Number.isNaN(v.y)
                )
            }),
            { numRuns: 100 },
        )
    })

    test("arbRectangle generates valid rectangles with positive dimensions", () => {
        fc.assert(
            fc.property(arbRectangle(), (r) => {
                return (
                    r.width > 0 &&
                    r.height > 0 &&
                    !Number.isNaN(r.x) &&
                    !Number.isNaN(r.y)
                )
            }),
            { numRuns: 100 },
        )
    })

    test("arbTransform generates valid transforms", () => {
        fc.assert(
            fc.property(arbTransform, (t) => {
                return (
                    t.scale.x > 0 &&
                    t.scale.y > 0 &&
                    !Number.isNaN(t.position.x) &&
                    !Number.isNaN(t.rotation)
                )
            }),
            { numRuns: 100 },
        )
    })
})

describe("viewport arbitraries", () => {
    test("arbViewportState generates valid viewport states", () => {
        fc.assert(
            fc.property(arbViewportState, (v) => {
                return (
                    v.zoom >= 0.1 &&
                    v.zoom <= 10 &&
                    typeof v.showGrid === "boolean" &&
                    typeof v.snapEnabled === "boolean"
                )
            }),
            { numRuns: 100 },
        )
    })
})

describe("scene node arbitraries", () => {
    test("arbSceneNode generates valid scene nodes", () => {
        fc.assert(
            fc.property(arbSceneNode, (node) => {
                return node.transform !== undefined && node.visible === true
            }),
            { numRuns: 100 },
        )
    })

    test("arbShapeNode generates valid shape nodes with paths", () => {
        fc.assert(
            fc.property(arbShapeNode, (node) => {
                return (
                    node.path !== undefined &&
                    node.path.commands.length > 0 &&
                    node.transform !== undefined
                )
            }),
            { numRuns: 100 },
        )
    })

    test("arbArtboard generates valid artboards", () => {
        fc.assert(
            fc.property(arbArtboard, (artboard) => {
                return artboard.width >= 100 && artboard.height >= 100
            }),
            { numRuns: 100 },
        )
    })

    test("arbScene generates artboard with child nodes", () => {
        fc.assert(
            fc.property(arbScene, ({ artboard, nodes }) => {
                return (
                    artboard.children.length === nodes.length &&
                    nodes.every((n) => n.parent === artboard)
                )
            }),
            { numRuns: 50 },
        )
    })
})

describe("utility functions", () => {
    test("approxEqual works correctly", () => {
        expect(approxEqual(1.0, 1.0)).toBe(true)
        expect(approxEqual(1.0, 1.00001)).toBe(true)
        expect(approxEqual(1.0, 1.001)).toBe(false)
    })

    test("vectorApproxEqual works correctly", () => {
        const v1 = new Vector2(1, 2)
        const v2 = new Vector2(1.00001, 2.00001)
        const v3 = new Vector2(1.1, 2)
        expect(vectorApproxEqual(v1, v2)).toBe(true)
        expect(vectorApproxEqual(v1, v3)).toBe(false)
    })
})
