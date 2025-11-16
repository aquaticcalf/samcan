import { Vector2 } from "./vector2"

/**
 * Rectangle class for bounding boxes and spatial operations
 */
export class Rectangle {
    constructor(
        public x: number = 0,
        public y: number = 0,
        public width: number = 0,
        public height: number = 0,
    ) {}

    /**
     * Get the left edge as a Vector2
     */
    get left(): Vector2 {
        return new Vector2(this.x, 0)
    }

    /**
     * Get the right edge as a Vector2
     */
    get right(): Vector2 {
        return new Vector2(this.x + this.width, 0)
    }

    /**
     * Get the top edge as a Vector2
     */
    get top(): Vector2 {
        return new Vector2(0, this.y + this.height)
    }

    /**
     * Get the bottom edge as a Vector2
     */
    get bottom(): Vector2 {
        return new Vector2(0, this.y)
    }

    /**
     * Get the center point of the rectangle as a Vector2
     */
    get center(): Vector2 {
        return new Vector2(this.x + this.width / 2, this.y + this.height / 2)
    }

    /**
     * Check if a point is inside this rectangle
     */
    contains(point: Vector2): boolean {
        return (
            point.x >= this.x &&
            point.x <= this.x + this.width &&
            point.y >= this.y &&
            point.y <= this.y + this.height
        )
    }

    /**
     * Check if this rectangle intersects with another rectangle
     */
    intersects(other: Rectangle): boolean {
        return (
            this.left.x < other.right.x &&
            this.right.x > other.left.x &&
            this.bottom.y < other.top.y &&
            this.top.y > other.bottom.y
        )
    }

    /**
     * Get the intersection of this rectangle with another
     */
    intersection(other: Rectangle): Rectangle | null {
        if (!this.intersects(other)) return null

        const x = Math.max(this.left.x, other.left.x)
        const y = Math.max(this.top.y, other.top.y)
        const right = Math.min(this.right.x, other.right.x)
        const top = Math.min(this.top.y, other.top.y)

        return new Rectangle(x, y, right - x, top - y)
    }

    /**
     * Get the union of this rectangle with another
     */
    boundingBoxUnion(other: Rectangle): Rectangle {
        const minX = Math.min(this.left.x, other.left.x)
        const maxX = Math.max(this.right.x, other.right.x)

        const minY = Math.min(this.bottom.y, other.bottom.y)
        const maxY = Math.max(this.top.y, other.top.y)

        return new Rectangle(minX, minY, maxX - minX, maxY - minY)
    }

    /**
     * Expand this rectangle by a margin
     */
    expand(margin: number): Rectangle {
        return new Rectangle(
            this.x - margin,
            this.y - margin,
            this.width + margin * 2,
            this.height + margin * 2,
        )
    }

    /**
     * Create a copy of this rectangle
     */
    clone(): Rectangle {
        return new Rectangle(this.x, this.y, this.width, this.height)
    }

    /**
     * Check if this rectangle equals another rectangle
     */
    equals(other: Rectangle, epsilon: number = 0.0001): boolean {
        return (
            Math.abs(this.x - other.x) < epsilon &&
            Math.abs(this.y - other.y) < epsilon &&
            Math.abs(this.width - other.width) < epsilon &&
            Math.abs(this.height - other.height) < epsilon
        )
    }

    /**
     * Create a rectangle from two points
     */
    static fromPoints(p1: Vector2, p2: Vector2): Rectangle {
        const x = Math.min(p1.x, p2.x)
        const y = Math.min(p1.y, p2.y)
        const width = Math.abs(p2.x - p1.x)
        const height = Math.abs(p2.y - p1.y)
        return new Rectangle(x, y, width, height)
    }

    /**
     * Create a rectangle from center and size
     */
    static fromCenter(
        center: Vector2,
        width: number,
        height: number,
    ): Rectangle {
        return new Rectangle(
            center.x - width / 2,
            center.y - height / 2,
            width,
            height,
        )
    }
}
