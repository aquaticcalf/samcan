/**
 * Category for grouping related commands in the editor UI
 */
type CommandCategory =
    | "scene" // Scene graph operations (add/remove nodes)
    | "transform" // Transform operations (move, rotate, scale)
    | "animation" // Animation operations (keyframes, timeline)
    | "property" // Property modifications
    | "asset" // Asset management operations
    | "other" // Uncategorized commands

/**
 * Result of command validation
 */
interface CommandValidationResult {
    valid: boolean
    errors?: string[]
}

/**
 * Command interface for implementing undo/redo operations in the editor
 *
 * Commands encapsulate operations that modify animation data and can be
 * reversed. Each command stores sufficient state to both execute and undo
 * the operation.
 */
interface Command<T = unknown> {
    /**
     * Unique identifier for the command type
     */
    name: string

    /**
     * Human-readable description of what the command does
     */
    description: string

    /**
     * Category for organizing commands in the UI
     */
    category: CommandCategory

    /**
     * Whether this command can be undone
     * Some commands (like save, export) cannot be undone
     */
    canUndo: boolean

    /**
     * Execute the command with the given arguments
     * @param args Arguments required for command execution
     */
    execute(args: T[]): void

    /**
     * Undo the command, restoring the previous state
     * Only called if canUndo is true
     */
    undo(): void

    /**
     * Validate the command arguments before execution
     * @param args Arguments to validate
     * @returns Validation result with any error messages
     */
    validate?(args: T[]): CommandValidationResult
}

export type { Command, CommandCategory, CommandValidationResult }
