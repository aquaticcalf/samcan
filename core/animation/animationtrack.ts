import type { SceneNode } from "../scene/node"
import { Keyframe } from "./keyframe"

/**
 * Represents an animation track that animates a specific property of a SceneNode
 * Manages keyframes and evaluates interpolated values at given times
 */
export class AnimationTrack {
    private _target: SceneNode
    private _property: string
    private _keyframes: Keyframe[] = []

    constructor(target: SceneNode, property: string) {
        this._target = target
        this._property = property
    }

    /**
     * Get the target node being animated
     */
    get target(): SceneNode {
        return this._target
    }

    /**
     * Get the property path being animated (e.g., 'opacity', 'transform.position.x')
     */
    get property(): string {
        return this._property
    }

    /**
     * Get all keyframes in this track
     */
    get keyframes(): ReadonlyArray<Keyframe> {
        return this._keyframes
    }

    /**
     * Add a keyframe to this track
     * Keyframes are automatically sorted by time
     */
    addKeyframe(keyframe: Keyframe): void {
        this._keyframes.push(keyframe)
        // Sort keyframes by time
        this._keyframes.sort((a, b) => a.time - b.time)
    }

    /**
     * Remove a keyframe from this track
     */
    removeKeyframe(keyframe: Keyframe): boolean {
        const index = this._keyframes.indexOf(keyframe)
        if (index === -1) {
            return false
        }

        this._keyframes.splice(index, 1)
        return true
    }

    /**
     * Evaluate the track at a given time and apply the value to the target property
     * @param time The time in seconds to evaluate at
     */
    evaluate(time: number): unknown {
        if (this._keyframes.length === 0) {
            return undefined
        }

        // If time is before first keyframe, use first keyframe value
        if (time <= this._keyframes[0]!.time) {
            const value = this._keyframes[0]!.value
            this.applyValue(value)
            return value
        }

        // If time is after last keyframe, use last keyframe value
        const lastKeyframe = this._keyframes[this._keyframes.length - 1]!
        if (time >= lastKeyframe.time) {
            const value = lastKeyframe.value
            this.applyValue(value)
            return value
        }

        // Find the two keyframes to interpolate between
        let fromKeyframe: Keyframe | null = null
        let toKeyframe: Keyframe | null = null

        for (let i = 0; i < this._keyframes.length - 1; i++) {
            const current = this._keyframes[i]!
            const next = this._keyframes[i + 1]!

            if (time >= current.time && time <= next.time) {
                fromKeyframe = current
                toKeyframe = next
                break
            }
        }

        if (fromKeyframe === null || toKeyframe === null) {
            return undefined
        }

        // Calculate interpolation factor (0 to 1)
        const duration = toKeyframe.time - fromKeyframe.time
        let t = duration > 0 ? (time - fromKeyframe.time) / duration : 0

        // Apply easing function if present
        if (fromKeyframe.easing) {
            t = fromKeyframe.easing(t)
        }

        // Interpolate based on type
        let value: unknown
        switch (fromKeyframe.interpolation) {
            case "step":
                value = fromKeyframe.value
                break
            case "linear":
            case "cubic":
            case "bezier":
                // For now, all use linear interpolation
                // TODO: Implement proper cubic and bezier interpolation
                value = this.interpolateLinear(
                    fromKeyframe.value,
                    toKeyframe.value,
                    t,
                )
                break
            default:
                value = fromKeyframe.value
        }

        this.applyValue(value)
        return value
    }

    /**
     * Linear interpolation between two values
     */
    private interpolateLinear(from: unknown, to: unknown, t: number): unknown {
        // Handle numbers
        if (typeof from === "number" && typeof to === "number") {
            return from + (to - from) * t
        }

        // For non-numeric types, use step interpolation
        return t < 0.5 ? from : to
    }

    /**
     * Apply a value to the target property
     */
    private applyValue(value: unknown): void {
        // Parse property path (e.g., 'opacity' or 'transform.position.x')
        const parts = this._property.split(".")

        // Navigate to the target object
        // biome-ignore lint/suspicious/noExplicitAny: Dynamic property access requires any
        let target: any = this._target

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i]
            if (part && target[part] !== undefined) {
                target = target[part]
            } else {
                // Property path doesn't exist
                return
            }
        }

        // Set the final property
        const finalProp = parts[parts.length - 1]
        if (finalProp && target[finalProp] !== undefined) {
            target[finalProp] = value
        }
    }
}
