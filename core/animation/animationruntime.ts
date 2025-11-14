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

        // Update current time based on delta
        // Convert deltaTime from milliseconds to seconds
        this._currentTime += deltaTime / 1000

        // Clamp to timeline duration for now (loop handling will be added in 7.2)
        if (this._currentTime > this._timeline.duration) {
            this._currentTime = this._timeline.duration
            this._stopPlayback()
        }

        // Evaluate timeline at current time
        this._timeline.evaluate(this._currentTime)
    }
}
