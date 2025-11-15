/**
 * Core math and utility types for samcan animation runtime
 */

export { Vector2 } from "./vector2"
export { Rectangle } from "./rectangle"
export { Color } from "./color"
export { Matrix } from "./matrix"
export { Path, type PathCommand } from "./path/index"
export {
    Paint,
    type BlendMode,
    type GradientStop,
    type LinearGradient,
    type RadialGradient,
    type Gradient,
} from "./paint"
export { PathOperations } from "./path/operations"
export * from "./utils"
export { ObjectPool, type PoolStats } from "./pool"
export {
    Vector2Pool,
    MatrixPool,
    ColorPool,
    getAllPoolStats,
    clearAllPools,
} from "./pools"
