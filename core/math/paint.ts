import { Color } from "./color"
import { Vector2 } from "./vector2"

/**
 * Blend modes for compositing operations
 */
export type BlendMode =
    | "normal"
    | "multiply"
    | "screen"
    | "overlay"
    | "darken"
    | "lighten"
    | "color-dodge"
    | "color-burn"
    | "hard-light"
    | "soft-light"
    | "difference"
    | "exclusion"

/**
 * Gradient stop defining a color at a specific position
 */
export interface GradientStop {
    /** Position along the gradient (0-1) */
    offset: number
    /** Color at this position */
    color: Color
}

/**
 * Linear gradient definition
 */
export interface LinearGradient {
    type: "linear"
    /** Start point of the gradient */
    start: Vector2
    /** End point of the gradient */
    end: Vector2
    /** Color stops along the gradient */
    stops: GradientStop[]
}

/**
 * Radial gradient definition
 */
export interface RadialGradient {
    type: "radial"
    /** Center point of the gradient */
    center: Vector2
    /** Radius of the gradient */
    radius: number
    /** Optional focal point for asymmetric gradients */
    focal?: Vector2
    /** Color stops along the gradient */
    stops: GradientStop[]
}

/**
 * Gradient type union
 */
export type Gradient = LinearGradient | RadialGradient

/**
 * Paint defines how shapes are filled or stroked
 */
export class Paint {
    private _type: "solid" | "gradient"
    private _color?: Color
    private _gradient?: Gradient
    private _blendMode: BlendMode

    private constructor(
        type: "solid" | "gradient",
        blendMode: BlendMode = "normal",
    ) {
        this._type = type
        this._blendMode = blendMode
    }

    /**
     * Get the paint type
     */
    get type(): "solid" | "gradient" {
        return this._type
    }

    /**
     * Get the solid color (if type is solid)
     */
    get color(): Color | undefined {
        return this._color
    }

    /**
     * Get the gradient (if type is gradient)
     */
    get gradient(): Gradient | undefined {
        return this._gradient
    }

    /**
     * Get the blend mode
     */
    get blendMode(): BlendMode {
        return this._blendMode
    }

    /**
     * Set the blend mode
     */
    setBlendMode(mode: BlendMode): void {
        this._blendMode = mode
    }

    /**
     * Create a solid color paint
     */
    static solid(color: Color, blendMode: BlendMode = "normal"): Paint {
        const paint = new Paint("solid", blendMode)
        paint._color = color
        return paint
    }

    /**
     * Create a linear gradient paint
     */
    static linearGradient(
        start: Vector2,
        end: Vector2,
        stops: GradientStop[],
        blendMode: BlendMode = "normal",
    ): Paint {
        const paint = new Paint("gradient", blendMode)
        paint._gradient = {
            type: "linear",
            start,
            end,
            stops: Paint.validateStops(stops),
        }
        return paint
    }

    /**
     * Create a radial gradient paint
     */
    static radialGradient(
        center: Vector2,
        radius: number,
        stops: GradientStop[],
        focal?: Vector2,
        blendMode: BlendMode = "normal",
    ): Paint {
        const paint = new Paint("gradient", blendMode)
        paint._gradient = {
            type: "radial",
            center,
            radius,
            focal,
            stops: Paint.validateStops(stops),
        }
        return paint
    }

    /**
     * Validate and sort gradient stops
     */
    private static validateStops(stops: GradientStop[]): GradientStop[] {
        if (stops.length < 2) {
            throw new Error("Gradient must have at least 2 color stops")
        }

        // Sort stops by offset
        const sorted = [...stops].sort((a, b) => a.offset - b.offset)

        // Clamp offsets to 0-1 range
        for (const stop of sorted) {
            stop.offset = Math.max(0, Math.min(1, stop.offset))
        }

        return sorted
    }

    /**
     * Clone this paint
     */
    clone(): Paint {
        if (this._type === "solid" && this._color) {
            return Paint.solid(this._color.clone(), this._blendMode)
        }

        if (this._type === "gradient" && this._gradient) {
            const gradient = this._gradient
            if (gradient.type === "linear") {
                return Paint.linearGradient(
                    new Vector2(gradient.start.x, gradient.start.y),
                    new Vector2(gradient.end.x, gradient.end.y),
                    gradient.stops.map((s) => ({
                        offset: s.offset,
                        color: s.color.clone(),
                    })),
                    this._blendMode,
                )
            }

            if (gradient.type === "radial") {
                return Paint.radialGradient(
                    new Vector2(gradient.center.x, gradient.center.y),
                    gradient.radius,
                    gradient.stops.map((s) => ({
                        offset: s.offset,
                        color: s.color.clone(),
                    })),
                    gradient.focal
                        ? new Vector2(gradient.focal.x, gradient.focal.y)
                        : undefined,
                    this._blendMode,
                )
            }
        }

        throw new Error("Invalid paint state")
    }

    /**
     * Evaluate gradient color at a specific position (0-1)
     */
    evaluateGradient(t: number): Color {
        if (this._type !== "gradient" || !this._gradient) {
            throw new Error("Cannot evaluate gradient on non-gradient paint")
        }

        const stops = this._gradient.stops
        t = Math.max(0, Math.min(1, t))

        // Find the two stops to interpolate between
        const firstStop = stops[0]
        const lastStop = stops[stops.length - 1]

        if (!firstStop || !lastStop) {
            throw new Error("Invalid gradient stops")
        }

        if (t <= firstStop.offset) {
            return firstStop.color.clone()
        }

        if (t >= lastStop.offset) {
            return lastStop.color.clone()
        }

        for (let i = 0; i < stops.length - 1; i++) {
            const stop1 = stops[i]
            const stop2 = stops[i + 1]

            if (stop1 && stop2 && t >= stop1.offset && t <= stop2.offset) {
                const range = stop2.offset - stop1.offset
                const localT = (t - stop1.offset) / range
                return stop1.color.lerp(stop2.color, localT)
            }
        }

        return firstStop.color.clone()
    }

    /**
     * Check if this paint equals another paint
     */
    equals(other: Paint): boolean {
        if (
            this._type !== other._type ||
            this._blendMode !== other._blendMode
        ) {
            return false
        }

        if (this._type === "solid") {
            return (
                this._color !== undefined &&
                other._color !== undefined &&
                this._color.equals(other._color)
            )
        }

        if (this._type === "gradient") {
            if (!this._gradient || !other._gradient) {
                return false
            }

            const g1 = this._gradient
            const g2 = other._gradient

            if (g1.type !== g2.type || g1.stops.length !== g2.stops.length) {
                return false
            }

            // Check stops
            for (let i = 0; i < g1.stops.length; i++) {
                const s1 = g1.stops[i]
                const s2 = g2.stops[i]
                if (!s1 || !s2) {
                    return false
                }
                if (
                    Math.abs(s1.offset - s2.offset) > 0.0001 ||
                    !s1.color.equals(s2.color)
                ) {
                    return false
                }
            }

            // Check type-specific properties
            if (g1.type === "linear" && g2.type === "linear") {
                return g1.start.equals(g2.start) && g1.end.equals(g2.end)
            }

            if (g1.type === "radial" && g2.type === "radial") {
                const focalMatch =
                    (!g1.focal && !g2.focal) ||
                    (g1.focal !== undefined &&
                        g2.focal !== undefined &&
                        g1.focal.equals(g2.focal))
                return (
                    g1.center.equals(g2.center) &&
                    Math.abs(g1.radius - g2.radius) < 0.0001 &&
                    focalMatch
                )
            }
        }

        return false
    }
}
