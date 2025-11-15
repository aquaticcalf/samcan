import { ErrorCode, type ErrorContext, SamcanError } from "./samcanerror"

/**
 * Error thrown when asset loading or management fails
 * Requirement 10.5: Asset loading error handling
 */
export class AssetError extends SamcanError {
    public readonly assetId?: string
    public readonly assetUrl?: string
    public readonly assetType?: string

    constructor(message: string, code: ErrorCode, context?: ErrorContext) {
        super(message, code, context)
        this.name = "AssetError"
        this.assetId = context?.assetId as string | undefined
        this.assetUrl = context?.assetUrl as string | undefined
        this.assetType = context?.assetType as string | undefined
    }

    /**
     * Create an asset load failed error
     */
    static loadFailed(
        assetUrl: string,
        assetType: string,
        reason: string,
        cause?: Error,
    ): AssetError {
        return new AssetError(
            `Failed to load ${assetType} asset from ${assetUrl}: ${reason}`,
            ErrorCode.ASSET_LOAD_FAILED,
            { assetUrl, assetType, reason, cause: cause?.message },
        )
    }

    /**
     * Create an asset not found error
     */
    static notFound(assetId: string): AssetError {
        return new AssetError(
            `Asset not found: ${assetId}`,
            ErrorCode.ASSET_NOT_FOUND,
            { assetId },
        )
    }

    /**
     * Create an invalid asset type error
     */
    static invalidType(assetType: string, expectedType: string): AssetError {
        return new AssetError(
            `Invalid asset type: expected ${expectedType}, got ${assetType}`,
            ErrorCode.INVALID_ASSET_TYPE,
            { assetType, expectedType },
        )
    }

    /**
     * Create an asset decode failed error
     */
    static decodeFailed(
        assetUrl: string,
        reason: string,
        cause?: Error,
    ): AssetError {
        return new AssetError(
            `Failed to decode asset from ${assetUrl}: ${reason}`,
            ErrorCode.ASSET_DECODE_FAILED,
            { assetUrl, reason, cause: cause?.message },
        )
    }

    /**
     * Create a font load failed error
     */
    static fontLoadFailed(
        fontFamily: string,
        reason: string,
        cause?: Error,
    ): AssetError {
        return new AssetError(
            `Failed to load font '${fontFamily}': ${reason}`,
            ErrorCode.FONT_LOAD_FAILED,
            { fontFamily, reason, cause: cause?.message },
        )
    }
}
