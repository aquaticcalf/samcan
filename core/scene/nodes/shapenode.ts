import { Path } from "../../math/path"
import { Paint } from "../../math/paint"
import { Vector2 } from "../../math/vector2"
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

    /**
     * Test if a point (in world coordinates) hits this shape
     * Uses point-in-path testing with the shape's path
     */
    override hitTest(worldPoint: Vector2): boolean {
        // Transform world point to local coordinates
        const worldTransform = this.getWorldTransform()
        const inverseTransform = worldTransform.invert()
        const localPoint = inverseTransform.transformPoint(worldPoint)

        // Use canvas-based point-in-path testing
        return this.pointInPath(localPoint)
    }

    /**
     * Test if a point (in local coordinates) is inside the path
     * Uses the even-odd rule for path filling
     */
    private pointInPath(point: Vector2): boolean {
        const commands = this._path.commands

        if (commands.length === 0) {
            return false
        }

        // Ray casting algorithm: count intersections with a ray from the point to infinity
        let intersections = 0
        let currentX = 0
        let currentY = 0
        let startX = 0
        let startY = 0

        for (let i = 0; i < commands.length; i++) {
            const cmd = commands[i]
            if (!cmd) continue

            switch (cmd.type) {
                case "M":
                    currentX = cmd.x
                    currentY = cmd.y
                    startX = cmd.x
                    startY = cmd.y
                    break

                case "L": {
                    if (
                        this.rayIntersectsSegment(
                            point,
                            currentX,
                            currentY,
                            cmd.x,
                            cmd.y,
                        )
                    ) {
                        intersections++
                    }
                    currentX = cmd.x
                    currentY = cmd.y
                    break
                }

                case "Q": {
                    // Approximate quadratic bezier with line segments
                    const steps = 10
                    for (let t = 0; t < steps; t++) {
                        const t1 = t / steps
                        const t2 = (t + 1) / steps
                        const p1 = this.evaluateQuadratic(
                            currentX,
                            currentY,
                            cmd.cpx,
                            cmd.cpy,
                            cmd.x,
                            cmd.y,
                            t1,
                        )
                        const p2 = this.evaluateQuadratic(
                            currentX,
                            currentY,
                            cmd.cpx,
                            cmd.cpy,
                            cmd.x,
                            cmd.y,
                            t2,
                        )
                        if (
                            this.rayIntersectsSegment(
                                point,
                                p1.x,
                                p1.y,
                                p2.x,
                                p2.y,
                            )
                        ) {
                            intersections++
                        }
                    }
                    currentX = cmd.x
                    currentY = cmd.y
                    break
                }

                case "C": {
                    // Approximate cubic bezier with line segments
                    const steps = 10
                    for (let t = 0; t < steps; t++) {
                        const t1 = t / steps
                        const t2 = (t + 1) / steps
                        const p1 = this.evaluateCubic(
                            currentX,
                            currentY,
                            cmd.cp1x,
                            cmd.cp1y,
                            cmd.cp2x,
                            cmd.cp2y,
                            cmd.x,
                            cmd.y,
                            t1,
                        )
                        const p2 = this.evaluateCubic(
                            currentX,
                            currentY,
                            cmd.cp1x,
                            cmd.cp1y,
                            cmd.cp2x,
                            cmd.cp2y,
                            cmd.x,
                            cmd.y,
                            t2,
                        )
                        if (
                            this.rayIntersectsSegment(
                                point,
                                p1.x,
                                p1.y,
                                p2.x,
                                p2.y,
                            )
                        ) {
                            intersections++
                        }
                    }
                    currentX = cmd.x
                    currentY = cmd.y
                    break
                }

                case "Z":
                    if (
                        this.rayIntersectsSegment(
                            point,
                            currentX,
                            currentY,
                            startX,
                            startY,
                        )
                    ) {
                        intersections++
                    }
                    currentX = startX
                    currentY = startY
                    break
            }
        }

        // Odd number of intersections means point is inside
        return intersections % 2 === 1
    }

    /**
     * Test if a horizontal ray from the point intersects a line segment
     */
    private rayIntersectsSegment(
        point: Vector2,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
    ): boolean {
        // Check if segment crosses the horizontal ray
        if (y1 > point.y === y2 > point.y) {
            return false
        }

        // Calculate x coordinate of intersection
        const intersectionX = x1 + ((point.y - y1) / (y2 - y1)) * (x2 - x1)

        // Check if intersection is to the right of the point
        return intersectionX > point.x
    }

    /**
     * Evaluate a point on a quadratic bezier curve
     */
    private evaluateQuadratic(
        x0: number,
        y0: number,
        cpx: number,
        cpy: number,
        x1: number,
        y1: number,
        t: number,
    ): Vector2 {
        const mt = 1 - t
        const x = mt * mt * x0 + 2 * mt * t * cpx + t * t * x1
        const y = mt * mt * y0 + 2 * mt * t * cpy + t * t * y1
        return new Vector2(x, y)
    }

    /**
     * Evaluate a point on a cubic bezier curve
     */
    private evaluateCubic(
        x0: number,
        y0: number,
        cp1x: number,
        cp1y: number,
        cp2x: number,
        cp2y: number,
        x1: number,
        y1: number,
        t: number,
    ): Vector2 {
        const mt = 1 - t
        const mt2 = mt * mt
        const mt3 = mt2 * mt
        const t2 = t * t
        const t3 = t2 * t

        const x = mt3 * x0 + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * x1
        const y = mt3 * y0 + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * y1
        return new Vector2(x, y)
    }
}
