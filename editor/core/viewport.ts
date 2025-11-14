/**
 * Viewport management - handles zoom, pan, and coordinate transformations
 */

import { Vector2 } from "../../core/math"
import type { ViewportConfig } from "../types"

export class Viewport {
    private _canvas: HTMLCanvasElement
    private _zoom: number
    private _pan: Vector2

    constructor(config: {
        canvas: HTMLCanvasElement
        zoom: number
        pan: Vector2
    }) {
        this._canvas = config.canvas
        this._zoom = config.zoom
        this._pan = config.pan
    }

    /**
     * Get current zoom level
     */
    get zoom(): number {
        return this._zoom
    }

    /**
     * Set zoom level
     */
    set zoom(value: number) {
        this._zoom = Math.max(0.01, Math.min(100, value))
    }

    /**
     * Get current pan offset
     */
    get pan(): Vector2 {
        return this._pan
    }

    /**
     * Set pan offset
     */
    set pan(value: Vector2) {
        this._pan = value
    }

    /**
     * Get canvas dimensions
     */
    get canvasSize(): { width: number; height: number } {
        return {
            width: this._canvas.width,
            height: this._canvas.height,
        }
    }

    /**
     * Convert screen coordinates to canvas coordinates
     */
    screenToCanvas(screenPos: Vector2): Vector2 {
        const rect = this._canvas.getBoundingClientRect()
        const x = (screenPos.x - rect.left - this._pan.x) / this._zoom
        const y = (screenPos.y - rect.top - this._pan.y) / this._zoom
        return new Vector2(x, y)
    }

    /**
     * Convert canvas coordinates to screen coordinates
     */
    canvasToScreen(canvasPos: Vector2): Vector2 {
        const rect = this._canvas.getBoundingClientRect()
        const x = canvasPos.x * this._zoom + this._pan.x + rect.left
        const y = canvasPos.y * this._zoom + this._pan.y + rect.top
        return new Vector2(x, y)
    }

    /**
     * Zoom to fit content in viewport
     */
    zoomToFit(bounds: {
        x: number
        y: number
        width: number
        height: number
    }): void {
        const padding = 50
        const availableWidth = this._canvas.width - padding * 2
        const availableHeight = this._canvas.height - padding * 2

        const scaleX = availableWidth / bounds.width
        const scaleY = availableHeight / bounds.height
        this._zoom = Math.min(scaleX, scaleY)

        // Center the content
        const centerX = bounds.x + bounds.width / 2
        const centerY = bounds.y + bounds.height / 2
        this._pan = new Vector2(
            this._canvas.width / 2 - centerX * this._zoom,
            this._canvas.height / 2 - centerY * this._zoom,
        )
    }

    /**
     * Get current viewport configuration
     */
    getConfig(): ViewportConfig {
        return {
            zoom: this._zoom,
            pan: this._pan,
            canvasSize: this.canvasSize,
        }
    }
}
