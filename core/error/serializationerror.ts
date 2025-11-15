import { ErrorCode, type ErrorContext, SamcanError } from "./samcanerror"

/**
 * Error thrown when serialization or deserialization fails
 * Requirement 7.3: File format validation and error handling
 */
export class SerializationError extends SamcanError {
    public readonly fileVersion?: string
    public readonly expectedVersion?: string

    constructor(message: string, code: ErrorCode, context?: ErrorContext) {
        super(message, code, context)
        this.name = "SerializationError"
        this.fileVersion = context?.fileVersion as string | undefined
        this.expectedVersion = context?.expectedVersion as string | undefined
    }

    /**
     * Create an invalid file format error
     */
    static invalidFormat(
        reason: string,
        context?: ErrorContext,
    ): SerializationError {
        return new SerializationError(
            `Invalid file format: ${reason}`,
            ErrorCode.INVALID_FILE_FORMAT,
            context,
        )
    }

    /**
     * Create an unsupported version error
     */
    static unsupportedVersion(
        fileVersion: string,
        expectedVersion: string,
    ): SerializationError {
        return new SerializationError(
            `Unsupported file version: ${fileVersion} (expected ${expectedVersion})`,
            ErrorCode.UNSUPPORTED_VERSION,
            { fileVersion, expectedVersion },
        )
    }

    /**
     * Create a file parse error
     */
    static parseError(reason: string, cause?: Error): SerializationError {
        return new SerializationError(
            `Failed to parse file: ${reason}`,
            ErrorCode.FILE_PARSE_ERROR,
            { reason, cause: cause?.message },
        )
    }

    /**
     * Create a serialization failed error
     */
    static serializationFailed(
        reason: string,
        context?: ErrorContext,
    ): SerializationError {
        return new SerializationError(
            `Serialization failed: ${reason}`,
            ErrorCode.SERIALIZATION_FAILED,
            context,
        )
    }

    /**
     * Create a deserialization failed error
     */
    static deserializationFailed(
        reason: string,
        context?: ErrorContext,
    ): SerializationError {
        return new SerializationError(
            `Deserialization failed: ${reason}`,
            ErrorCode.DESERIALIZATION_FAILED,
            context,
        )
    }
}
