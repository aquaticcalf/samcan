import { Rectangle } from "../../math/rectangle"
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
    }
}
