import { describe, expect, test } from "bun:test"
import {
    ColorPool,
    MatrixPool,
    ObjectPool,
    Vector2Pool,
    clearAllPools,
    getAllPoolStats,
} from "../core/math"
import { Color } from "../core/math/color"
import { Matrix } from "../core/math/matrix"
import { Vector2 } from "../core/math/vector2"

describe("ObjectPool", () => {
    test("should create pool with initial size", () => {
        const pool = new ObjectPool<Vector2>(
            () => new Vector2(),
            (v) => v.set(0, 0),
            5,
        )

        const stats = pool.getStats()
        expect(stats.available).toBe(5)
        expect(stats.totalCreated).toBe(0)
    })

    test("should acquire objects from pool", () => {
        const pool = new ObjectPool<Vector2>(
            () => new Vector2(),
            (v) => v.set(0, 0),
            3,
        )

        const v1 = pool.acquire()
        const v2 = pool.acquire()

        expect(v1).toBeInstanceOf(Vector2)
        expect(v2).toBeInstanceOf(Vector2)
        expect(pool.inUseCount).toBe(2)
        expect(pool.size).toBe(1)
    })

    test("should release objects back to pool", () => {
        const pool = new ObjectPool<Vector2>(
            () => new Vector2(),
            (v) => v.set(0, 0),
            2,
        )

        const v1 = pool.acquire()
        v1.set(10, 20)

        pool.release(v1)

        expect(pool.inUseCount).toBe(0)
        expect(pool.size).toBe(2)

        // Verify object was reset
        const v2 = pool.acquire()
        expect(v2.x).toBe(0)
        expect(v2.y).toBe(0)
    })

    test("should create new objects when pool is empty", () => {
        const pool = new ObjectPool<Vector2>(
            () => new Vector2(),
            (v) => v.set(0, 0),
            1,
        )

        const v1 = pool.acquire()
        const v2 = pool.acquire()

        const stats = pool.getStats()
        expect(stats.totalCreated).toBe(1)
        expect(stats.inUse).toBe(2)
    })

    test("should respect max size limit", () => {
        const pool = new ObjectPool<Vector2>(
            () => new Vector2(),
            (v) => v.set(0, 0),
            1,
            2,
        )

        const objects = [pool.acquire(), pool.acquire(), pool.acquire()]

        // Release all objects
        for (const obj of objects) {
            pool.release(obj)
        }

        // Pool should only keep maxSize objects
        expect(pool.size).toBe(2)
    })

    test("should track statistics correctly", () => {
        const pool = new ObjectPool<Vector2>(
            () => new Vector2(),
            (v) => v.set(0, 0),
            2,
        )

        pool.acquire()
        pool.acquire()
        const v3 = pool.acquire()

        const stats = pool.getStats()
        expect(stats.totalAcquired).toBe(3)
        expect(stats.totalCreated).toBe(1)
        expect(stats.inUse).toBe(3)

        pool.release(v3)

        const stats2 = pool.getStats()
        expect(stats2.totalReleased).toBe(1)
        expect(stats2.inUse).toBe(2)
    })

    test("should calculate hit rate correctly", () => {
        const pool = new ObjectPool<Vector2>(
            () => new Vector2(),
            (v) => v.set(0, 0),
            5,
        )

        // Acquire and release to test hit rate
        const v1 = pool.acquire()
        pool.release(v1)
        pool.acquire() // This should reuse v1

        const stats = pool.getStats()
        expect(stats.hitRate).toBeGreaterThan(0)
    })

    test("should clear pool", () => {
        const pool = new ObjectPool<Vector2>(
            () => new Vector2(),
            (v) => v.set(0, 0),
            5,
        )

        pool.acquire()
        pool.clear()

        expect(pool.size).toBe(0)
        expect(pool.inUseCount).toBe(0)
    })
})

describe("Vector2Pool", () => {
    test("should acquire and release Vector2 objects", () => {
        clearAllPools()

        const v1 = Vector2Pool.acquire()
        v1.set(5, 10)

        expect(v1.x).toBe(5)
        expect(v1.y).toBe(10)

        Vector2Pool.release(v1)

        const v2 = Vector2Pool.acquire()
        expect(v2.x).toBe(0)
        expect(v2.y).toBe(0)
    })

    test("should handle setFrom method", () => {
        const v1 = new Vector2(3, 4)
        const v2 = Vector2Pool.acquire()

        v2.setFrom(v1)

        expect(v2.x).toBe(3)
        expect(v2.y).toBe(4)

        Vector2Pool.release(v2)
    })
})

describe("MatrixPool", () => {
    test("should acquire and release Matrix objects", () => {
        clearAllPools()

        const m1 = MatrixPool.acquire()
        m1.a = 2
        m1.tx = 10

        expect(m1.a).toBe(2)
        expect(m1.tx).toBe(10)

        MatrixPool.release(m1)

        const m2 = MatrixPool.acquire()
        expect(m2.a).toBe(1)
        expect(m2.tx).toBe(0)
        expect(m2.isIdentity()).toBe(true)
    })

    test("should handle setFrom method", () => {
        const m1 = Matrix.translate(5, 10)
        const m2 = MatrixPool.acquire()

        m2.setFrom(m1)

        expect(m2.tx).toBe(5)
        expect(m2.ty).toBe(10)

        MatrixPool.release(m2)
    })

    test("should handle setIdentity method", () => {
        const m = MatrixPool.acquire()
        m.a = 2
        m.tx = 10

        m.setIdentity()

        expect(m.isIdentity()).toBe(true)

        MatrixPool.release(m)
    })
})

describe("ColorPool", () => {
    test("should acquire and release Color objects", () => {
        clearAllPools()

        const c1 = ColorPool.acquire()
        c1.set(1, 0.5, 0.25, 0.8)

        expect(c1.r).toBe(1)
        expect(c1.g).toBe(0.5)
        expect(c1.b).toBe(0.25)
        expect(c1.a).toBe(0.8)

        ColorPool.release(c1)

        const c2 = ColorPool.acquire()
        expect(c2.r).toBe(0)
        expect(c2.g).toBe(0)
        expect(c2.b).toBe(0)
        expect(c2.a).toBe(1)
    })

    test("should handle setFrom method", () => {
        const c1 = new Color(0.5, 0.6, 0.7, 0.9)
        const c2 = ColorPool.acquire()

        c2.setFrom(c1)

        expect(c2.r).toBe(0.5)
        expect(c2.g).toBe(0.6)
        expect(c2.b).toBe(0.7)
        expect(c2.a).toBe(0.9)

        ColorPool.release(c2)
    })
})

describe("Pool Statistics", () => {
    test("should get statistics for all pools", () => {
        clearAllPools()

        Vector2Pool.acquire()
        MatrixPool.acquire()
        ColorPool.acquire()

        const stats = getAllPoolStats()

        expect(stats.vector2.inUse).toBe(1)
        expect(stats.matrix.inUse).toBe(1)
        expect(stats.color.inUse).toBe(1)
    })

    test("should clear all pools", () => {
        Vector2Pool.acquire()
        MatrixPool.acquire()
        ColorPool.acquire()

        clearAllPools()

        const stats = getAllPoolStats()

        expect(stats.vector2.available).toBe(0)
        expect(stats.matrix.available).toBe(0)
        expect(stats.color.available).toBe(0)
    })
})
