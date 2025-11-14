import { describe, expect, it, beforeEach } from "bun:test"
import { CommandHistory } from "../core/command"
import type { Command } from "../core/command"

// Mock command for testing
class MockCommand implements Command<number> {
    name = "MockCommand"
    description = "A mock command for testing"
    category = "other" as const
    canUndo = true
    private _executedValue = 0
    private _previousValue = 0
    private _storedArgs: number[] = []

    execute(args: number[]): void {
        // Store args for redo
        if (args.length > 0) {
            this._storedArgs = args
        }
        this._previousValue = this._executedValue
        this._executedValue = this._storedArgs[0] ?? 0
    }

    undo(): void {
        const temp = this._executedValue
        this._executedValue = this._previousValue
        this._previousValue = temp
    }

    get executedValue(): number {
        return this._executedValue
    }
}

// Non-undoable command for testing
class NonUndoableCommand implements Command<string> {
    name = "NonUndoableCommand"
    description = "A command that cannot be undone"
    category = "other" as const
    canUndo = false
    private _executed = false

    execute(args: string[]): void {
        this._executed = true
    }

    undo(): void {
        // Should never be called
    }

    get executed(): boolean {
        return this._executed
    }
}

// Command with validation
class ValidatedCommand implements Command<number> {
    name = "ValidatedCommand"
    description = "A command with validation"
    category = "other" as const
    canUndo = true
    private _value = 0

    execute(args: number[]): void {
        this._value = args[0] ?? 0
    }

    undo(): void {
        this._value = 0
    }

    validate(args: number[]) {
        if (args.length === 0 || args[0] === undefined) {
            return { valid: false, errors: ["Value is required"] }
        }
        if (args[0] < 0) {
            return { valid: false, errors: ["Value must be non-negative"] }
        }
        return { valid: true }
    }

    get value(): number {
        return this._value
    }
}

