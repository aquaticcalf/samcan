/**
 * Interpolation types for keyframe animation
 */
export type InterpolationType = "linear" | "step" | "cubic" | "bezier"

/**
 * Easing function type for smooth interpolation
 */
export type EasingFunction = (t: number) => number

/**
 * Represents a single keyframe in an animation track
 * Stores time, value, and interpolation settings
 */
export class Keyframe {
    private _time: number
    private _value: unknown
    private _interpolation: InterpolationType
    private _easing?: EasingFunction

    constructor(
        time: number,
        value: unknown,
        interpolation: InterpolationType = "linear",
        easing?: EasingFunction,
    ) {
        this._time = time
        this._value = value
        this._interpolation = interpolation
        this._easing = easing
    }

    /**
     * Get the time of this keyframe in seconds
     */
    get time(): number {
        return this._time
    }

    /**
     * Get the value at this keyframe
     */
    get value(): unknown {
        return this._value
    }

    /**
     * Get the interpolation type
     */
    get interpolation(): InterpolationType {
        return this._interpolation
    }

    /**
     * Get the easing function (if any)
     */
    get easing(): EasingFunction | undefined {
        return this._easing
    }

    /**
     * Set the time of this keyframe
     */
    set time(value: number) {
        this._time = value
    }

    /**
     * Set the value at this keyframe
     */
    set value(val: unknown) {
        this._value = val
    }

    /**
     * Set the interpolation type
     */
    set interpolation(value: InterpolationType) {
        this._interpolation = value
    }

    /**
     * Set the easing function
     */
    set easing(value: EasingFunction | undefined) {
        this._easing = value
    }
}
