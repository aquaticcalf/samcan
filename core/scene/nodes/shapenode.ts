import { Path } from "../../math/path"
import { Paint } from "../../math/paint"
import { SceneNode } from "../node"
import { Transform } from "../transform"

/**
 * ShapeNode represents a vector shape with path and paint properties
 */
export class ShapeNode extends SceneNode {
    private _path: Path
    private _fill: Paint | null = null
    private _stroke: Paint | null = null
    private _strokeWidth: number = 1

    constructor(path: Path, transform?: Transform) {
        super(transform)
        this._path = path
    }

    /**
     * Get the path defining the shape
     */
    get path(): Path {
        return this._path
    }

    /**
     * Set the path defining the shape
     */
    set path(value: Path) {
        this._path = value
    }

    /**
     * Get the fill paint
     */
    get fill(): Paint | null {
        return this._fill
    }

    /**
     * Set the fill paint
     */
    set fill(value: Paint | null) {
        this._fill = value
    }

    /**
     * Get the stroke paint
     */
    get stroke(): Paint | null {
        return this._stroke
    }

    /**
     * Set the stroke paint
     */
    set stroke(value: Paint | null) {
        this._stroke = value
    }

    /**
     * Get the stroke width
     */
    get strokeWidth(): number {
        return this._strokeWidth
    }

    /**
     * Set the stroke width
     */
    set strokeWidth(value: number) {
        this._strokeWidth = Math.max(0, value)
    }
}
