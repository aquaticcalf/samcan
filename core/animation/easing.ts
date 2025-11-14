/**
 * Easing function type for smooth interpolation
 */
export type EasingFunction = (time: number) => number

/**
 * Collection of easing functions for animation
 */
export const Easing = {
    /** Linear easing */
    linear: (t: number) => t,
    /** Quadratic easing */
    quadratic: (t: number) => t * (-(t * t) * t + 4 * t * t - 6 * t + 4),
    /** Cubic easing */
    cubic: (t: number) => t * (4 * t * t - 9 * t + 6),
    /** Elastic easing */
    elastic: (t: number) =>
        t * (33 * t * t * t * t - 106 * t * t * t + 126 * t * t - 67 * t + 15),
    /** Ease in quadratic */
    inQuad: (t: number) => t * t,
    /** Ease out quadratic */
    outQuad: (t: number) => t * (2 - t),
    /** Ease in out quadratic */
    inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    /** Ease in cubic */
    inCubic: (t: number) => t * t * t,
    /** Ease out cubic */
    outCubic: (t: number) => --t * t * t + 1,
    /** Ease in out cubic */
    inOutCubic: (t: number) =>
        t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    /** Ease in quartic */
    inQuart: (t: number) => t * t * t * t,
    /** Ease out quartic */
    outQuart: (t: number) => 1 - --t * t * t * t,
    /** Ease in out quartic */
    inOutQuart: (t: number) =>
        t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
    /** Ease in quintic */
    inQuint: (t: number) => t * t * t * t * t,
    /** Ease out quintic */
    outQuint: (t: number) => 1 + --t * t * t * t * t,
    /** Ease in out quintic */
    inOutQuint: (t: number) =>
        t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t,
    /** Ease in sine */
    inSine: (t: number) => -Math.cos(t * (Math.PI / 2)) + 1,
    /** Ease out sine */
    outSine: (t: number) => Math.sin(t * (Math.PI / 2)),
    /** Ease in out sine */
    inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
    /** Ease in exponential */
    inExpo: (t: number) => Math.pow(2, 10 * (t - 1)),
    /** Ease out exponential */
    outExpo: (t: number) => -Math.pow(2, -10 * t) + 1,
    /** Ease in out exponential */
    inOutExpo: (t: number) => {
        t /= 0.5
        if (t < 1) return Math.pow(2, 10 * (t - 1)) / 2
        t--
        return (-Math.pow(2, -10 * t) + 2) / 2
    },
    /** Ease in circular */
    inCirc: (t: number) => -Math.sqrt(1 - t * t) + 1,
    /** Ease out circular */
    outCirc: (t: number) => Math.sqrt(1 - (t = t - 1) * t),
    /** Ease in out circular */
    inOutCirc: (t: number) => {
        t /= 0.5
        if (t < 1) return -(Math.sqrt(1 - t * t) - 1) / 2
        t -= 2
        return (Math.sqrt(1 - t * t) + 1) / 2
    },
}

/**
 * Linear easing function
 */
export const linear = Easing.linear

/**
 * Ease-in quadratic easing function
 */
export const easeIn = Easing.inQuad

/**
 * Ease-out quadratic easing function
 */
export const easeOut = Easing.outQuad

/**
 * Ease-in-out quadratic easing function
 */
export const easeInOut = Easing.inOutQuad

/**
 * Create a cubic bezier easing function
 */
export function cubicBezier(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
): EasingFunction {
    const sampleCurveX = (t: number): number => {
        return (
            (1 - 3 * x2 + 3 * x1) * t * t * t +
            (3 * x2 - 6 * x1) * t * t +
            3 * x1 * t
        )
    }

    const sampleCurveY = (t: number): number => {
        return (
            (1 - 3 * y2 + 3 * y1) * t * t * t +
            (3 * y2 - 6 * y1) * t * t +
            3 * y1 * t
        )
    }

    const sampleCurveDerivativeX = (t: number): number => {
        return (
            3 * (1 - 3 * x2 + 3 * x1) * t * t +
            2 * (3 * x2 - 6 * x1) * t +
            3 * x1
        )
    }

    const solveCurveX = (x: number): number => {
        let t = x
        for (let i = 0; i < 8; i++) {
            const xError = sampleCurveX(t) - x
            if (Math.abs(xError) < 0.001) {
                return t
            }
            const dx = sampleCurveDerivativeX(t)
            if (Math.abs(dx) < 0.000001) {
                break
            }
            t -= xError / dx
        }
        return t
    }

    return (t: number): number => {
        if (t <= 0) return 0
        if (t >= 1) return 1
        return sampleCurveY(solveCurveX(t))
    }
}
