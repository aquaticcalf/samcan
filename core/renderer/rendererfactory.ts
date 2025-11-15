import { Canvas2DRenderer } from "./canvas2drenderer"
import { WebGLRenderer } from "./webglrenderer"
import type { Renderer, RendererBackend } from "./renderer"
import { RendererError } from "../error/renderererror"
import { getLogger } from "../animation/logger"

/**
 * Factory for creating renderer instances with automatic fallback logic
 */
export class RendererFactory {
    /**
     * Default fallback order for renderer backends
     */
    private static readonly DEFAULT_FALLBACK_ORDER: RendererBackend[] = [
        "webgpu",
        "webgl",
        "canvas2d",
    ]

    /**
     * Create a renderer with the specified preferences and fallback logic
     *
     * @param canvas - The canvas element to render to
     * @param preferredBackend - Optional preferred backend to try first
     * @param fallbackOrder - Optional custom fallback order (defaults to WebGPU → WebGL → Canvas2D)
     * @returns Promise resolving to an initialized renderer
     * @throws RendererError if all backends fail to initialize
     */
    static async create(
        canvas: HTMLCanvasElement,
        preferredBackend?: RendererBackend,
        fallbackOrder: RendererBackend[] = RendererFactory.DEFAULT_FALLBACK_ORDER,
    ): Promise<Renderer> {
        // Build the list of backends to try
        const backendsToTry = this._buildBackendList(
            preferredBackend,
            fallbackOrder,
        )

        const errors: Array<{ backend: RendererBackend; error: Error }> = []
        let attemptedBackends: RendererBackend[] = []

        // Try each backend in order
        for (const backend of backendsToTry) {
            attemptedBackends.push(backend)

            try {
                const renderer = await this._createBackend(backend, canvas)
                if (renderer) {
                    // Emit warning if we didn't get the preferred backend
                    if (
                        preferredBackend &&
                        backend !== preferredBackend &&
                        errors.length > 0
                    ) {
                        const failedBackends = errors
                            .map((e) => e.backend)
                            .join(", ")
                        const firstError = errors[0]?.error

                        getLogger().warn(
                            `[samcan] Renderer fallback: Preferred backend "${preferredBackend}" failed to initialize. ` +
                                `Falling back to "${backend}". ` +
                                `Failed backends: ${failedBackends}`,
                        )

                        // Log the first error for debugging
                        if (firstError) {
                            getLogger().warn(
                                `[samcan] First initialization error:`,
                                firstError,
                            )
                        }
                    }
                    return renderer
                }
            } catch (error) {
                const errorObj =
                    error instanceof Error ? error : new Error(String(error))

                errors.push({
                    backend,
                    error: errorObj,
                })

                // Emit warning for each failed backend attempt
                getLogger().warn(
                    `[samcan] Failed to initialize ${backend} renderer: ${errorObj.message}`,
                )
            }
        }

        // All backends failed - create comprehensive error
        const errorMessages = errors
            .map((e) => `${e.backend}: ${e.error.message}`)
            .join("; ")

        const firstError = errors[0]?.error

        throw RendererError.initFailed(
            attemptedBackends.join(" → "),
            `All renderer backends failed. Attempted: ${attemptedBackends.join(", ")}. Errors: ${errorMessages}`,
            firstError,
        )
    }

    /**
     * Check if a specific backend is available in the current environment
     *
     * @param backend - The backend to check
     * @returns true if the backend is available
     */
    static isBackendAvailable(backend: RendererBackend): boolean {
        switch (backend) {
            case "canvas2d":
                return this._isCanvas2DAvailable()
            case "webgl":
                return this._isWebGLAvailable()
            case "webgpu":
                return this._isWebGPUAvailable()
            default:
                return false
        }
    }

    /**
     * Get a list of all available backends in the current environment
     *
     * @returns Array of available backend names
     */
    static getAvailableBackends(): RendererBackend[] {
        const backends: RendererBackend[] = []

        if (this._isWebGPUAvailable()) {
            backends.push("webgpu")
        }
        if (this._isWebGLAvailable()) {
            backends.push("webgl")
        }
        if (this._isCanvas2DAvailable()) {
            backends.push("canvas2d")
        }

        return backends
    }

    /**
     * Build the list of backends to try based on preferences and fallback order
     */
    private static _buildBackendList(
        preferredBackend: RendererBackend | undefined,
        fallbackOrder: RendererBackend[],
    ): RendererBackend[] {
        if (!preferredBackend) {
            return [...fallbackOrder]
        }

        // Put preferred backend first, then add remaining from fallback order
        const backends = [preferredBackend]
        for (const backend of fallbackOrder) {
            if (backend !== preferredBackend && !backends.includes(backend)) {
                backends.push(backend)
            }
        }

        return backends
    }

    /**
     * Create a renderer instance for the specified backend
     */
    private static async _createBackend(
        backend: RendererBackend,
        canvas: HTMLCanvasElement,
    ): Promise<Renderer | null> {
        // Check if backend is available before attempting to create
        if (!this.isBackendAvailable(backend)) {
            throw RendererError.notSupported(backend)
        }

        switch (backend) {
            case "canvas2d":
                return this._createCanvas2DRenderer(canvas)
            case "webgl":
                return this._createWebGLRenderer(canvas)
            case "webgpu":
                return this._createWebGPURenderer(canvas)
            default:
                throw RendererError.notSupported(backend)
        }
    }

    /**
     * Create a Canvas2D renderer
     */
    private static async _createCanvas2DRenderer(
        canvas: HTMLCanvasElement,
    ): Promise<Renderer> {
        try {
            const renderer = new Canvas2DRenderer()
            await renderer.initialize(canvas)
            return renderer
        } catch (error) {
            throw RendererError.initFailed(
                "canvas2d",
                error instanceof Error ? error.message : String(error),
                error instanceof Error ? error : undefined,
            )
        }
    }

    /**
     * Create a WebGL renderer
     */
    private static async _createWebGLRenderer(
        canvas: HTMLCanvasElement,
    ): Promise<Renderer> {
        try {
            const renderer = new WebGLRenderer()
            await renderer.initialize(canvas)
            return renderer
        } catch (error) {
            throw RendererError.initFailed(
                "webgl",
                error instanceof Error ? error.message : String(error),
                error instanceof Error ? error : undefined,
            )
        }
    }

    /**
     * Create a WebGPU renderer (placeholder for future implementation)
     */
    private static async _createWebGPURenderer(
        _canvas: HTMLCanvasElement,
    ): Promise<Renderer> {
        throw RendererError.initFailed(
            "webgpu",
            "WebGPU renderer not yet implemented",
        )
    }

    /**
     * Check if Canvas2D is available
     */
    private static _isCanvas2DAvailable(): boolean {
        if (typeof document === "undefined") {
            return false
        }

        try {
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")
            return ctx !== null
        } catch {
            return false
        }
    }

    /**
     * Check if WebGL is available
     */
    private static _isWebGLAvailable(): boolean {
        if (typeof document === "undefined") {
            return false
        }

        try {
            const canvas = document.createElement("canvas")
            const ctx =
                canvas.getContext("webgl") ||
                canvas.getContext("experimental-webgl")
            return ctx !== null
        } catch {
            return false
        }
    }

    /**
     * Check if WebGPU is available
     */
    private static _isWebGPUAvailable(): boolean {
        if (typeof navigator === "undefined") {
            return false
        }

        return "gpu" in navigator
    }
}
