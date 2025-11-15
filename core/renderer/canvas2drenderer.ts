import type { Color } from "../math/color"
import { Matrix } from "../math/matrix"
import type { Paint } from "../math/paint"
import type { Path } from "../math/path"
import { Rectangle } from "../math/rectangle"
import type { Vector2 } from "../math/vector2"
import type {
    Font,
    ImageAsset,
    Renderer,
    RendererBackend,
    RendererCapabilities,
} from "./renderer"
import { BatchManager, type DrawOperation } from "./batchmanager"
import { RendererError } from "../error/renderererror"

/**
 * Canvas2D renderer implementation
 * Provides rendering using the HTML5 Canvas2D API
 */
export class Canvas2DRenderer implements Renderer {
    private _canvas: HTMLCanvasElement | null = null
    private _ctx: CanvasRenderingContext2D | null = null
    private _isInitialized = false
    private _width = 0
    private _height = 0
    private _batchManager = new BatchManager()
    private _batchingEnabled = true

    readonly backend: RendererBackend = "canvas2d"

    readonly capabilities: RendererCapabilities = {
        maxTextureSize: 4096, // Typical Canvas2D limit
        supportsBlendModes: true,
        supportsFilters: true,
        supportsAdvancedPaths: true,
        supportsHardwareAcceleration: false,
    }

    get isInitialized(): boolean {
        return this._isInitialized
    }

    get width(): number {
        return this._width
    }

    get height(): number {
        return this._height
    }

    /**
     * Initialize the renderer with a canvas element
     */
    async initialize(canvas: HTMLCanvasElement): Promise<void> {
        this._canvas = canvas
        const ctx = canvas.getContext("2d", {
            alpha: true,
            desynchronized: true,
        })

        if (!ctx) {
            throw RendererError.initFailed(
                "canvas2d",
                "Failed to get 2D rendering context from canvas",
            )
        }

        this._ctx = ctx
        this._width = canvas.width
        this._height = canvas.height
        this._isInitialized = true
    }

    /**
     * Resize the renderer viewport
     */
    resize(width: number, height: number): void {
        if (!this._canvas) {
            throw new Error("Renderer not initialized")
        }

        this._canvas.width = width
        this._canvas.height = height
        this._width = width
        this._height = height
    }

    /**
     * Begin a new frame
     */
    beginFrame(): void {
        // Clear any pending batches from previous frame
        this._batchManager.clear()
    }

    /**
     * End the current frame
     */
    endFrame(): void {
        // Flush any remaining batched operations
        this._flushBatches()
    }

    /**
     * Clear the canvas with an optional color
     */
    clear(color?: Color): void {
        if (!this._ctx) {
            throw new Error("Renderer not initialized")
        }

        if (color) {
            this._ctx.fillStyle = color.toRGBA()
            this._ctx.fillRect(0, 0, this._width, this._height)
        } else {
            this._ctx.clearRect(0, 0, this._width, this._height)
        }
    }

    /**
     * Clear a specific region of the canvas
     */
    clearRegion(region: Rectangle, color?: Color): void {
        if (!this._ctx) {
            throw new Error("Renderer not initialized")
        }

        if (color) {
            this._ctx.fillStyle = color.toRGBA()
            this._ctx.fillRect(region.x, region.y, region.width, region.height)
        } else {
            this._ctx.clearRect(region.x, region.y, region.width, region.height)
        }
    }

    /**
     * Draw a path with the specified paint
     */
    drawPath(path: Path, paint: Paint): void {
        if (!this._ctx) {
            throw new Error("Renderer not initialized")
        }

        if (path.isEmpty()) {
            return
        }

        // If batching is enabled, add to batch queue
        if (this._batchingEnabled && this._batchManager.isEnabled) {
            this._batchManager.addOperation({
                type: "path",
                path,
                paint,
                transform: this._getCurrentTransform(),
                opacity: this._getCurrentOpacity(),
            })
            return
        }

        // Otherwise, draw immediately
        this._drawPathImmediate(path, paint)
    }

