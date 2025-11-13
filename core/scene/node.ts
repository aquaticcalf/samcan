import { Matrix } from "../math/matrix"
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
        this._visible = value
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
        this._opacity = Math.max(0, Math.min(1, value))
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
}
