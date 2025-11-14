import type { Color } from "../math/color"
import type { Matrix } from "../math/matrix"
import type { Paint } from "../math/paint"
import type { Path } from "../math/path"
import type { Vector2 } from "../math/vector2"

/**
 * Supported rendering backend types
 */
export type RendererBackend = "canvas2d" | "webgl" | "webgpu"

/**
 * Renderer capabilities for feature detection
 */
export interface RendererCapabilities {
    /** Maximum texture size supported by the backend */
    maxTextureSize: number

    /** Whether the backend supports blend modes */
    supportsBlendModes: boolean

    /** Whether the backend supports filters (blur, etc.) */
    supportsFilters: boolean

    /** Whether the backend supports advanced path operations */
    supportsAdvancedPaths: boolean

    /** Whether the backend supports hardware acceleration */
    supportsHardwareAcceleration: boolean
}

/**
 * Image asset interface for rendering
 */
export interface ImageAsset {
    readonly width: number
    readonly height: number
    readonly data: HTMLImageElement | ImageBitmap
}

/**
 * Font interface for text rendering
 */
export interface Font {
    readonly family: string
    readonly size: number
    readonly weight?: string
    readonly style?: string
}

/**
 * Renderer interface providing a unified abstraction across different rendering backends
 * (Canvas2D, WebGL, WebGPU)
 */
export interface Renderer {
    /**
     * Initialize the renderer with a canvas element
     * @param canvas - The HTML canvas element to render to
     * @returns Promise that resolves when initialization is complete
     */
    initialize(canvas: HTMLCanvasElement): Promise<void>

    /**
     * Resize the renderer viewport
     * @param width - New width in pixels
     * @param height - New height in pixels
     */
    resize(width: number, height: number): void

    /**
     * Begin a new frame
     * Should be called at the start of each render cycle
     */
    beginFrame(): void

    /**
     * End the current frame and present to screen
     * Should be called at the end of each render cycle
     */
    endFrame(): void

    /**
     * Clear the canvas with an optional color
     * @param color - Optional color to clear with (defaults to transparent)
     */
    clear(color?: Color): void

    /**
     * Draw a path with the specified paint
     * @param path - The path to draw
     * @param paint - The paint to use for filling or stroking
     */
    drawPath(path: Path, paint: Paint): void

    /**
     * Draw a path stroke with the specified paint and width
     * @param path - The path to stroke
     * @param paint - The paint to use for stroking
     * @param strokeWidth - The width of the stroke
     */
    drawStroke(path: Path, paint: Paint, strokeWidth: number): void

    /**
     * Draw an image with the specified transformation
     * @param image - The image asset to draw
     * @param transform - Transformation matrix to apply
     */
    drawImage(image: ImageAsset, transform: Matrix): void

    /**
     * Draw text at the specified position
     * @param text - The text string to draw
     * @param font - Font configuration
     * @param position - Position to draw the text
     * @param paint - Paint to use for the text
     */
    drawText(text: string, font: Font, position: Vector2, paint: Paint): void

    /**
     * Save the current rendering state
     * Pushes the current transform, clip, and other state onto a stack
     */
    save(): void

    /**
     * Restore the previous rendering state
     * Pops the most recent state from the stack
     */
    restore(): void

    /**
     * Apply a transformation matrix to the current rendering context
     * @param matrix - The transformation matrix to apply
     */
    transform(matrix: Matrix): void

    /**
     * Set the global opacity for subsequent draw operations
     * @param opacity - Opacity value from 0 (transparent) to 1 (opaque)
     */
    setOpacity(opacity: number): void

    /**
     * Get the rendering backend type
     */
    readonly backend: RendererBackend

    /**
     * Get the renderer capabilities
     */
    readonly capabilities: RendererCapabilities

    /**
     * Check if the renderer is initialized and ready to render
     */
    readonly isInitialized: boolean

    /**
     * Get the current canvas width
     */
    readonly width: number

    /**
     * Get the current canvas height
     */
    readonly height: number
}
