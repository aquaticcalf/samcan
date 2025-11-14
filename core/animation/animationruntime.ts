import type { Artboard } from "../scene/nodes/artboard"
import { Clock } from "../timing/clock"
import { Scheduler } from "../timing/scheduler"
import { Timeline } from "./timeline"

/**
 * Animation data structure that can be loaded into the runtime
 */
export interface AnimationData {
    artboard: Artboard
    timeline: Timeline
}

/**
 * Playback state of the animation runtime
 */
export type PlaybackState = "idle" | "playing" | "paused" | "stopped"

/**
 * Loop mode for animation playback
 */
export type LoopMode = "none" | "loop" | "pingpong"

/**
 * AnimationRuntime manages the lifecycle and playback of animations
 * Connects Clock, Scheduler, and Timeline to execute animations
 */
export class AnimationRuntime {
    private _artboard: Artboard | null = null
    private _timeline: Timeline | null = null
    private _clock: Clock
    private _scheduler: Scheduler
    private _state: PlaybackState = "idle"
    private _currentTime: number = 0
    private _speed: number = 1.0
    private _loopMode: LoopMode = "none"
    private _direction: number = 1 // 1 for forward, -1 for reverse (used in pingpong)

    constructor() {
        this._clock = new Clock()
        this._scheduler = new Scheduler()
    }

    /**
     * Load animation data into the runtime
     * @param data Animation data containing artboard and timeline
     */
    async load(data: AnimationData): Promise<void> {
        // Unload any existing animation first
        if (this._artboard !== null || this._timeline !== null) {
            this.unload()
        }

        // Validate the data
        if (!data.artboard) {
            throw new Error("AnimationData must contain an artboard")
        }

        if (!data.timeline) {
            throw new Error("AnimationData must contain a timeline")
        }

        // Load the animation data
        this._artboard = data.artboard
        this._timeline = data.timeline
        this._currentTime = 0
        this._state = "stopped"

        // Evaluate timeline at time 0 to set initial state
        this._timeline.evaluate(0)
    }

    /**
     * Unload the current animation and clean up resources
     */
    unload(): void {
        // Stop playback if running
        if (this._state === "playing") {
            this._stopPlayback()
        }

        // Clear animation data
        this._artboard = null
        this._timeline = null
        this._currentTime = 0
        this._state = "idle"
    }

    /**
     * Get the current playback state
     */
    get state(): PlaybackState {
        return this._state
    }

    /**
     * Check if animation is currently playing
     */
    get isPlaying(): boolean {
        return this._state === "playing"
    }

    /**
     * Get the current playback time in seconds
     */
    get currentTime(): number {
        return this._currentTime
    }

    /**
     * Get the duration of the loaded animation in seconds
     * Returns 0 if no animation is loaded
     */
    get duration(): number {
        return this._timeline?.duration ?? 0
    }

    /**
     * Get the loaded artboard
     * Returns null if no animation is loaded
     */
    get artboard(): Artboard | null {
        return this._artboard
    }

    /**
     * Get the loaded timeline
     * Returns null if no animation is loaded
     */
    get timeline(): Timeline | null {
        return this._timeline
    }

    /**
     * Get the clock instance
     */
    get clock(): Clock {
        return this._clock
    }

    /**
     * Get the scheduler instance
     */
    get scheduler(): Scheduler {
        return this._scheduler
    }

    /**
     * Get the current playback speed multiplier
     */
    get speed(): number {
        return this._speed
    }

    /**
     * Get the current loop mode
     */
    get loopMode(): LoopMode {
        return this._loopMode
    }

    /**
     * Start or resume animation playback
     * If paused, resumes from current time
     * If stopped, starts from beginning
     */
    play(): void {
        if (!this._timeline) {
            throw new Error("Cannot play: no animation loaded")
        }

        if (this._state === "playing") {
            return // Already playing
        }

        // If stopped, reset to beginning
        if (this._state === "stopped") {
            this._currentTime = 0
            this._direction = 1
            this._timeline.evaluate(this._currentTime)
        }

        this._startPlayback()
    }

