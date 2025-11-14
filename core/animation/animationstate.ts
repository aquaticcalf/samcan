import { Timeline } from "./timeline"

/**
 * AnimationState represents a named animation state with its own timeline
 * States can be managed by a StateMachine for interactive animations
 *
 */
export class AnimationState {
    private _id: string
    private _name: string
    private _timeline: Timeline
    private _speed: number
    private _loop: boolean
    private _active: boolean = false

    /**
     * Create a new animation state
     * @param id Unique identifier for the state
     * @param name Human-readable name for the state
     * @param timeline The timeline containing the animation data
     * @param speed Playback speed multiplier (default: 1.0)
     * @param loop Whether the state should loop (default: false)
     */
    constructor(
        id: string,
        name: string,
        timeline: Timeline,
        speed: number = 1.0,
        loop: boolean = false,
    ) {
        this._id = id
        this._name = name
        this._timeline = timeline
        this._speed = speed
        this._loop = loop
    }

    /**
     * Get the unique identifier for this state
     */
    get id(): string {
        return this._id
    }

    /**
     * Get the human-readable name of this state
     */
    get name(): string {
        return this._name
    }

    /**
     * Set the human-readable name of this state
     */
    set name(value: string) {
        this._name = value
    }

    /**
     * Get the timeline associated with this state
     */
    get timeline(): Timeline {
        return this._timeline
    }

    /**
     * Set the timeline associated with this state
     */
    set timeline(value: Timeline) {
        this._timeline = value
    }

    /**
     * Get the playback speed multiplier
     * Values > 1.0 speed up playback, values < 1.0 slow it down
     */
    get speed(): number {
        return this._speed
    }

    /**
     * Set the playback speed multiplier
     * Values > 1.0 speed up playback, values < 1.0 slow it down
     */
    set speed(value: number) {
        this._speed = Math.max(0.1, Math.min(10.0, value))
    }

    /**
     * Get whether this state loops
     */
    get loop(): boolean {
        return this._loop
    }

    /**
     * Set whether this state loops
     */
    set loop(value: boolean) {
        this._loop = value
    }

    /**
     * Get whether this state is currently active
     */
    get active(): boolean {
        return this._active
    }

    /**
     * Activate this state
     * Called by the state machine when transitioning to this state
     */
    activate(): void {
        this._active = true
    }

    /**
     * Deactivate this state
     * Called by the state machine when transitioning away from this state
     */
    deactivate(): void {
        this._active = false
    }

    /**
     * Get the duration of this state's timeline in seconds
     */
    get duration(): number {
        return this._timeline.duration
    }

    /**
     * Evaluate the state's timeline at the given time
     * @param time The time in seconds to evaluate at
     */
    evaluate(time: number): void {
        this._timeline.evaluate(time)
    }
}
