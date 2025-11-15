export interface Logger {
    error(...args: any[]): void
    warn(...args: any[]): void
    info(...args: any[]): void
}

class ConsoleLogger implements Logger {
    error(...args: any[]): void {
        console.error(...args)
    }
    warn(...args: any[]): void {
        console.warn(...args)
    }
    info(...args: any[]): void {
        console.log(...args)
    }
}

// Default shared logger instance
let currentLogger: Logger = new ConsoleLogger()

export function setLogger(logger: Logger | null) {
    currentLogger = logger || new ConsoleLogger()
}

export function getLogger(): Logger {
    return currentLogger
}
