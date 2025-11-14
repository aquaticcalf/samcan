import { AnimationTrack } from "./animationtrack"

/**
 * Timeline manages a collection of animation tracks and evaluates them at specific times
 * Represents the temporal structure of an animation with duration and frame rate
 */
export class Timeline {
    private _duration: number
    private _fps: number
    private _tracks: AnimationTrack[] = []

    constructor(duration: number, fps: number = 60) {
        this._duration = duration
        this._fps = fps
    }

    /**
     * Get the duration of the timeline in seconds
     */
    get duration(): number {
        return this._duration
    }

    /**
     * Set the duration of the timeline in seconds
     */
    set duration(value: number) {
        this._duration = Math.max(0, value)
    }

    /**
     * Get the frames per second
     */
    get fps(): number {
        return this._fps
    }

    /**
     * Set the frames per second
     */
    set fps(value: number) {
        this._fps = Math.max(1, value)
    }

    /**
     * Get all animation tracks
     */
    get tracks(): ReadonlyArray<AnimationTrack> {
        return this._tracks
    }

    /**
     * Add an animation track to the timeline
     */
    addTrack(track: AnimationTrack): void {
        if (this._tracks.includes(track)) {
            return // Already added
        }

        this._tracks.push(track)
    }

    /**
     * Remove an animation track from the timeline
     */
    removeTrack(track: AnimationTrack): boolean {
        const index = this._tracks.indexOf(track)
        if (index === -1) {
            return false
        }

        this._tracks.splice(index, 1)
        return true
    }

    /**
     * Remove all tracks from the timeline
     */
    clearTracks(): void {
        this._tracks = []
    }

    /**
     * Evaluate all tracks at the given time
     * This updates all animated properties on their target nodes
     * @param time The time in seconds to evaluate at
     */
    evaluate(time: number): void {
        // Clamp time to timeline duration
        const clampedTime = Math.max(0, Math.min(time, this._duration))

        // Evaluate each track
        for (const track of this._tracks) {
            track.evaluate(clampedTime)
        }
    }

    /**
     * Get the total number of frames in the timeline
     */
    getFrameCount(): number {
        return Math.ceil(this._duration * this._fps)
    }

    /**
     * Convert a frame number to time in seconds
     */
    frameToTime(frame: number): number {
        return frame / this._fps
    }

    /**
     * Convert time in seconds to frame number
     */
    timeToFrame(time: number): number {
        return Math.floor(time * this._fps)
    }
}
