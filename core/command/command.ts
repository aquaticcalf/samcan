interface Command<T = string> {
    name: string
    description: string
    execute: (args: T[]) => void
    undo: () => void
}

export type { Command }
