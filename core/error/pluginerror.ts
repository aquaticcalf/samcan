import { ErrorCode, type ErrorContext, SamcanError } from "./samcanerror"

/**
 * Error thrown when plugin operations fail
 */
export class PluginError extends SamcanError {
    public readonly pluginName?: string
    public readonly pluginVersion?: string

    constructor(message: string, code: ErrorCode, context?: ErrorContext) {
        super(message, code, context)
        this.name = "PluginError"
        this.pluginName = context?.pluginName as string | undefined
        this.pluginVersion = context?.pluginVersion as string | undefined
    }

    /**
     * Create a plugin error
     */
    static error(
        pluginName: string,
        reason: string,
        cause?: Error,
    ): PluginError {
        return new PluginError(
            `Plugin '${pluginName}' error: ${reason}`,
            ErrorCode.PLUGIN_ERROR,
            { pluginName, reason, cause: cause?.message },
        )
    }

    /**
     * Create a plugin initialization failed error
     */
    static initFailed(
        pluginName: string,
        reason: string,
        cause?: Error,
    ): PluginError {
        return new PluginError(
            `Failed to initialize plugin '${pluginName}': ${reason}`,
            ErrorCode.PLUGIN_INIT_FAILED,
            { pluginName, reason, cause: cause?.message },
        )
    }

    /**
     * Create a plugin not found error
     */
    static notFound(pluginName: string): PluginError {
        return new PluginError(
            `Plugin not found: ${pluginName}`,
            ErrorCode.PLUGIN_NOT_FOUND,
            { pluginName },
        )
    }
}