    /**
     * Draw a path immediately without batching
     */
    private _drawPathImmediate(path: Path, paint: Paint): void {
        if (!this._ctx) {
            return
        }

        const ctx = this._ctx

        // Build the path
        ctx.beginPath()
        for (const cmd of path.commands) {
            switch (cmd.type) {
                case "M":
                    ctx.moveTo(cmd.x, cmd.y)
                    break
                case "L":
                    ctx.lineTo(cmd.x, cmd.y)
                    break
                case "C":
                    ctx.bezierCurveTo(
                        cmd.cp1x,
                        cmd.cp1y,
                        cmd.cp2x,
                        cmd.cp2y,
                        cmd.x,
                        cmd.y,
                    )
                    break
                case "Q":
                    ctx.quadraticCurveTo(cmd.cpx, cmd.cpy, cmd.x, cmd.y)
                    break
                case "Z":
                    ctx.closePath()
                    break
            }
        }

        // Apply paint
        this._applyPaint(paint)
    }

    /**
     * Draw a path stroke with the specified paint and width
     */
    drawStroke(path: Path, paint: Paint, strokeWidth: number): void {
        if (!this._ctx) {
            throw new Error("Renderer not initialized")
        }

        if (path.isEmpty() || strokeWidth <= 0) {
            return
        }

        // If batching is enabled, add to batch queue
        if (this._batchingEnabled && this._batchManager.isEnabled) {
            this._batchManager.addOperation({
                type: "stroke",
                path,
                paint,
                transform: this._getCurrentTransform(),
                opacity: this._getCurrentOpacity(),
                strokeWidth,
            })
            return
        }

        // Otherwise, draw immediately
        this._drawStrokeImmediate(path, paint, strokeWidth)
    }

    /**
     * Draw a stroke immediately without batching
     */
    private _drawStrokeImmediate(
        path: Path,
        paint: Paint,
        strokeWidth: number,
    ): void {
        if (!this._ctx) {
            return
        }

        const ctx = this._ctx

        // Build the path
        ctx.beginPath()
        for (const cmd of path.commands) {
            switch (cmd.type) {
                case "M":
                    ctx.moveTo(cmd.x, cmd.y)
                    break
                case "L":
                    ctx.lineTo(cmd.x, cmd.y)
                    break
                case "C":
                    ctx.bezierCurveTo(
                        cmd.cp1x,
                        cmd.cp1y,
                        cmd.cp2x,
                        cmd.cp2y,
                        cmd.x,
                        cmd.y,
                    )
                    break
                case "Q":
                    ctx.quadraticCurveTo(cmd.cpx, cmd.cpy, cmd.x, cmd.y)
                    break
                case "Z":
                    ctx.closePath()
                    break
            }
        }

        // Set stroke width
        ctx.lineWidth = strokeWidth

        // Apply stroke paint
        this._applyStrokePaint(paint)
    }

    /**
     * Draw an image with the specified transformation
     */
    drawImage(image: ImageAsset, transform: Matrix): void {
        if (!this._ctx) {
            throw new Error("Renderer not initialized")
        }

        const ctx = this._ctx

        ctx.save()

        // Apply transformation matrix
        ctx.setTransform(
            transform.a,
            transform.b,
            transform.c,
            transform.d,
            transform.tx,
            transform.ty,
        )

        // Draw the image at origin (transformation is already applied)
        ctx.drawImage(image.data, 0, 0, image.width, image.height)

        ctx.restore()
    }

