/**
 * High-precision clock for animation timing
 * Uses performance.now() for accurate time tracking
 */
export class Clock {
    private _startTime: number = 0
    private _lastTime: number = 0
    private _elapsed: number = 0
    private _deltaTime: number = 0
    private _isRunning: boolean = false

    /**
     * Start or resume the clock
     */
    start(): void {
        if (this._isRunning) {
            return
        }

        this._isRunning = true
        this._startTime = performance.now()
        this._lastTime = this._startTime
        this._deltaTime = 0
    }

    /**
     * Stop the clock
     */
    stop(): void {
        if (!this._isRunning) {
            return
        }

        this._isRunning = false
        this._deltaTime = 0
    }

    /**
     * Update the clock and calculate delta time
     * @returns Delta time in milliseconds since last tick
     */
    tick(): number {
        if (!this._isRunning) {
            return 0
        }

        const currentTime = performance.now()
        this._deltaTime = currentTime - this._lastTime
        this._elapsed = currentTime - this._startTime
        this._lastTime = currentTime

        return this._deltaTime
    }

    /**
     * Get the total elapsed time since the clock started
     * @returns Elapsed time in milliseconds
     */
    get elapsed(): number {
        return this._elapsed
    }

    /**
     * Get the delta time from the last tick
     * @returns Delta time in milliseconds
     */
    get deltaTime(): number {
        return this._deltaTime
    }

    /**
     * Check if the clock is currently running
     */
    get isRunning(): boolean {
        return this._isRunning
    }

    /**
     * Reset the clock to initial state
     */
    reset(): void {
        this._startTime = 0
        this._lastTime = 0
        this._elapsed = 0
        this._deltaTime = 0
        this._isRunning = false
    }
}
