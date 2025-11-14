/**
 * Frame callback function type
 */
export type FrameCallback = (deltaTime: number) => void

/**
 * Scheduler for managing frame callbacks using requestAnimationFrame
 * Tracks FPS and provides performance metrics
 */
export class Scheduler {
    private _callbacks: Set<FrameCallback> = new Set()
    private _isRunning: boolean = false
    private _animationFrameId: number | null = null
    private _lastFrameTime: number = 0
    private _frameCount: number = 0
    private _fpsUpdateInterval: number = 1000 // Update FPS every second
    private _lastFpsUpdateTime: number = 0
    private _currentFps: number = 0
    private _frameTimeHistory: number[] = []
    private _maxHistorySize: number = 60 // Track last 60 frames

    /**
     * Schedule a callback to be executed on each frame
     * @param callback Function to call on each frame with delta time
     */
    schedule(callback: FrameCallback): void {
        this._callbacks.add(callback)

        // Auto-start if not running
        if (!this._isRunning) {
            this.start()
        }
    }

    /**
     * Unschedule a previously scheduled callback
     * @param callback Function to remove from frame callbacks
     */
    unschedule(callback: FrameCallback): void {
        this._callbacks.delete(callback)

        // Auto-stop if no callbacks remain
        if (this._callbacks.size === 0 && this._isRunning) {
            this.stop()
        }
    }

    /**
     * Start the scheduler
     */
    start(): void {
        if (this._isRunning) {
            return
        }

        this._isRunning = true
        this._lastFrameTime = performance.now()
        this._lastFpsUpdateTime = this._lastFrameTime
        this._frameCount = 0
        this._requestFrame()
    }

    /**
     * Stop the scheduler
     */
    stop(): void {
        if (!this._isRunning) {
            return
        }

        this._isRunning = false

        if (this._animationFrameId !== null) {
            cancelAnimationFrame(this._animationFrameId)
            this._animationFrameId = null
        }
    }

    /**
     * Get the current frames per second
     */
    get fps(): number {
        return this._currentFps
    }

    /**
     * Get the average frame time in milliseconds
     */
    get averageFrameTime(): number {
        if (this._frameTimeHistory.length === 0) {
            return 0
        }

        const sum = this._frameTimeHistory.reduce((acc, time) => acc + time, 0)
        return sum / this._frameTimeHistory.length
    }

    /**
     * Get the minimum frame time in milliseconds (best performance)
     */
    get minFrameTime(): number {
        if (this._frameTimeHistory.length === 0) {
            return 0
        }

        return Math.min(...this._frameTimeHistory)
    }

    /**
     * Get the maximum frame time in milliseconds (worst performance)
     */
    get maxFrameTime(): number {
        if (this._frameTimeHistory.length === 0) {
            return 0
        }

        return Math.max(...this._frameTimeHistory)
    }

    /**
     * Check if the scheduler is currently running
     */
    get isRunning(): boolean {
        return this._isRunning
    }

    /**
     * Get the number of scheduled callbacks
     */
    get callbackCount(): number {
        return this._callbacks.size
    }

    /**
     * Clear all scheduled callbacks and stop the scheduler
     */
    clear(): void {
        this._callbacks.clear()
        this.stop()
    }

    /**
     * Request the next animation frame
     */
    private _requestFrame(): void {
        this._animationFrameId = requestAnimationFrame((time) =>
            this._onFrame(time),
        )
    }

    /**
     * Handle animation frame callback
     */
    private _onFrame(currentTime: number): void {
        if (!this._isRunning) {
            return
        }

        // Calculate delta time
        const deltaTime = currentTime - this._lastFrameTime
        this._lastFrameTime = currentTime

        // Track frame time for performance metrics
        this._frameTimeHistory.push(deltaTime)
        if (this._frameTimeHistory.length > this._maxHistorySize) {
            this._frameTimeHistory.shift()
        }

        // Update FPS counter
        this._frameCount++
        const timeSinceLastFpsUpdate = currentTime - this._lastFpsUpdateTime

        if (timeSinceLastFpsUpdate >= this._fpsUpdateInterval) {
            this._currentFps = Math.round(
                (this._frameCount * 1000) / timeSinceLastFpsUpdate,
            )
            this._frameCount = 0
            this._lastFpsUpdateTime = currentTime
        }

        // Execute all scheduled callbacks
        for (const callback of this._callbacks) {
            try {
                callback(deltaTime)
            } catch (error) {
                console.error("Error in scheduled callback:", error)
            }
        }

        // Request next frame
        this._requestFrame()
    }
}
