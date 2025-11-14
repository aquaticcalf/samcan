import type { EasingFunction } from "./easing"
import { Color } from "../math/color"
import { Vector2 } from "../math/vector2"

/**
 * Generic interpolator interface for type-specific value interpolation
 */
export interface Interpolator<T> {
    /**
     * Interpolate between two values
     * @param from Starting value
     * @param to Ending value
     * @param t Interpolation factor (0-1)
     * @param easing Optional easing function to apply
     * @returns Interpolated value
     */
    interpolate(from: T, to: T, t: number, easing?: EasingFunction): T
}

/**
 * Interpolator for scalar number values
 */
export class NumberInterpolator implements Interpolator<number> {
    interpolate(
        from: number,
        to: number,
        t: number,
        easing?: EasingFunction,
    ): number {
        const easedT = easing ? easing(t) : t
        return from + (to - from) * easedT
    }
}

/**
 * Interpolator for Vector2 values (positions, scales, etc.)
 */
export class Vector2Interpolator implements Interpolator<Vector2> {
    interpolate(
        from: Vector2,
        to: Vector2,
        t: number,
        easing?: EasingFunction,
    ): Vector2 {
        const easedT = easing ? easing(t) : t
        return new Vector2(
            from.x + (to.x - from.x) * easedT,
            from.y + (to.y - from.y) * easedT,
        )
    }
}

/**
 * Interpolator for Color values with RGBA components
 */
export class ColorInterpolator implements Interpolator<Color> {
    interpolate(
        from: Color,
        to: Color,
        t: number,
        easing?: EasingFunction,
    ): Color {
        const easedT = easing ? easing(t) : t
        return new Color(
            from.r + (to.r - from.r) * easedT,
            from.g + (to.g - from.g) * easedT,
            from.b + (to.b - from.b) * easedT,
            from.a + (to.a - from.a) * easedT,
        )
    }
}

/**
 * Registry for managing type-specific interpolators
 * Allows registration of custom interpolators for extensibility
 */
export class InterpolatorRegistry {
    private static _interpolators = new Map<string, Interpolator<unknown>>()
    private static _initialized = false

    /**
     * Initialize the registry with built-in interpolators
     */
    private static initialize(): void {
        if (this._initialized) return

        this.register("number", new NumberInterpolator())
        this.register("Vector2", new Vector2Interpolator())
        this.register("Color", new ColorInterpolator())

        this._initialized = true
    }

    /**
     * Register a custom interpolator for a specific type
     * @param typeName Name of the type (e.g., 'number', 'Vector2', 'MyCustomType')
     * @param interpolator Interpolator instance for the type
     */
    static register<T>(typeName: string, interpolator: Interpolator<T>): void {
        this._interpolators.set(typeName, interpolator as Interpolator<unknown>)
    }

    /**
     * Get an interpolator for a specific type
     * @param typeName Name of the type
     * @returns Interpolator instance or undefined if not found
     */
    static get<T>(typeName: string): Interpolator<T> | undefined {
        this.initialize()
        return this._interpolators.get(typeName) as Interpolator<T> | undefined
    }

    /**
     * Get an interpolator for a value based on its runtime type
     * @param value Value to determine type from
     * @returns Interpolator instance or undefined if no matching interpolator
     */
    static getForValue<T>(value: T): Interpolator<T> | undefined {
        this.initialize()

        if (typeof value === "number") {
            return this.get<T>("number")
        }

        if (value instanceof Vector2) {
            return this.get<T>("Vector2")
        }

        if (value instanceof Color) {
            return this.get<T>("Color")
        }

        return undefined
    }

    /**
     * Check if an interpolator exists for a type
     * @param typeName Name of the type
     * @returns True if interpolator exists
     */
    static has(typeName: string): boolean {
        this.initialize()
        return this._interpolators.has(typeName)
    }

    /**
     * Remove an interpolator from the registry
     * @param typeName Name of the type
     * @returns True if interpolator was removed
     */
    static unregister(typeName: string): boolean {
        return this._interpolators.delete(typeName)
    }

    /**
     * Clear all registered interpolators (except built-ins)
     */
    static clear(): void {
        this._interpolators.clear()
        this._initialized = false
    }
}
