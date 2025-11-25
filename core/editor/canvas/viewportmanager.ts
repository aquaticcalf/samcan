/**
 * ViewportManager - Handles canvas viewport zoom, pan, and coordinate transforms
 *
 * The viewport manages the transformation between screen coordinates (pixels on the canvas)
 * and world coordinates (positions in the scene/artboard space).
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { Vector2 } from "../../math/vector2"
import { Matrix } from "../../math/matrix"
import { Rectangle } from "../../math/rectangle"
import type { ViewportState } from "../core/types"

/**
 * Minimum zoom level (10%)
 */
const MIN_ZOOM = 0.1

/**
 * Maximum zoom level (3200%)
 */
const MAX_ZOOM = 32

/**
 * Default zoom step multiplier for zoomIn/zoomOut
 */
const ZOOM_STEP = 1.25

/**
 * ViewportManager handles canvas viewport navigation including zoom, pan,
 * and coordinate transformations between screen and world space.
 */
export class ViewportManager {
    private _zoom: number = 1
    private _panX: number = 0
    private _panY: number = 0
    private _canvasWidth: number = 0
    private _canvasHeight: number = 0

    /**
     * Create a new ViewportManager
     * @param canvasWidth - Width of the canvas in pixels
     * @param canvasHeight - Height of the canvas in pixels
     */
    constructor(canvasWidth: number = 800, canvasHeight: number = 600) {
        this._canvasWidth = canvasWidth
        this._canvasHeight = canvasHeight
    }

    // ========================================================================
    // Properties
    // ========================================================================

    /**
     * Get the current zoom level (1.0 = 100%)
     */
    get zoom(): number {
        return this._zoom
    }

    /**
     * Get the current horizontal pan offset in screen pixels
     */
    get panX(): number {
        return this._panX
    }

    /**
     * Get the current vertical pan offset in screen pixels
     */
    get panY(): number {
        return this._panY
    }

    /**
     * Get the canvas width
     */
    get canvasWidth(): number {
        return this._canvasWidth
    }

    /**
     * Get the canvas height
     */
    get canvasHeight(): number {
        return this._canvasHeight
    }

    /**
     * Get the visible bounds in world coordinates
     */
    get viewportBounds(): Rectangle {
        const topLeft = this.screenToWorld(new Vector2(0, 0))
        const bottomRight = this.screenToWorld(
            new Vector2(this._canvasWidth, this._canvasHeight),
        )
        return Rectangle.fromPoints(topLeft, bottomRight)
    }

    /**
     * Get the transformation matrix from world to screen coordinates
     */
    get transform(): Matrix {
        // The transform is: translate by pan, then scale by zoom
        // Screen = (World * zoom) + pan
        return new Matrix(this._zoom, 0, 0, this._zoom, this._panX, this._panY)
    }

    /**
     * Get the inverse transformation matrix (screen to world)
     */
    get inverseTransform(): Matrix {
        return this.transform.invert()
    }

    // ========================================================================
    // Canvas Size
    // ========================================================================

    /**
     * Update the canvas dimensions
     * @param width - New canvas width in pixels
     * @param height - New canvas height in pixels
     */
    setCanvasSize(width: number, height: number): void {
        this._canvasWidth = width
        this._canvasHeight = height
    }

    // ========================================================================
    // Zoom Operations
    // ========================================================================

    /**
     * Zoom in by one step, optionally centered on a screen position
     * @param centerX - Screen X coordinate to zoom toward (defaults to canvas center)
     * @param centerY - Screen Y coordinate to zoom toward (defaults to canvas center)
     */
    zoomIn(centerX?: number, centerY?: number): void {
        const newZoom = Math.min(this._zoom * ZOOM_STEP, MAX_ZOOM)
        this.zoomTo(newZoom, centerX, centerY)
    }

    /**
     * Zoom out by one step, optionally centered on a screen position
     * @param centerX - Screen X coordinate to zoom toward (defaults to canvas center)
     * @param centerY - Screen Y coordinate to zoom toward (defaults to canvas center)
     */
    zoomOut(centerX?: number, centerY?: number): void {
        const newZoom = Math.max(this._zoom / ZOOM_STEP, MIN_ZOOM)
        this.zoomTo(newZoom, centerX, centerY)
    }