describe("CommandHistory", () => {
    let history: CommandHistory

    beforeEach(() => {
        history = new CommandHistory()
    })

    describe("Basic Execution", () => {
        it("should execute a command", () => {
            const command = new MockCommand()
            history.execute(command, [42])

            expect(command.executedValue).toBe(42)
        })

        it("should add undoable commands to history", () => {
            const command = new MockCommand()
            history.execute(command, [42])

            expect(history.canUndo).toBe(true)
            expect(history.undoCount).toBe(1)
        })

        it("should not add non-undoable commands to history", () => {
            const command = new NonUndoableCommand()
            history.execute(command, ["test"])

            expect(command.executed).toBe(true)
            expect(history.canUndo).toBe(false)
            expect(history.undoCount).toBe(0)
        })
    })

    describe("Undo Operations", () => {
        it("should undo a command", () => {
            const command = new MockCommand()
            history.execute(command, [42])
            history.undo()

            expect(command.executedValue).toBe(0)
        })

        it("should move command to redo stack after undo", () => {
            const command = new MockCommand()
            history.execute(command, [42])
            history.undo()

            expect(history.canUndo).toBe(false)
            expect(history.canRedo).toBe(true)
            expect(history.redoCount).toBe(1)
        })

        it("should throw error when undoing with empty history", () => {
            expect(() => history.undo()).toThrow("No commands to undo")
        })

        it("should undo multiple commands in reverse order", () => {
            const command1 = new MockCommand()
            const command2 = new MockCommand()

            history.execute(command1, [10])
            history.execute(command2, [20])

            history.undo()
            expect(command2.executedValue).toBe(0)
            expect(command1.executedValue).toBe(10)

            history.undo()
            expect(command1.executedValue).toBe(0)
        })
    })

    describe("Redo Operations", () => {
        it("should redo a command", () => {
            const command = new MockCommand()
            history.execute(command, [42])
            history.undo()
            history.redo()

            expect(command.executedValue).toBe(42)
        })

        it("should move command back to undo stack after redo", () => {
            const command = new MockCommand()
            history.execute(command, [42])
            history.undo()
            history.redo()

            expect(history.canUndo).toBe(true)
            expect(history.canRedo).toBe(false)
            expect(history.undoCount).toBe(1)
        })

        it("should throw error when redoing with empty redo stack", () => {
            expect(() => history.redo()).toThrow("No commands to redo")
        })

        it("should clear redo stack when new command is executed", () => {
            const command1 = new MockCommand()
            const command2 = new MockCommand()

            history.execute(command1, [10])
            history.undo()
            expect(history.canRedo).toBe(true)

            history.execute(command2, [20])
            expect(history.canRedo).toBe(false)
            expect(history.redoCount).toBe(0)
        })
    })

    describe("History Size Limit", () => {
        it("should respect default history size limit", () => {
            const defaultHistory = new CommandHistory()
            expect(defaultHistory.maxHistorySize).toBe(100)
        })

        it("should respect custom history size limit", () => {
            const customHistory = new CommandHistory({ maxHistorySize: 5 })
            expect(customHistory.maxHistorySize).toBe(5)
        })

        it("should remove oldest commands when limit is reached", () => {
            const smallHistory = new CommandHistory({ maxHistorySize: 3 })
            const command1 = new MockCommand()
            const command2 = new MockCommand()
            const command3 = new MockCommand()
            const command4 = new MockCommand()

            smallHistory.execute(command1, [1])
            smallHistory.execute(command2, [2])
            smallHistory.execute(command3, [3])
            smallHistory.execute(command4, [4])

            expect(smallHistory.undoCount).toBe(3)

            // Undo should start from command4, not command1
            smallHistory.undo()
            expect(command4.executedValue).toBe(0)
        })

        it("should update history size dynamically", () => {
            history.maxHistorySize = 50
            expect(history.maxHistorySize).toBe(50)
        })

        it("should trim history when size is reduced", () => {
            const command1 = new MockCommand()
            const command2 = new MockCommand()
            const command3 = new MockCommand()

            history.execute(command1, [1])
            history.execute(command2, [2])
            history.execute(command3, [3])

            history.maxHistorySize = 2
            expect(history.undoCount).toBe(2)
        })

        it("should throw error when setting invalid history size", () => {
            expect(() => {
                history.maxHistorySize = 0
            }).toThrow("History size must be at least 1")
        })
    })

    describe("Command Validation", () => {
        it("should validate command before execution", () => {
            const command = new ValidatedCommand()
            history.execute(command, [42])

            expect(command.value).toBe(42)
        })

        it("should throw error for invalid command arguments", () => {
            const command = new ValidatedCommand()

            expect(() => history.execute(command, [])).toThrow(
                "Command validation failed: Value is required",
            )
        })

        it("should throw error with validation error messages", () => {
            const command = new ValidatedCommand()

            expect(() => history.execute(command, [-5])).toThrow(
                "Command validation failed: Value must be non-negative",
            )
        })
    })

    describe("Clear Operations", () => {
        it("should clear all history", () => {
            const command1 = new MockCommand()
            const command2 = new MockCommand()

            history.execute(command1, [10])
            history.execute(command2, [20])
            history.undo()

            history.clear()

            expect(history.canUndo).toBe(false)
            expect(history.canRedo).toBe(false)
            expect(history.undoCount).toBe(0)
            expect(history.redoCount).toBe(0)
        })
    })

    describe("State Queries", () => {
        it("should report correct undo count", () => {
            const command1 = new MockCommand()
            const command2 = new MockCommand()

            expect(history.undoCount).toBe(0)

            history.execute(command1, [10])
            expect(history.undoCount).toBe(1)

            history.execute(command2, [20])
            expect(history.undoCount).toBe(2)
        })

        it("should report correct redo count", () => {
            const command1 = new MockCommand()
            const command2 = new MockCommand()

            history.execute(command1, [10])
            history.execute(command2, [20])

            expect(history.redoCount).toBe(0)

            history.undo()
            expect(history.redoCount).toBe(1)

            history.undo()
            expect(history.redoCount).toBe(2)
        })

        it("should report canUndo correctly", () => {
            const command = new MockCommand()

            expect(history.canUndo).toBe(false)

            history.execute(command, [10])
            expect(history.canUndo).toBe(true)

            history.undo()
            expect(history.canUndo).toBe(false)
        })

        it("should report canRedo correctly", () => {
            const command = new MockCommand()

            expect(history.canRedo).toBe(false)

            history.execute(command, [10])
            expect(history.canRedo).toBe(false)

            history.undo()
            expect(history.canRedo).toBe(true)

            history.redo()
            expect(history.canRedo).toBe(false)
        })
    })
})
