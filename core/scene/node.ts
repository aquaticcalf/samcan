import { Matrix } from "../math/matrix"
import { Rectangle } from "../math/rectangle"
import { Vector2 } from "../math/vector2"
import { Transform } from "./transform"

/**
 * Base class for all nodes in the scene graph
 * Manages hierarchy, transforms, visibility, and opacity
 */
export class SceneNode {
    private _parent: SceneNode | null = null
    private _children: SceneNode[] = []
    private _transform: Transform
    private _visible: boolean = true
    private _opacity: number = 1.0
    private _worldTransformDirty: boolean = true
    private _cachedWorldTransform: Matrix = Matrix.identity()
    private _boundsDirty: boolean = true
    private _cachedLocalBounds: Rectangle | null = null
    private _cachedWorldBounds: Rectangle | null = null
    private _isDirty: boolean = true

    constructor(transform?: Transform) {
        this._transform = transform || Transform.identity()
    }

    /**
     * Get the parent node
     */
    get parent(): SceneNode | null {
        return this._parent
    }

    /**
     * Get the children nodes
     */
    get children(): ReadonlyArray<SceneNode> {
        return this._children
    }

    /**
     * Get the local transform
     */
    get transform(): Transform {
        return this._transform
    }

    /**
     * Set the local transform
     */
    set transform(value: Transform) {
        this._transform = value
        this.markWorldTransformDirty()
        this.markBoundsDirty()
        this.markDirty()
    }

    /**
     * Get visibility state
     */
    get visible(): boolean {
        return this._visible
    }

    /**
     * Set visibility state
     */
    set visible(value: boolean) {
        if (this._visible !== value) {
            this._visible = value
            this.markDirty()
        }
    }

    /**
     * Get opacity (0.0 to 1.0)
     */
    get opacity(): number {
        return this._opacity
    }

    /**
     * Set opacity (0.0 to 1.0)
     */
    set opacity(value: number) {
        const newOpacity = Math.max(0, Math.min(1, value))
        if (this._opacity !== newOpacity) {
            this._opacity = newOpacity
            this.markDirty()
        }
    }

    /**
     * Add a child node to this node
     */
    addChild(child: SceneNode): void {
        if (child === this) {
            throw new Error("Cannot add a node as a child of itself")
        }

        if (child._parent === this) {
            return // Already a child
        }

        // Check for circular dependency
        let ancestor: SceneNode | null = this._parent
        while (ancestor !== null) {
            if (ancestor === child) {
                throw new Error(
                    "Cannot add an ancestor as a child (circular dependency)",
                )
            }
            ancestor = ancestor._parent
        }

        // Remove from previous parent
        if (child._parent !== null) {
            child._parent.removeChild(child)
        }

        // Add to this node
        this._children.push(child)
        child._parent = this
        child.markWorldTransformDirty()
    }

    /**
     * Remove a child node from this node
     */
    removeChild(child: SceneNode): boolean {
        const index = this._children.indexOf(child)
        if (index === -1) {
            return false
        }

        this._children.splice(index, 1)
        child._parent = null
        child.markWorldTransformDirty()
        return true
    }

    /**
     * Remove this node from its parent
     */
    removeFromParent(): boolean {
        if (this._parent === null) {
            return false
        }

        return this._parent.removeChild(this)
    }

    /**
     * Remove all children from this node
     */
    removeAllChildren(): void {
        const childrenCopy = [...this._children]
        for (const child of childrenCopy) {
            this.removeChild(child)
        }
    }

    /**
     * Get the world transform matrix (combines all ancestor transforms)
     */
    getWorldTransform(): Matrix {
        if (this._worldTransformDirty) {
            this._cachedWorldTransform = this.calculateWorldTransform()
            this._worldTransformDirty = false
        }
        return this._cachedWorldTransform
    }

    /**
     * Calculate the world transform by combining with parent transforms
     */
    private calculateWorldTransform(): Matrix {
        const localMatrix = this._transform.toMatrix()

        if (this._parent === null) {
            return localMatrix
        }

        return this._parent.getWorldTransform().multiply(localMatrix)
    }

    /**
     * Mark the world transform as dirty (needs recalculation)
     */
    private markWorldTransformDirty(): void {
        if (this._worldTransformDirty) {
            return // Already dirty
        }

        this._worldTransformDirty = true

        // Mark all descendants as dirty
        for (const child of this._children) {
            child.markWorldTransformDirty()
        }
    }

    /**
     * Get the world visibility (combines with parent visibility)
     */
    getWorldVisible(): boolean {
        if (!this._visible) {
            return false
        }

        if (this._parent === null) {
            return this._visible
        }

        return this._parent.getWorldVisible()
    }

    /**
     * Get the world opacity (combines with parent opacity)
     */
    getWorldOpacity(): number {
        if (this._parent === null) {
            return this._opacity
        }

        return this._opacity * this._parent.getWorldOpacity()
    }

    /**
     * Check if this node is a descendant of another node
     */
    isDescendantOf(node: SceneNode): boolean {
        let ancestor: SceneNode | null = this._parent
        while (ancestor !== null) {
            if (ancestor === node) {
                return true
            }
            ancestor = ancestor._parent
        }
        return false
    }

