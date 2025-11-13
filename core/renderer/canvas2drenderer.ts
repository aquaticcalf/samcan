import type { Color } from "../math/color"
import type { Matrix } from "../math/matrix"
import type { Paint } from "../math/paint"
import type { Path } from "../math/path"
import type { Vector2 } from "../math/vector2"
import type {
    Font,
    ImageAsset,
    Renderer,
    RendererBackend,
    RendererCapabilities,
} from "./renderer"

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
            throw new Error("Failed to get 2D rendering context")
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
        // Canvas2D doesn't require explicit frame begin
    }

    /**
     * End the current frame
     */
    endFrame(): void {
        // Canvas2D doesn't require explicit frame end
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
     * Draw a path with the specified paint
     */
    drawPath(path: Path, paint: Paint): void {
        if (!this._ctx) {
            throw new Error("Renderer not initialized")
        }

        if (path.isEmpty()) {
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
}
