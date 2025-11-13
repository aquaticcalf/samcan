/**
 * Common math utility functions
 */

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

/**
 * Map a value from one range to another
 */
export function map(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number,
): number {
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin))
}

/**
 * Check if two numbers are approximately equal
 */
export function approximately(
    a: number,
    b: number,
    epsilon: number = 0.0001,
): boolean {
    return Math.abs(a - b) < epsilon
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
    return degrees * (Math.PI / 180)
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
    return radians * (180 / Math.PI)
}

/**
 * Normalize an angle to the range [0, 2π)
 */
export function normalizeAngle(angle: number): number {
    const twoPi = Math.PI * 2
    return ((angle % twoPi) + twoPi) % twoPi
}

/**
 * Get the shortest angular distance between two angles
 */
export function angleDelta(from: number, to: number): number {
    const delta = normalizeAngle(to - from)
    return delta > Math.PI ? delta - Math.PI * 2 : delta
}

/**
 * Smooth step interpolation (cubic hermite)
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)
}

/**
 * Smoother step interpolation (quintic hermite)
 */
export function smootherstep(edge0: number, edge1: number, x: number): number {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * t * (t * (t * 6 - 15) + 10)
}

/**
 * Inverse lerp - find t for a value between a and b
 */
export function inverseLerp(a: number, b: number, value: number): number {
    return (value - a) / (b - a)
}

/**
 * Ping-pong a value between 0 and length
 */
export function pingPong(t: number, length: number): number {
    t = t % (length * 2)
    return length - Math.abs(t - length)
}

/**
 * Repeat a value within a range
 */
export function repeat(t: number, length: number): number {
    return clamp(t - Math.floor(t / length) * length, 0, length)
}

/**
 * Sign function that returns -1, 0, or 1
 */
export function sign(value: number): number {
    return value > 0 ? 1 : value < 0 ? -1 : 0
}

/**
 * Cubic bezier interpolation
 */
export function cubicBezier(
    t: number,
    p0: number,
    p1: number,
    p2: number,
    p3: number,
): number {
    const oneMinusT = 1 - t
    return (
        oneMinusT * oneMinusT * oneMinusT * p0 +
        3 * oneMinusT * oneMinusT * t * p1 +
        3 * oneMinusT * t * t * p2 +
        t * t * t * p3
    )
}

/**
 * Quadratic bezier interpolation
 */
export function quadraticBezier(
    t: number,
    p0: number,
    p1: number,
    p2: number,
): number {
    const oneMinusT = 1 - t
    return oneMinusT * oneMinusT * p0 + 2 * oneMinusT * t * p1 + t * t * p2
}

/**
 * Ease-in (quadratic)
 */
export function easeIn(t: number): number {
    return t * t
}

/**
 * Ease-out (quadratic)
 */
export function easeOut(t: number): number {
    return t * (2 - t)
}

/**
 * Ease-in-out (quadratic)
 */
export function easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

/**
 * Ease-in (cubic)
 */
export function easeInCubic(t: number): number {
    return t * t * t
}

/**
 * Ease-out (cubic)
 */
export function easeOutCubic(t: number): number {
    const f = t - 1
    return f * f * f + 1
}

/**
 * Ease-in-out (cubic)
 */
export function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
}
