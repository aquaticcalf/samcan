import type { Command } from "./command"

/**
 * Configuration options for CommandHistory
 */
interface CommandHistoryConfig {
    /**
     * Maximum number of commands to keep in history
     * Older commands are removed when this limit is reached
     * @default 100
     */
    maxHistorySize?: number
}

/**
 * Manages undo/redo history for commands
 *
 * CommandHistory maintains two stacks: one for undo operations and one for redo.
 * When a command is executed, it's pushed to the undo stack and the redo stack
 * is cleared. When undo is called, the command is moved from undo to redo stack.
 */
class CommandHistory {
    private _undoStack: Command[] = []
    private _redoStack: Command[] = []
    private _maxHistorySize: number

    constructor(config: CommandHistoryConfig = {}) {
        this._maxHistorySize = config.maxHistorySize ?? 100
    }

    /**
     * Execute a command and add it to the history
     * Clears the redo stack as new actions invalidate future history
     * @param command The command to execute
     * @param args Arguments to pass to the command
     */
    execute<T>(command: Command<T>, args: T[]): void {
        // Validate command if validation is implemented
        if (command.validate) {
            const result = command.validate(args)
            if (!result.valid) {
                throw new Error(
                    `Command validation failed: ${result.errors?.join(", ") ?? "Unknown error"}`,
                )
            }
        }

        // Execute the command
        command.execute(args)

        // Only add to history if the command can be undone
        if (command.canUndo) {
            this._undoStack.push(command)

            // Enforce history size limit
            if (this._undoStack.length > this._maxHistorySize) {
                this._undoStack.shift()
            }

            // Clear redo stack - new actions invalidate future history
            this._redoStack = []
        }
    }

    /**
     * Undo the most recent command
     * Moves the command from undo stack to redo stack
     * @throws Error if there are no commands to undo
     */
    undo(): void {
        const command = this._undoStack.pop()
        if (!command) {
            throw new Error("No commands to undo")
        }

        command.undo()
        this._redoStack.push(command)
    }

    /**
     * Redo the most recently undone command
     * Moves the command from redo stack back to undo stack
     * @throws Error if there are no commands to redo
     */
    redo(): void {
        const command = this._redoStack.pop()
        if (!command) {
            throw new Error("No commands to redo")
        }

        // Re-execute the command - commands should store their own state for redo
        command.execute([])
        this._undoStack.push(command)
    }

    /**
     * Clear all history (both undo and redo stacks)
     */
    clear(): void {
        this._undoStack = []
        this._redoStack = []
    }

    /**
     * Check if there are commands available to undo
     */
    get canUndo(): boolean {
        return this._undoStack.length > 0
    }

    /**
     * Check if there are commands available to redo
     */
    get canRedo(): boolean {
        return this._redoStack.length > 0
    }

    /**
     * Get the maximum history size
     */
    get maxHistorySize(): number {
        return this._maxHistorySize
    }

    /**
     * Set the maximum history size
     * If the new size is smaller than current history, oldest commands are removed
     */
    set maxHistorySize(size: number) {
        if (size < 1) {
            throw new Error("History size must be at least 1")
        }

        this._maxHistorySize = size

        // Trim undo stack if it exceeds new size
        while (this._undoStack.length > size) {
            this._undoStack.shift()
        }
    }

    /**
     * Get the number of commands in the undo stack
     */
    get undoCount(): number {
        return this._undoStack.length
    }

    /**
     * Get the number of commands in the redo stack
     */
    get redoCount(): number {
        return this._redoStack.length
    }
}

export { CommandHistory }
export type { CommandHistoryConfig }
