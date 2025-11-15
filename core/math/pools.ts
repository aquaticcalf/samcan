import { Color } from "./color"
import { Matrix } from "./matrix"
import { ObjectPool, type PoolStats } from "./pool"
import { Vector2 } from "./vector2"

/**
 * Global Vector2 object pool
 */
export const Vector2Pool = new ObjectPool<Vector2>(
    () => new Vector2(),
    (v) => v.set(0, 0),
    50, // Initial size
    500, // Max size
)

/**
 * Global Matrix object pool
 */
export const MatrixPool = new ObjectPool<Matrix>(
    () => new Matrix(),
    (m) => {
        m.a = 1
        m.b = 0
        m.c = 0
        m.d = 1
        m.tx = 0
        m.ty = 0
    },
    20, // Initial size
    200, // Max size
)

/**
 * Global Color object pool
 */
export const ColorPool = new ObjectPool<Color>(
    () => new Color(),
    (c) => {
        c.r = 0
        c.g = 0
        c.b = 0
        c.a = 1
    },
    20, // Initial size
    200, // Max size
)

/**
 * Get statistics for all pools
 */
export function getAllPoolStats(): {
    vector2: PoolStats
    matrix: PoolStats
    color: PoolStats
} {
    return {
        vector2: Vector2Pool.getStats(),
        matrix: MatrixPool.getStats(),
        color: ColorPool.getStats(),
    }
}

/**
 * Clear all pools
 */
export function clearAllPools(): void {
    Vector2Pool.clear()
    MatrixPool.clear()
    ColorPool.clear()
}
