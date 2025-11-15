import { ErrorCode, type ErrorContext, SamcanError } from "./samcanerror"

/**
 * Error thrown when renderer initialization or operations fail
 * Requirement 2.2: Renderer fallback and error handling
 */
export class RendererError extends SamcanError {
    public readonly backend?: string

    constructor(message: string, code: ErrorCode, context?: ErrorContext) {
        super(message, code, context)
        this.name = "RendererError"
        this.backend = context?.backend as string | undefined
    }

    /**
     * Create a renderer initialization error
     */
    static initFailed(
        backend: string,
        reason: string,
        cause?: Error,
    ): RendererError {
        return new RendererError(
            `Failed to initialize ${backend} renderer: ${reason}`,
            ErrorCode.RENDERER_INIT_FAILED,
            { backend, reason, cause: cause?.message },
        )
    }

    /**
     * Create a renderer not supported error
     */
    static notSupported(backend: string): RendererError {
        return new RendererError(
            `Renderer backend '${backend}' is not supported in this environment`,
            ErrorCode.RENDERER_NOT_SUPPORTED,
            { backend },
        )
    }

    /**
     * Create a WebGL context lost error
     */
    static contextLost(): RendererError {
        return new RendererError(
            "WebGL context was lost",
            ErrorCode.WEBGL_CONTEXT_LOST,
            { recoverable: true },
        )
    }

    /**
     * Create a canvas not found error
     */
    static canvasNotFound(selector?: string): RendererError {
        return new RendererError(
            selector
                ? `Canvas element not found: ${selector}`
                : "Canvas element not provided",
            ErrorCode.CANVAS_NOT_FOUND,
            { selector },
        )
    }
}