    /**
     * Draw text at the specified position
     */
    drawText(text: string, font: Font, position: Vector2, paint: Paint): void {
        if (!this._ctx) {
            throw new Error("Renderer not initialized")
        }

        const ctx = this._ctx

        // Set font
        const fontStyle = font.style || "normal"
        const fontWeight = font.weight || "normal"
        ctx.font = `${fontStyle} ${fontWeight} ${font.size}px ${font.family}`

        // Apply paint for text
        if (paint.type === "solid" && paint.color) {
            ctx.fillStyle = paint.color.toRGBA()
            ctx.fillText(text, position.x, position.y)
        } else if (paint.type === "gradient" && paint.gradient) {
            const gradient = this._createGradient(paint.gradient)
            ctx.fillStyle = gradient
            ctx.fillText(text, position.x, position.y)
        }
    }

    /**
     * Save the current rendering state
     */
    save(): void {
        if (!this._ctx) {
            throw new Error("Renderer not initialized")
        }
        this._ctx.save()
    }

    /**
     * Restore the previous rendering state
     */
    restore(): void {
        if (!this._ctx) {
            throw new Error("Renderer not initialized")
        }
        this._ctx.restore()
    }

    /**
     * Apply a transformation matrix to the current rendering context
     */
    transform(matrix: Matrix): void {
        if (!this._ctx) {
            throw new Error("Renderer not initialized")
        }
        this._ctx.transform(
            matrix.a,
            matrix.b,
            matrix.c,
            matrix.d,
            matrix.tx,
            matrix.ty,
        )
    }

    /**
     * Set the global opacity for subsequent draw operations
     */
    setOpacity(opacity: number): void {
        if (!this._ctx) {
            throw new Error("Renderer not initialized")
        }
        this._ctx.globalAlpha = Math.max(0, Math.min(1, opacity))
    }

    /**
     * Get the current viewport bounds in world coordinates
     * For Canvas2D, this is the canvas dimensions
     */
    getViewportBounds(): Rectangle {
        if (!this._ctx) {
            throw new Error("Renderer not initialized")
        }

        // Get the current transform to convert viewport to world coordinates
        const transform = this._ctx.getTransform()

        // If there's a transform applied, we need to inverse transform the viewport
        // For now, return the canvas bounds in screen space
        // This assumes the renderer is rendering in screen space coordinates
        return new Rectangle(0, 0, this._width, this._height)
    }

    /**
     * Apply paint to the current path
     */
    private _applyPaint(paint: Paint): void {
        if (!this._ctx) {
            return
        }

        const ctx = this._ctx

        // Set blend mode
        ctx.globalCompositeOperation = this._getCompositeOperation(
            paint.blendMode,
        )

        if (paint.type === "solid" && paint.color) {
            // Solid color fill
            ctx.fillStyle = paint.color.toRGBA()
            ctx.fill()
        } else if (paint.type === "gradient" && paint.gradient) {
            // Gradient fill
            const gradient = this._createGradient(paint.gradient)
            ctx.fillStyle = gradient
            ctx.fill()
        }

        // Reset blend mode to normal
        ctx.globalCompositeOperation = "source-over"
    }

    /**
     * Apply paint to the current path as a stroke
     */
    private _applyStrokePaint(paint: Paint): void {
        if (!this._ctx) {
            return
        }

        const ctx = this._ctx

        // Set blend mode
        ctx.globalCompositeOperation = this._getCompositeOperation(
            paint.blendMode,
        )

        if (paint.type === "solid" && paint.color) {
            // Solid color stroke
            ctx.strokeStyle = paint.color.toRGBA()
            ctx.stroke()
        } else if (paint.type === "gradient" && paint.gradient) {
            // Gradient stroke
            const gradient = this._createGradient(paint.gradient)
            ctx.strokeStyle = gradient
            ctx.stroke()
        }

        // Reset blend mode to normal
        ctx.globalCompositeOperation = "source-over"
    }

