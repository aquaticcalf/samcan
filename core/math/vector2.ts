/**
 * 2D Vector class for position, scale, and direction operations
 */
export class Vector2 {
    constructor(
        public x: number = 0,
        public y: number = 0,
    ) {}

    /**
     * Add another vector to this vector
     */
    add(other: Vector2): Vector2 {
        return new Vector2(this.x + other.x, this.y + other.y)
    }

    /**
     * Subtract another vector from this vector
     */
    subtract(other: Vector2): Vector2 {
        return new Vector2(this.x - other.x, this.y - other.y)
    }

    /**
     * Multiply this vector by a scalar
     */
    multiply(scalar: number): Vector2 {
        return new Vector2(this.x * scalar, this.y * scalar)
    }

    /**
     * Divide this vector by a scalar
     */
    divide(scalar: number): Vector2 {
        return new Vector2(this.x / scalar, this.y / scalar)
    }

    /**
     * Calculate the dot product with another vector
     */
    dot(other: Vector2): number {
        return this.x * other.x + this.y * other.y
    }

    /**
     * Calculate the length (magnitude) of this vector
     */
    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y)
    }

    /**
     * Calculate the squared length (avoids sqrt for performance)
     */
    lengthSquared(): number {
        return this.x * this.x + this.y * this.y
    }

    /**
     * Return a normalized version of this vector (length = 1)
     */
    normalize(): Vector2 {
        const len = this.length()
        if (len === 0) return new Vector2(0, 0)
        return this.divide(len)
    }

    /**
     * Calculate distance to another vector
     */
    distance(other: Vector2): number {
        return this.subtract(other).length()
    }

    /**
     * Calculate squared distance to another vector
     */
    distanceSquared(other: Vector2): number {
        return this.subtract(other).lengthSquared()
    }

    /**
     * Create a copy of this vector
     */
    clone(): Vector2 {
        return new Vector2(this.x, this.y)
    }

    /**
     * Check if this vector equals another vector
     */
    equals(other: Vector2, epsilon: number = 0.0001): boolean {
        return (
            Math.abs(this.x - other.x) < epsilon &&
            Math.abs(this.y - other.y) < epsilon
        )
    }

    /**
     * Set the components of this vector
     */
    set(x: number, y: number): Vector2 {
        this.x = x
        this.y = y
        return this
    }

    /**
     * Set this vector from another vector
     */
    setFrom(other: Vector2): Vector2 {
        this.x = other.x
        this.y = other.y
        return this
    }

    /**
     * Linear interpolation between this vector and another
     */
    lerp(other: Vector2, t: number): Vector2 {
        return new Vector2(
            this.x + (other.x - this.x) * t,
            this.y + (other.y - this.y) * t,
        )
    }

    /**
     * Create a zero vector
     */
    static zero(): Vector2 {
        return new Vector2(0, 0)
    }

    /**
     * Create a unit vector (1, 1)
     */
    static one(): Vector2 {
        return new Vector2(1, 1)
    }

    /**
     * Create a unit vector pointing right
     */
    static right(): Vector2 {
        return new Vector2(1, 0)
    }

    /**
     * Create a unit vector pointing up
     */
    static up(): Vector2 {
        return new Vector2(0, 1)
    }
}
