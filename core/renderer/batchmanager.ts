import type { Paint } from "../math/paint"
import type { Path } from "../math/path"
import type { Matrix } from "../math/matrix"

/**
 * Types of draw operations that can be batched
 */
export type DrawOperationType = "path" | "stroke"

/**
 * A single draw operation to be batched
 */
export interface DrawOperation {
    type: DrawOperationType
    path: Path
    paint: Paint
    transform: Matrix
    opacity: number
    strokeWidth?: number
}

/**
 * A batch of draw operations with the same paint properties
 */
export interface DrawBatch {
    paint: Paint
    operations: DrawOperation[]
}

/**
 * Manages batching of draw operations to reduce state changes
 * Groups operations with the same paint properties together
 */
export class BatchManager {
    private _batches: DrawBatch[] = []
    private _currentBatch: DrawBatch | null = null
    private _enabled = true

    /**
     * Enable or disable batching
     */
    setEnabled(enabled: boolean): void {
        this._enabled = enabled
        if (!enabled) {
            this.clear()
        }
    }

    /**
     * Check if batching is enabled
     */
    get isEnabled(): boolean {
        return this._enabled
    }

    /**
     * Add a draw operation to the batch queue
     */
    addOperation(operation: DrawOperation): void {
        if (!this._enabled) {
            return
        }

        // Check if we can add to the current batch
        if (
            this._currentBatch &&
            this._canBatch(this._currentBatch.paint, operation.paint)
        ) {
            this._currentBatch.operations.push(operation)
        } else {
            // Start a new batch
            this._currentBatch = {
                paint: operation.paint,
                operations: [operation],
            }
            this._batches.push(this._currentBatch)
        }
    }

    /**
     * Get all batches and clear the queue
     */
    flush(): DrawBatch[] {
        const batches = this._batches
        this._batches = []
        this._currentBatch = null
        return batches
    }

    /**
     * Clear all batches without returning them
     */
    clear(): void {
        this._batches = []
        this._currentBatch = null
    }

    /**
     * Get the number of batches
     */
    get batchCount(): number {
        return this._batches.length
    }

    /**
     * Get the total number of operations across all batches
     */
    get operationCount(): number {
        return this._batches.reduce(
            (sum, batch) => sum + batch.operations.length,
            0,
        )
    }

    /**
     * Check if two paints can be batched together
     * Paints can be batched if they have the same properties
     */
    private _canBatch(paint1: Paint, paint2: Paint): boolean {
        // Use the Paint.equals method to check if paints are equivalent
        return paint1.equals(paint2)
    }
}
