/**
 * Error codes for different failure types in the samcan system
 */
export enum ErrorCode {
    // File format and serialization errors (7.3)
    INVALID_FILE_FORMAT = "INVALID_FILE_FORMAT",
    UNSUPPORTED_VERSION = "UNSUPPORTED_VERSION",
    SERIALIZATION_FAILED = "SERIALIZATION_FAILED",
    DESERIALIZATION_FAILED = "DESERIALIZATION_FAILED",
    FILE_PARSE_ERROR = "FILE_PARSE_ERROR",

    // Renderer errors (2.2)
    RENDERER_INIT_FAILED = "RENDERER_INIT_FAILED",
    RENDERER_NOT_SUPPORTED = "RENDERER_NOT_SUPPORTED",
    WEBGL_CONTEXT_LOST = "WEBGL_CONTEXT_LOST",
    WEBGPU_NOT_AVAILABLE = "WEBGPU_NOT_AVAILABLE",
    CANVAS_NOT_FOUND = "CANVAS_NOT_FOUND",

    // Asset loading errors (10.5)
    ASSET_LOAD_FAILED = "ASSET_LOAD_FAILED",
    ASSET_NOT_FOUND = "ASSET_NOT_FOUND",
    INVALID_ASSET_TYPE = "INVALID_ASSET_TYPE",
    ASSET_DECODE_FAILED = "ASSET_DECODE_FAILED",
    FONT_LOAD_FAILED = "FONT_LOAD_FAILED",

    // Animation errors
    INVALID_ANIMATION_DATA = "INVALID_ANIMATION_DATA",
    TIMELINE_ERROR = "TIMELINE_ERROR",
    KEYFRAME_ERROR = "KEYFRAME_ERROR",
    STATE_MACHINE_ERROR = "STATE_MACHINE_ERROR",

    // Plugin errors
    PLUGIN_ERROR = "PLUGIN_ERROR",
    PLUGIN_INIT_FAILED = "PLUGIN_INIT_FAILED",
    PLUGIN_NOT_FOUND = "PLUGIN_NOT_FOUND",

    // General errors
    INVALID_OPERATION = "INVALID_OPERATION",
    INVALID_ARGUMENT = "INVALID_ARGUMENT",
    NOT_IMPLEMENTED = "NOT_IMPLEMENTED",
    UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Context information that can be attached to errors
 */
export interface ErrorContext {
    [key: string]: unknown
}

/**
 * Serialized error format for logging and transmission
 */
export interface SerializedError {
    name: string
    message: string
    code: ErrorCode
    context?: ErrorContext
    stack?: string
    timestamp: string
    cause?: SerializedError
}

/**
 * Base error class for all samcan errors
 * Provides error codes, context information, and serialization support
 */
export class SamcanError extends Error {
    public readonly code: ErrorCode
    public readonly context?: ErrorContext
    public readonly timestamp: Date

    constructor(message: string, code: ErrorCode, context?: ErrorContext) {
        super(message)
        this.name = "SamcanError"
        this.code = code
        this.context = context
        this.timestamp = new Date()

        // Maintains proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor)
        }
    }

    /**
     * Serialize the error to a plain object for logging or transmission
     */
    serialize(): SerializedError {
        const serialized: SerializedError = {
            name: this.name,
            message: this.message,
            code: this.code,
            timestamp: this.timestamp.toISOString(),
        }

        if (this.context) {
            serialized.context = this.context
        }

        if (this.stack) {
            serialized.stack = this.stack
        }

        // Serialize the cause if it exists
        if (this.cause) {
            if (this.cause instanceof SamcanError) {
                serialized.cause = this.cause.serialize()
            } else if (this.cause instanceof Error) {
                serialized.cause = {
                    name: this.cause.name,
                    message: this.cause.message,
                    code: ErrorCode.UNKNOWN_ERROR,
                    timestamp: new Date().toISOString(),
                    stack: this.cause.stack,
                }
            }
        }

        return serialized
    }

    /**
     * Convert the error to a JSON string for logging
     */
    toJSON(): string {
        return JSON.stringify(this.serialize(), null, 2)
    }

    /**
     * Create a formatted string representation of the error
     */
    override toString(): string {
        let str = `${this.name} [${this.code}]: ${this.message}`

        if (this.context && Object.keys(this.context).length > 0) {
            str += `\nContext: ${JSON.stringify(this.context)}`
        }

        return str
    }
}