    /**
     * Pause animation playback
     * Maintains current time position
     */
    pause(): void {
        if (this._state !== "playing") {
            return // Not playing, nothing to pause
        }

        this._state = "paused"
        this._clock.stop()
        this._scheduler.unschedule(this._onFrame)
    }

    /**
     * Stop animation playback and reset to beginning
     */
    stop(): void {
        if (this._state === "idle") {
            return // No animation loaded
        }

        if (this._state === "playing") {
            this._stopPlayback()
        } else {
            this._state = "stopped"
        }

        // Reset to beginning
        this._currentTime = 0
        this._direction = 1

        if (this._timeline) {
            this._timeline.evaluate(this._currentTime)
        }
    }

    /**
     * Seek to a specific time in the animation
     * @param time Time in seconds to seek to
     */
    seek(time: number): void {
        if (!this._timeline) {
            throw new Error("Cannot seek: no animation loaded")
        }

        // Clamp time to valid range
        this._currentTime = Math.max(0, Math.min(time, this._timeline.duration))

        // Evaluate timeline at new time
        this._timeline.evaluate(this._currentTime)

        // Update state if currently idle
        if (this._state === "idle") {
            this._state = "stopped"
        }
    }

    /**
     * Set the playback speed multiplier
     * @param speed Speed multiplier (1.0 = normal, 2.0 = double speed, 0.5 = half speed)
     */
    setSpeed(speed: number): void {
        if (speed <= 0) {
            throw new Error("Speed must be greater than 0")
        }

        this._speed = speed
    }

    /**
     * Set the loop mode for playback
     * @param mode Loop mode: "none" (play once), "loop" (repeat), or "pingpong" (reverse on each loop)
     */
    setLoop(mode: LoopMode): void {
        this._loopMode = mode
    }

    /**
     * Internal method to start playback
     * Connects clock and scheduler for frame updates
     */
    private _startPlayback(): void {
        if (!this._timeline) {
            throw new Error("Cannot start playback: no animation loaded")
        }

        this._state = "playing"
        this._clock.start()

        // Schedule the update callback
        this._scheduler.schedule(this._onFrame)
    }

    /**
     * Internal method to stop playback
     * Disconnects clock and scheduler
     */
    private _stopPlayback(): void {
        this._state = "stopped"
        this._clock.stop()
        this._scheduler.unschedule(this._onFrame)
    }

    /**
     * Frame callback that updates the animation
     * Bound to this instance to maintain context
     */
    private _onFrame = (deltaTime: number): void => {
        if (!this._timeline || this._state !== "playing") {
            return
        }

        // Update clock
        this._clock.tick()

        // Update current time based on delta and speed
        // Convert deltaTime from milliseconds to seconds
        const deltaSeconds = (deltaTime / 1000) * this._speed * this._direction

        this._currentTime += deltaSeconds

        // Handle loop modes
        const duration = this._timeline.duration

        if (this._loopMode === "none") {
            // No looping - stop at end
            if (this._currentTime >= duration) {
                this._currentTime = duration
                this._timeline.evaluate(this._currentTime)
                this._stopPlayback()
                return
            }
            if (this._currentTime < 0) {
                this._currentTime = 0
                this._timeline.evaluate(this._currentTime)
                this._stopPlayback()
                return
            }
        } else if (this._loopMode === "loop") {
            // Loop mode - wrap around
            if (this._currentTime >= duration) {
                this._currentTime = this._currentTime % duration
            } else if (this._currentTime < 0) {
                this._currentTime = duration + (this._currentTime % duration)
            }
        } else if (this._loopMode === "pingpong") {
            // Ping-pong mode - reverse direction at boundaries
            if (this._currentTime >= duration) {
                this._currentTime = duration - (this._currentTime - duration)
                this._direction = -1
            } else if (this._currentTime < 0) {
                this._currentTime = -this._currentTime
                this._direction = 1
            }
        }

        // Evaluate timeline at current time
        this._timeline.evaluate(this._currentTime)
    }
}
