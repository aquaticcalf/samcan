import { describe, it, expect } from "bun:test"
import { BatchManager } from "../core/renderer/batchmanager"
import { Path } from "../core/math/path"
import { Paint } from "../core/math/paint"
import { Color } from "../core/math/color"
import { Matrix } from "../core/math/matrix"

describe("BatchManager", () => {
    it("should batch operations with the same paint", () => {
        const batchManager = new BatchManager()
        const path1 = new Path()
        path1.moveTo(0, 0)
        path1.lineTo(100, 100)

        const path2 = new Path()
        path2.moveTo(50, 50)
        path2.lineTo(150, 150)

        const paint = Paint.solid(new Color(1, 0, 0, 1))
        const transform = new Matrix()

        batchManager.addOperation({
            type: "path",
            path: path1,
            paint,
            transform,
            opacity: 1.0,
        })

        batchManager.addOperation({
            type: "path",
            path: path2,
            paint,
            transform,
            opacity: 1.0,
        })

        expect(batchManager.batchCount).toBe(1)
        expect(batchManager.operationCount).toBe(2)

        const batches = batchManager.flush()
        expect(batches.length).toBe(1)
        expect(batches[0]?.operations.length).toBe(2)
    })

    it("should create separate batches for different paints", () => {
        const batchManager = new BatchManager()
        const path1 = new Path()
        path1.moveTo(0, 0)
        path1.lineTo(100, 100)

        const path2 = new Path()
        path2.moveTo(50, 50)
        path2.lineTo(150, 150)

        const paint1 = Paint.solid(new Color(1, 0, 0, 1))
        const paint2 = Paint.solid(new Color(0, 1, 0, 1))
        const transform = new Matrix()

        batchManager.addOperation({
            type: "path",
            path: path1,
            paint: paint1,
            transform,
            opacity: 1.0,
        })

        batchManager.addOperation({
            type: "path",
            path: path2,
            paint: paint2,
            transform,
            opacity: 1.0,
        })

        expect(batchManager.batchCount).toBe(2)
        expect(batchManager.operationCount).toBe(2)

        const batches = batchManager.flush()
        expect(batches.length).toBe(2)
        expect(batches[0]?.operations.length).toBe(1)
        expect(batches[1]?.operations.length).toBe(1)
    })

    it("should batch operations with different blend modes separately", () => {
        const batchManager = new BatchManager()
        const path1 = new Path()
        path1.moveTo(0, 0)
        path1.lineTo(100, 100)

        const path2 = new Path()
        path2.moveTo(50, 50)
        path2.lineTo(150, 150)

        const paint1 = Paint.solid(new Color(1, 0, 0, 1), "normal")
        const paint2 = Paint.solid(new Color(1, 0, 0, 1), "multiply")
        const transform = new Matrix()

        batchManager.addOperation({
            type: "path",
            path: path1,
            paint: paint1,
            transform,
            opacity: 1.0,
        })

        batchManager.addOperation({
            type: "path",
            path: path2,
            paint: paint2,
            transform,
            opacity: 1.0,
        })

        expect(batchManager.batchCount).toBe(2)
    })

    it("should clear all batches", () => {
        const batchManager = new BatchManager()
        const path = new Path()
        path.moveTo(0, 0)
        path

        const paint = Paint.solid(new Color(1, 0, 0, 1))
        const transform = new Matrix()

        batchManager.addOperation({
            type: "path",
            path,
            paint,
            transform,
            opacity: 1.0,
        })

        expect(batchManager.batchCount).toBe(1)

        batchManager.clear()

        expect(batchManager.batchCount).toBe(0)
        expect(batchManager.operationCount).toBe(0)
    })

    it("should handle enabling and disabling batching", () => {
        const batchManager = new BatchManager()
        const path = new Path()
        path.moveTo(0, 0)
        path.lineTo(100, 100)

        const paint = Paint.solid(new Color(1, 0, 0, 1))
        const transform = new Matrix()

        expect(batchManager.isEnabled).toBe(true)

        batchManager.addOperation({
            type: "path",
            path,
            paint,
            transform,
            opacity: 1.0,
        })

        expect(batchManager.batchCount).toBe(1)

        batchManager.setEnabled(false)
        expect(batchManager.isEnabled).toBe(false)
        expect(batchManager.batchCount).toBe(0)

        batchManager.addOperation({
            type: "path",
            path,
            paint,
            transform,
            opacity: 1.0,
        })

        expect(batchManager.batchCount).toBe(0)
    })

    it("should batch stroke operations", () => {
        const batchManager = new BatchManager()
        const path1 = new Path()
        path1.moveTo(0, 0)
        path1.lineTo(100, 100)

        const path2 = new Path()
        path2.moveTo(50, 50)
        path2.lineTo(150, 150)

        const paint = Paint.solid(new Color(1, 0, 0, 1))
        const transform = new Matrix()

        batchManager.addOperation({
            type: "stroke",
            path: path1,
            paint,
            transform,
            opacity: 1.0,
            strokeWidth: 2,
        })

        batchManager.addOperation({
            type: "stroke",
            path: path2,
            paint,
            transform,
            opacity: 1.0,
            strokeWidth: 2,
        })

        expect(batchManager.batchCount).toBe(1)
        expect(batchManager.operationCount).toBe(2)
    })
})