    /**
     * Zoom to a specific level, optionally centered on a screen position.
     * This preserves the world point under the cursor at the same screen position.
     *
     * @param level - Target zoom level (clamped to MIN_ZOOM..MAX_ZOOM)
     * @param centerX - Screen X coordinate to zoom toward (defaults to canvas center)
     * @param centerY - Screen Y coordinate to zoom toward (defaults to canvas center)
     */
    zoomTo(level: number, centerX?: number, centerY?: number): void {
        // Clamp zoom level
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level))

        // Default to canvas center if no center point provided
        const screenX = centerX ?? this._canvasWidth / 2
        const screenY = centerY ?? this._canvasHeight / 2

        // Get the world point under the cursor before zoom
        const worldPoint = this.screenToWorld(new Vector2(screenX, screenY))

        // Update zoom
        const oldZoom = this._zoom
        this._zoom = newZoom

        // Adjust pan to keep the world point at the same screen position
        // Screen = World * zoom + pan
        // pan = Screen - World * zoom
        // We want the same world point to map to the same screen point after zoom change
        this._panX = screenX - worldPoint.x * this._zoom
        this._panY = screenY - worldPoint.y * this._zoom
    }

    /**
     * Zoom to fit the given bounds within the viewport with some padding
     * @param bounds - Rectangle in world coordinates to fit
     * @param padding - Padding in pixels around the bounds (default: 40)
     */
    zoomToFit(bounds: Rectangle, padding: number = 40): void {
        if (bounds.width <= 0 || bounds.height <= 0) {
            return
        }

        // Calculate available space
        const availableWidth = this._canvasWidth - padding * 2
        const availableHeight = this._canvasHeight - padding * 2

        if (availableWidth <= 0 || availableHeight <= 0) {
            return
        }

        // Calculate zoom to fit
        const zoomX = availableWidth / bounds.width
        const zoomY = availableHeight / bounds.height
        const newZoom = Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, Math.min(zoomX, zoomY)),
        )

        // Update zoom
        this._zoom = newZoom

        // Center the bounds in the viewport
        const boundsCenter = bounds.center
        this._panX = this._canvasWidth / 2 - boundsCenter.x * this._zoom
        this._panY = this._canvasHeight / 2 - boundsCenter.y * this._zoom
    }

    /**
     * Reset zoom to 100% and center the viewport at origin
     */
    resetZoom(): void {
        this._zoom = 1
        this._panX = this._canvasWidth / 2
        this._panY = this._canvasHeight / 2
    }

    // ========================================================================
    // Pan Operations
    // ========================================================================

    /**
     * Pan the viewport by a delta in screen pixels
     * @param deltaX - Horizontal pan delta in screen pixels
     * @param deltaY - Vertical pan delta in screen pixels
     */
    pan(deltaX: number, deltaY: number): void {
        this._panX += deltaX
        this._panY += deltaY
    }

    /**
     * Pan the viewport to a specific offset
     * @param x - New horizontal pan offset in screen pixels
     * @param y - New vertical pan offset in screen pixels
     */
    panTo(x: number, y: number): void {
        this._panX = x
        this._panY = y
    }

    /**
     * Center the viewport on a world point
     * @param point - Point in world coordinates to center on
     */
    centerOn(point: Vector2): void {
        // We want the world point to appear at the center of the canvas
        // Screen = World * zoom + pan
        // canvasCenter = point * zoom + pan
        // pan = canvasCenter - point * zoom
        this._panX = this._canvasWidth / 2 - point.x * this._zoom
        this._panY = this._canvasHeight / 2 - point.y * this._zoom
    }

    // ========================================================================
    // Coordinate Transforms
    // ========================================================================

    /**
     * Convert a screen coordinate to world coordinate
     * @param screenPoint - Point in screen pixels
     * @returns Point in world coordinates
     */
    screenToWorld(screenPoint: Vector2): Vector2 {
        // Screen = World * zoom + pan
        // World = (Screen - pan) / zoom
        return new Vector2(
            (screenPoint.x - this._panX) / this._zoom,
            (screenPoint.y - this._panY) / this._zoom,
        )
    }

    /**
     * Convert a world coordinate to screen coordinate
     * @param worldPoint - Point in world coordinates
     * @returns Point in screen pixels
     */
    worldToScreen(worldPoint: Vector2): Vector2 {
        // Screen = World * zoom + pan
        return new Vector2(
            worldPoint.x * this._zoom + this._panX,
            worldPoint.y * this._zoom + this._panY,
        )
    }

    // ========================================================================
    // State Management
    // ========================================================================

    /**
     * Get the current viewport state
     */
    getState(): Pick<ViewportState, "zoom" | "panX" | "panY"> {
        return {
            zoom: this._zoom,
            panX: this._panX,
            panY: this._panY,
        }
    }

    /**
     * Set the viewport state
     * @param state - Partial viewport state to apply
     */
    setState(
        state: Partial<Pick<ViewportState, "zoom" | "panX" | "panY">>,
    ): void {
        if (state.zoom !== undefined) {
            this._zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoom))
        }
        if (state.panX !== undefined) {
            this._panX = state.panX
        }
        if (state.panY !== undefined) {
            this._panY = state.panY
        }
    }
}
