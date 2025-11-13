import { Rectangle } from "../rectangle"
import { Vector2 } from "../vector2"

/**
 * Path command types for vector graphics
 */
export type PathCommand =
    | { type: "M"; x: number; y: number } // MoveTo
    | { type: "L"; x: number; y: number } // LineTo
    | {
          type: "C"
          cp1x: number
          cp1y: number
          cp2x: number
          cp2y: number
          x: number
          y: number
      } // CubicBezier
    | { type: "Q"; cpx: number; cpy: number; x: number; y: number } // QuadraticBezier
    | { type: "Z" } // Close

/**
 * Path class for vector graphics primitives
 * Stores path commands and provides operations for manipulation
 */
export class Path {
    private _commands: PathCommand[] = []
    private _currentPoint: Vector2 = new Vector2(0, 0)
    private _startPoint: Vector2 = new Vector2(0, 0)
    private _boundsDirty = true
    private _cachedBounds: Rectangle | null = null

    constructor(commands: PathCommand[] = []) {
        this._commands = commands
        if (commands.length > 0) {
            this._updateCurrentPoint()
        }
    }

    /**
     * Get all path commands
     */
    get commands(): ReadonlyArray<PathCommand> {
        return this._commands
    }

    /**
     * Move to a new position without drawing
     */
    moveTo(x: number, y: number): void {
        this._commands.push({ type: "M", x, y })
        this._currentPoint.set(x, y)
        this._startPoint.set(x, y)
        this._boundsDirty = true
    }

    /**
     * Draw a line to a position
     */
    lineTo(x: number, y: number): void {
        this._commands.push({ type: "L", x, y })
        this._currentPoint.set(x, y)
        this._boundsDirty = true
    }

    /**
     * Draw a cubic bezier curve
     */
    curveTo(
        cp1x: number,
        cp1y: number,
        cp2x: number,
        cp2y: number,
        x: number,
        y: number,
    ): void {
        this._commands.push({ type: "C", cp1x, cp1y, cp2x, cp2y, x, y })
        this._currentPoint.set(x, y)
        this._boundsDirty = true
    }

    /**
     * Draw a quadratic bezier curve
     */
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
        this._commands.push({ type: "Q", cpx, cpy, x, y })
        this._currentPoint.set(x, y)
        this._boundsDirty = true
    }

    /**
     * Close the current path by drawing a line back to the start point
     */
    close(): void {
        this._commands.push({ type: "Z" })
        this._currentPoint.set(this._startPoint.x, this._startPoint.y)
        this._boundsDirty = true
    }

    /**
     * Get the bounding box of the path
     */
    getBounds(): Rectangle {
        if (!this._boundsDirty && this._cachedBounds) {
            return this._cachedBounds
        }

        if (this._commands.length === 0) {
            this._cachedBounds = new Rectangle(0, 0, 0, 0)
            this._boundsDirty = false
            return this._cachedBounds
        }

        let minX = Number.POSITIVE_INFINITY
        let minY = Number.POSITIVE_INFINITY
        let maxX = Number.NEGATIVE_INFINITY
        let maxY = Number.NEGATIVE_INFINITY

        for (const cmd of this._commands) {
            switch (cmd.type) {
                case "M":
                case "L":
                    minX = Math.min(minX, cmd.x)
                    minY = Math.min(minY, cmd.y)
                    maxX = Math.max(maxX, cmd.x)
                    maxY = Math.max(maxY, cmd.y)
                    break
                case "C":
                    // Include control points and end point
                    minX = Math.min(minX, cmd.cp1x, cmd.cp2x, cmd.x)
                    minY = Math.min(minY, cmd.cp1y, cmd.cp2y, cmd.y)
                    maxX = Math.max(maxX, cmd.cp1x, cmd.cp2x, cmd.x)
                    maxY = Math.max(maxY, cmd.cp1y, cmd.cp2y, cmd.y)
                    break
                case "Q":
                    // Include control point and end point
                    minX = Math.min(minX, cmd.cpx, cmd.x)
                    minY = Math.min(minY, cmd.cpy, cmd.y)
                    maxX = Math.max(maxX, cmd.cpx, cmd.x)
                    maxY = Math.max(maxY, cmd.cpy, cmd.y)
                    break
                case "Z":
                    // Close command doesn't add new points
                    break
            }
        }

        this._cachedBounds = new Rectangle(minX, minY, maxX - minX, maxY - minY)
        this._boundsDirty = false
        return this._cachedBounds
    }

    /**
     * Clone this path
     */
    clone(): Path {
        return new Path([...this._commands])
    }

    /**
     * Clear all commands from the path
     */
    clear(): void {
        this._commands = []
        this._currentPoint.set(0, 0)
        this._startPoint.set(0, 0)
        this._boundsDirty = true
        this._cachedBounds = null
    }

    /**
     * Check if the path is empty
     */
    isEmpty(): boolean {
        return this._commands.length === 0
    }

    /**
     * Serialize path commands to JSON
     */
    toJSON(): PathCommand[] {
        return [...this._commands]
    }

    /**
     * Deserialize path commands from JSON
     */
    static fromJSON(commands: PathCommand[]): Path {
        return new Path(commands)
    }

    /**
     * Update current point based on last command
     */
    private _updateCurrentPoint(): void {
        if (this._commands.length === 0) {
            this._currentPoint.set(0, 0)
            this._startPoint.set(0, 0)
            return
        }

        const lastCmd = this._commands[this._commands.length - 1]
        if (!lastCmd) return

        switch (lastCmd.type) {
            case "M":
                this._currentPoint.set(lastCmd.x, lastCmd.y)
                this._startPoint.set(lastCmd.x, lastCmd.y)
                break
            case "L":
                this._currentPoint.set(lastCmd.x, lastCmd.y)
                break
            case "C":
                this._currentPoint.set(lastCmd.x, lastCmd.y)
                break
            case "Q":
                this._currentPoint.set(lastCmd.x, lastCmd.y)
                break
            case "Z":
                this._currentPoint.set(this._startPoint.x, this._startPoint.y)
                break
        }
    }
}