    /**
     * Create a Canvas gradient from a Paint gradient
     */
    private _createGradient(
        gradient: NonNullable<Paint["gradient"]>,
    ): CanvasGradient {
        if (!this._ctx) {
            throw new Error("Renderer not initialized")
        }

        const ctx = this._ctx
        let canvasGradient: CanvasGradient

        if (gradient.type === "linear") {
            canvasGradient = ctx.createLinearGradient(
                gradient.start.x,
                gradient.start.y,
                gradient.end.x,
                gradient.end.y,
            )
        } else {
            // Radial gradient
            const focalX = gradient.focal?.x ?? gradient.center.x
            const focalY = gradient.focal?.y ?? gradient.center.y
            canvasGradient = ctx.createRadialGradient(
                focalX,
                focalY,
                0,
                gradient.center.x,
                gradient.center.y,
                gradient.radius,
            )
        }

        // Add color stops
        for (const stop of gradient.stops) {
            canvasGradient.addColorStop(stop.offset, stop.color.toRGBA())
        }

        return canvasGradient
    }

    /**
     * Map blend mode to Canvas composite operation
     */
    private _getCompositeOperation(
        blendMode: Paint["blendMode"],
    ): GlobalCompositeOperation {
        switch (blendMode) {
            case "normal":
                return "source-over"
            case "multiply":
                return "multiply"
            case "screen":
                return "screen"
            case "overlay":
                return "overlay"
            case "darken":
                return "darken"
            case "lighten":
                return "lighten"
            case "color-dodge":
                return "color-dodge"
            case "color-burn":
                return "color-burn"
            case "hard-light":
                return "hard-light"
            case "soft-light":
                return "soft-light"
            case "difference":
                return "difference"
            case "exclusion":
                return "exclusion"
            default:
                return "source-over"
        }
    }

    /**
     * Get the current transform matrix from the canvas context
     */
    private _getCurrentTransform(): Matrix {
        if (!this._ctx) {
            return new Matrix()
        }

        const domMatrix = this._ctx.getTransform()
        return new Matrix(
            domMatrix.a,
            domMatrix.b,
            domMatrix.c,
            domMatrix.d,
            domMatrix.e,
            domMatrix.f,
        )
    }

    /**
     * Get the current global opacity from the canvas context
     */
    private _getCurrentOpacity(): number {
        if (!this._ctx) {
            return 1.0
        }
        return this._ctx.globalAlpha
    }

    /**
     * Flush all batched draw operations
     * Groups operations by paint to minimize state changes
     */
    private _flushBatches(): void {
        if (!this._ctx) {
            return
        }

        const batches = this._batchManager.flush()

        // Process each batch
        for (const batch of batches) {
            // Set up paint state once for the entire batch
            const ctx = this._ctx

            // Save state before batch
            ctx.save()

            // Process all operations in this batch
            for (const op of batch.operations) {
                // Apply transform and opacity for this operation
                ctx.save()

                // Set transform
                ctx.setTransform(
                    op.transform.a,
                    op.transform.b,
                    op.transform.c,
                    op.transform.d,
                    op.transform.tx,
                    op.transform.ty,
                )

                // Set opacity
                ctx.globalAlpha = op.opacity

                // Draw the operation
                if (op.type === "path") {
                    this._drawPathImmediate(op.path, op.paint)
                } else if (
                    op.type === "stroke" &&
                    op.strokeWidth !== undefined
                ) {
                    this._drawStrokeImmediate(op.path, op.paint, op.strokeWidth)
                }

                ctx.restore()
            }

            // Restore state after batch
            ctx.restore()
        }
    }

    /**
     * Enable or disable draw call batching
     */
    setBatchingEnabled(enabled: boolean): void {
        this._batchingEnabled = enabled
        this._batchManager.setEnabled(enabled)

        // If disabling, flush any pending batches
        if (!enabled) {
            this._flushBatches()
        }
    }

    /**
     * Check if batching is enabled
     */
    get isBatchingEnabled(): boolean {
        return this._batchingEnabled
    }

    /**
     * Get batching statistics
     */
    getBatchStats(): { batchCount: number; operationCount: number } {
        return {
            batchCount: this._batchManager.batchCount,
            operationCount: this._batchManager.operationCount,
        }
    }
}