    /**
     * Get the depth of this node in the hierarchy (root = 0)
     */
    getDepth(): number {
        let depth = 0
        let ancestor: SceneNode | null = this._parent
        while (ancestor !== null) {
            depth++
            ancestor = ancestor._parent
        }
        return depth
    }

    /**
     * Test if a point (in world coordinates) hits this node
     * Base implementation returns false - subclasses should override
     */
    hitTest(worldPoint: Vector2): boolean {
        // Base implementation - no hit testing
        return false
    }

    /**
     * Test if a point (in world coordinates) hits this node or any of its children
     * Returns the deepest node that was hit, or null if no hit
     */
    hitTestRecursive(worldPoint: Vector2): SceneNode | null {
        // Skip if not visible
        if (!this.getWorldVisible()) {
            return null
        }

        // Test children first (front to back, reverse order)
        for (let i = this._children.length - 1; i >= 0; i--) {
            const child = this._children[i]
            if (!child) continue

            const hit = child.hitTestRecursive(worldPoint)
            if (hit !== null) {
                return hit
            }
        }

        // Test this node
        if (this.hitTest(worldPoint)) {
            return this
        }

        return null
    }

    /**
     * Get the local bounding box of this node (without transform applied)
     * Base implementation returns null - subclasses should override
     */
    getLocalBounds(): Rectangle | null {
        return null
    }

    /**
     * Get the world bounding box of this node (with transform applied)
     * Includes all children bounds
     */
    getWorldBounds(): Rectangle | null {
        if (!this._boundsDirty && this._cachedWorldBounds !== null) {
            return this._cachedWorldBounds
        }

        this._cachedWorldBounds = this.calculateWorldBounds()
        this._boundsDirty = false
        return this._cachedWorldBounds
    }

    /**
     * Calculate the world bounds by combining local bounds with children bounds
     */
    private calculateWorldBounds(): Rectangle | null {
        let bounds: Rectangle | null = null

        // Get local bounds and transform to world space
        const localBounds = this.getLocalBounds()
        if (localBounds !== null) {
            bounds = this.transformBoundsToWorld(localBounds)
        }

        // Include children bounds
        for (const child of this._children) {
            if (!child.visible) continue

            const childBounds = child.getWorldBounds()
            if (childBounds !== null) {
                bounds =
                    bounds === null ? childBounds : bounds.union(childBounds)
            }
        }

        return bounds
    }

    /**
     * Transform a local bounds rectangle to world space
     */
    private transformBoundsToWorld(localBounds: Rectangle): Rectangle {
        const worldTransform = this.getWorldTransform()

        // Transform all four corners of the rectangle
        const topLeft = worldTransform.transformPoint(
            new Vector2(localBounds.left, localBounds.top),
        )
        const topRight = worldTransform.transformPoint(
            new Vector2(localBounds.right, localBounds.top),
        )
        const bottomLeft = worldTransform.transformPoint(
            new Vector2(localBounds.left, localBounds.bottom),
        )
        const bottomRight = worldTransform.transformPoint(
            new Vector2(localBounds.right, localBounds.bottom),
        )

        // Find the axis-aligned bounding box of the transformed corners
        const minX = Math.min(
            topLeft.x,
            topRight.x,
            bottomLeft.x,
            bottomRight.x,
        )
        const maxX = Math.max(
            topLeft.x,
            topRight.x,
            bottomLeft.x,
            bottomRight.x,
        )
        const minY = Math.min(
            topLeft.y,
            topRight.y,
            bottomLeft.y,
            bottomRight.y,
        )
        const maxY = Math.max(
            topLeft.y,
            topRight.y,
            bottomLeft.y,
            bottomRight.y,
        )

        return new Rectangle(minX, minY, maxX - minX, maxY - minY)
    }

    /**
     * Mark the bounds as dirty (needs recalculation)
     */
    private markBoundsDirty(): void {
        if (this._boundsDirty) {
            return // Already dirty
        }

        this._boundsDirty = true

        // Mark parent bounds as dirty since our bounds changed
        if (this._parent !== null) {
            this._parent.markBoundsDirty()
        }
    }

    /**
     * Check if this node is dirty (needs redraw)
     */
    get isDirty(): boolean {
        return this._isDirty
    }

    /**
     * Mark this node as dirty (needs redraw)
     */
    markDirty(): void {
        if (this._isDirty) {
            return // Already dirty
        }

        this._isDirty = true

        // Mark parent as dirty since we changed
        if (this._parent !== null) {
            this._parent.markDirty()
        }
    }

    /**
     * Clear the dirty flag after rendering
     */
    clearDirty(): void {
        this._isDirty = false

        // Clear children dirty flags
        for (const child of this._children) {
            child.clearDirty()
        }
    }

    /**
     * Get the dirty region (world bounds of this node)
     * Returns null if not dirty or has no bounds
     */
    getDirtyRegion(): Rectangle | null {
        if (!this._isDirty) {
            return null
        }

        return this.getWorldBounds()
    }

    /**
     * Collect all dirty regions from this node and its children
     */
    collectDirtyRegions(regions: Rectangle[]): void {
        if (!this._isDirty) {
            return
        }

        // Add this node's bounds if it has any
        const bounds = this.getWorldBounds()
        if (bounds !== null) {
            regions.push(bounds)
        }

        // Collect from children
        for (const child of this._children) {
            child.collectDirtyRegions(regions)
        }
    }
}
