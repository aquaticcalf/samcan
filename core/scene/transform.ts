import { Matrix } from "../math/matrix"
import { Vector2 } from "../math/vector2"

/**
 * Transform represents the local transformation of a scene node
 * including position, rotation, scale, and pivot point
 */
export class Transform {
    public position: Vector2
    public rotation: number // radians
    public scale: Vector2
    public pivot: Vector2

    constructor(
        position: Vector2 = Vector2.zero(),
        rotation: number = 0,
        scale: Vector2 = Vector2.one(),
        pivot: Vector2 = Vector2.zero(),
    ) {
        this.position = position
        this.rotation = rotation
        this.scale = scale
        this.pivot = pivot
    }

    /**
     * Convert this transform to a transformation matrix
     * Order: translate to pivot -> scale -> rotate -> translate to position
     */
    toMatrix(): Matrix {
        // Start with translation to position
        let matrix = Matrix.translate(this.position.x, this.position.y)

        // Apply rotation
        if (this.rotation !== 0) {
            matrix = matrix.appendRotation(this.rotation)
        }

        // Apply scale
        if (this.scale.x !== 1 || this.scale.y !== 1) {
            matrix = matrix.appendScale(this.scale.x, this.scale.y)
        }

        // Apply pivot offset (translate by negative pivot)
        if (this.pivot.x !== 0 || this.pivot.y !== 0) {
            matrix = matrix.appendTranslation(-this.pivot.x, -this.pivot.y)
        }

        return matrix
    }

    /**
     * Create a copy of this transform
     */
    clone(): Transform {
        return new Transform(
            this.position.clone(),
            this.rotation,
            this.scale.clone(),
            this.pivot.clone(),
        )
    }

    /**
     * Create an identity transform
     */
    static identity(): Transform {
        return new Transform()
    }
}
