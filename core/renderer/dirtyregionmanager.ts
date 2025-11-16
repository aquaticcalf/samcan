import { Rectangle } from "../math/rectangle"

/**
 * Manages dirty regions for optimized rendering
 * Tracks changed areas and merges overlapping regions to minimize redraw operations
 */
export class DirtyRegionManager {
    private _dirtyRegions: Rectangle[] = []
    private _isDirty = false

    /**
     * Check if there are any dirty regions
     */
    get isDirty(): boolean {
        return this._isDirty
    }

    /**
     * Get all dirty regions
     */
    get regions(): ReadonlyArray<Rectangle> {
        return this._dirtyRegions
    }

    /**
     * Add a dirty region
     */
    addRegion(region: Rectangle): void {
        this._dirtyRegions.push(region)
        this._isDirty = true
    }

    /**
     * Add multiple dirty regions
     */
    addRegions(regions: Rectangle[]): void {
        this._dirtyRegions.push(...regions)
        if (regions.length > 0) {
            this._isDirty = true
        }
    }

    /**
     * Clear all dirty regions
     */
    clear(): void {
        this._dirtyRegions = []
        this._isDirty = false
    }

    /**
     * Optimize dirty regions by merging overlapping or adjacent rectangles
     * This reduces the number of redraw operations
     */
    optimize(): void {
        if (this._dirtyRegions.length <= 1) {
            return
        }

        // Sort regions by x coordinate for better merging
        this._dirtyRegions.sort((a, b) => a.x - b.x)

        const optimized: Rectangle[] = []
        let current = this._dirtyRegions[0]

        if (!current) {
            this._dirtyRegions = []
            return
        }

        for (let i = 1; i < this._dirtyRegions.length; i++) {
            const next = this._dirtyRegions[i]
            if (!next) continue

            // Check if regions overlap or are adjacent
            if (this._shouldMerge(current, next)) {
                // Merge regions
                current = current?.boundingBoxUnion(next)
            } else {
                // Save current and move to next
                optimized.push(current)
                current = next
            }
        }

        // Add the last region
        optimized.push(current)

        this._dirtyRegions = optimized
    }

    /**
     * Get a single bounding rectangle that encompasses all dirty regions
     * Useful when there are many small dirty regions
     */
    getBoundingRectangle(): Rectangle | null {
        if (this._dirtyRegions.length === 0) {
            return null
        }

        let bounds = this._dirtyRegions[0]
        if (!bounds) {
            return null
        }

        for (let i = 1; i < this._dirtyRegions.length; i++) {
            const region = this._dirtyRegions[i]
            if (region) {
                bounds = bounds?.boundingBoxUnion(region)
            }
        }

        return bounds
    }

    /**
     * Determine if two regions should be merged
     * Merges if they overlap or are close enough that merging is more efficient
     */
    private _shouldMerge(a: Rectangle, b: Rectangle): boolean {
        // Expand regions slightly to catch adjacent rectangles
        const threshold = 10 // pixels
        const expandedA = a.expand(threshold)

        return expandedA.intersects(b)
    }

    /**
     * Calculate the total area of all dirty regions
     */
    getTotalArea(): number {
        let totalArea = 0
        for (const region of this._dirtyRegions) {
            totalArea += region.width * region.height
        }
        return totalArea
    }

    /**
     * Determine if it's more efficient to redraw everything
     * Returns true if dirty regions cover more than the threshold percentage
     */
    shouldRedrawAll(
        viewportWidth: number,
        viewportHeight: number,
        threshold = 0.5,
    ): boolean {
        const viewportArea = viewportWidth * viewportHeight
        const dirtyArea = this.getTotalArea()
        return dirtyArea / viewportArea > threshold
    }
}
