import { Rectangle } from "../../math/rectangle"
import { Vector2 } from "../../math/vector2"
import { SceneNode } from "../node"
import { Transform } from "../transform"

/**
 * ImageNode represents a bitmap image in the scene
 */
export class ImageNode extends SceneNode {
    private _imageData: ImageData | HTMLImageElement | string
    private _sourceRect: Rectangle | null = null

    constructor(
        imageData: ImageData | HTMLImageElement | string,
        transform?: Transform,
    ) {
        super(transform)
        this._imageData = imageData
    }

    /**
     * Get the image data (ImageData, HTMLImageElement, or URL string)
     */
    get imageData(): ImageData | HTMLImageElement | string {
        return this._imageData
    }

    /**
     * Set the image data
     */
    set imageData(value: ImageData | HTMLImageElement | string) {
        this._imageData = value
        this.markDirty()
    }

    /**
     * Get the source rectangle for partial image rendering
     */
    get sourceRect(): Rectangle | null {
        return this._sourceRect
    }

    /**
     * Set the source rectangle for partial image rendering
     */
    set sourceRect(value: Rectangle | null) {
        this._sourceRect = value
        this.markDirty()
    }

    /**
     * Get the local bounding box of the image
     */
    override getLocalBounds(): Rectangle | null {
        // If source rect is specified, use it
        if (this._sourceRect) {
            return this._sourceRect
        }

        // Try to get dimensions from image data
        if (this._imageData instanceof HTMLImageElement) {
            return new Rectangle(
                0,
                0,
                this._imageData.width,
                this._imageData.height,
            )
        }

        if (this._imageData instanceof ImageData) {
            return new Rectangle(
                0,
                0,
                this._imageData.width,
                this._imageData.height,
            )
        }

        // For URL strings, we can't determine bounds without loading
        return null
    }

    /**
     * Test if a point (in world coordinates) hits this image
     * Uses bounding box hit testing
     */
    override hitTest(worldPoint: Vector2): boolean {
        // Transform world point to local coordinates
        const worldTransform = this.getWorldTransform()
        const inverseTransform = worldTransform.invert()
        const localPoint = inverseTransform.transformPoint(worldPoint)

        // Get image dimensions
        const bounds = this.getLocalBounds()
        if (!bounds) {
            return false
        }

        // Test if point is inside the bounding box
        return bounds.contains(localPoint)
    }
}
