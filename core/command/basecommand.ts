import type {
    Command,
    CommandCategory,
    CommandValidationResult,
} from "./command"

/**
 * Abstract base class for commands that provides common functionality
 * and default implementations for validation
 */
abstract class BaseCommand<T = unknown> implements Command<T> {
    abstract name: string
    abstract description: string
    abstract category: CommandCategory
    canUndo = true

    abstract execute(args: T[]): void
    abstract undo(): void

    /**
     * Default validation implementation - can be overridden by subclasses
     * @param args Arguments to validate
     * @returns Validation result
     */
    validate(args: T[]): CommandValidationResult {
        // Default implementation - no validation errors
        return { valid: true }
    }

    /**
     * Helper method to create validation errors
     */
    protected createValidationError(
        ...errors: string[]
    ): CommandValidationResult {
        return {
            valid: false,
            errors,
        }
    }

    /**
     * Helper method to validate required arguments
     */
    protected validateRequiredArgs(
        args: T[],
        minCount: number,
    ): CommandValidationResult {
        if (args.length < minCount) {
            return this.createValidationError(
                `Expected at least ${minCount} argument(s), got ${args.length}`,
            )
        }
        return { valid: true }
    }
}

export { BaseCommand }
