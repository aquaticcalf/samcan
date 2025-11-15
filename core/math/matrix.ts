import { Vector2 } from "./vector2"

/**
 * 2D Affine Transformation Matrix (3x3 represented as 2x3)
 * [a  c  tx]
 * [b  d  ty]
 * [0  0  1 ]
 */
export class Matrix {
    constructor(
        public a: number = 1,
        public b: number = 0,
        public c: number = 0,
        public d: number = 1,
        public tx: number = 0,
        public ty: number = 0,
    ) {}

    /**
     * Multiply this matrix by another matrix
     */
    multiply(other: Matrix): Matrix {
        return new Matrix(
            this.a * other.a + this.c * other.b,
            this.b * other.a + this.d * other.b,
            this.a * other.c + this.c * other.d,
            this.b * other.c + this.d * other.d,
            this.a * other.tx + this.c * other.ty + this.tx,
            this.b * other.tx + this.d * other.ty + this.ty,
        )
    }

    /**
     * Calculate the determinant of this matrix
     */
    determinant(): number {
        return this.a * this.d - this.b * this.c
    }

    /**
     * Invert this matrix
     */
    invert(): Matrix {
        const det = this.determinant()

        if (Math.abs(det) < 1e-10) {
            // Matrix is not invertible, return identity
            return Matrix.identity()
        }

        const invDet = 1 / det

        return new Matrix(
            this.d * invDet,
            -this.b * invDet,
            -this.c * invDet,
            this.a * invDet,
            (this.c * this.ty - this.d * this.tx) * invDet,
            (this.b * this.tx - this.a * this.ty) * invDet,
        )
    }

    /**
     * Transform a point by this matrix
     */
    transformPoint(point: Vector2): Vector2 {
        return new Vector2(
            this.a * point.x + this.c * point.y + this.tx,
            this.b * point.x + this.d * point.y + this.ty,
        )
    }

    /**
     * Transform a vector (ignoring translation)
     */
    transformVector(vector: Vector2): Vector2 {
        return new Vector2(
            this.a * vector.x + this.c * vector.y,
            this.b * vector.x + this.d * vector.y,
        )
    }

    /**
     * Create a translation matrix
     */
    static translate(x: number, y: number): Matrix {
        return new Matrix(1, 0, 0, 1, x, y)
    }

    /**
     * Create a scale matrix
     */
    static scale(sx: number, sy: number = sx): Matrix {
        return new Matrix(sx, 0, 0, sy, 0, 0)
    }

    /**
     * Create a rotation matrix (angle in radians)
     */
    static rotate(angle: number): Matrix {
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        return new Matrix(cos, sin, -sin, cos, 0, 0)
    }

    /**
     * Create an identity matrix
     */
    static identity(): Matrix {
        return new Matrix(1, 0, 0, 1, 0, 0)
    }

    /**
     * Create a matrix from translation, rotation, and scale
     */
    static fromTRS(
        translation: Vector2,
        rotation: number,
        scale: Vector2,
    ): Matrix {
        const cos = Math.cos(rotation)
        const sin = Math.sin(rotation)

        return new Matrix(
            cos * scale.x,
            sin * scale.x,
            -sin * scale.y,
            cos * scale.y,
            translation.x,
            translation.y,
        )
    }

    /**
     * Create a copy of this matrix
     */
    clone(): Matrix {
        return new Matrix(this.a, this.b, this.c, this.d, this.tx, this.ty)
    }

    /**
     * Check if this matrix equals another matrix
     */
    equals(other: Matrix, epsilon: number = 0.0001): boolean {
        return (
            Math.abs(this.a - other.a) < epsilon &&
            Math.abs(this.b - other.b) < epsilon &&
            Math.abs(this.c - other.c) < epsilon &&
            Math.abs(this.d - other.d) < epsilon &&
            Math.abs(this.tx - other.tx) < epsilon &&
            Math.abs(this.ty - other.ty) < epsilon
        )
    }

    /**
     * Check if this is an identity matrix
     */
    isIdentity(epsilon: number = 0.0001): boolean {
        return this.equals(Matrix.identity(), epsilon)
    }

    /**
     * Append a translation to this matrix
     */
    appendTranslation(x: number, y: number): Matrix {
        return this.multiply(Matrix.translate(x, y))
    }

    /**
     * Append a rotation to this matrix
     */
    appendRotation(angle: number): Matrix {
        return this.multiply(Matrix.rotate(angle))
    }

    /**
     * Append a scale to this matrix
     */
    appendScale(sx: number, sy: number = sx): Matrix {
        return this.multiply(Matrix.scale(sx, sy))
    }

    /**
     * Prepend a translation to this matrix
     */
    prependTranslation(x: number, y: number): Matrix {
        return Matrix.translate(x, y).multiply(this)
    }

    /**
     * Prepend a rotation to this matrix
     */
    prependRotation(angle: number): Matrix {
        return Matrix.rotate(angle).multiply(this)
    }

    /**
     * Prepend a scale to this matrix
     */
    prependScale(sx: number, sy: number = sx): Matrix {
        return Matrix.scale(sx, sy).multiply(this)
    }

    /**
     * Set this matrix from another matrix
     */
    setFrom(other: Matrix): Matrix {
        this.a = other.a
        this.b = other.b
        this.c = other.c
        this.d = other.d
        this.tx = other.tx
        this.ty = other.ty
        return this
    }

    /**
     * Set this matrix to identity
     */
    setIdentity(): Matrix {
        this.a = 1
        this.b = 0
        this.c = 0
        this.d = 1
        this.tx = 0
        this.ty = 0
        return this
    }
}
