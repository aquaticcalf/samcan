import { Color } from "../../math/color"
import { SceneNode } from "../node"
import { Transform } from "../transform"

/**
 * Artboard is the root container for a scene with defined dimensions
 */
export class Artboard extends SceneNode {
    private _width: number
    private _height: number
    private _backgroundColor: Color

    constructor(
        width: number,
        height: number,
        backgroundColor: Color = Color.white(),
        transform?: Transform,
    ) {
        super(transform)
        this._width = Math.max(0, width)
        this._height = Math.max(0, height)
        this._backgroundColor = backgroundColor
    }

    /**
     * Get the artboard width
     */
    get width(): number {
        return this._width
    }

    /**
     * Set the artboard width
     */
    set width(value: number) {
        this._width = Math.max(0, value)
    }

    /**
     * Get the artboard height
     */
    get height(): number {
        return this._height
    }

    /**
     * Set the artboard height
     */
    set height(value: number) {
        this._height = Math.max(0, value)
    }

    /**
     * Get the background color
     */
    get backgroundColor(): Color {
        return this._backgroundColor
    }

    /**
     * Set the background color
     */
    set backgroundColor(value: Color) {
        this._backgroundColor = value
    }
}
