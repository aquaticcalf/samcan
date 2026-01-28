import { Color } from "../../math/color"
import { Matrix } from "../../math/matrix"
import type { BlendMode } from "../../math/paint"
import { Paint } from "../../math/paint"
import { Vector2 } from "../../math/vector2"
import { Transform } from "../../scene/transform"
import type {
    ColorData,
    GradientData,
    GradientStopData,
    MatrixData,
    PaintData,
    TransformData,
    Vector2Data,
} from "../types"

/**
 * Handles serialization and deserialization of primitive types
 * (Color, Vector2, Matrix, Transform, Paint)
 */
export class PrimitiveSerializers {
    /**
     * Serialize a Color to ColorData
     */
    serializeColor(color: Color): ColorData {
        return {
            r: color.r,
            g: color.g,
            b: color.b,
            a: color.a,
        }
    }

    /**
     * Deserialize a Color from ColorData
     */
    deserializeColor(data: ColorData): Color {
        return new Color(data.r, data.g, data.b, data.a)
    }

    /**
     * Serialize a Vector2 to Vector2Data
     */
    serializeVector2(vector: Vector2): Vector2Data {
        return {
            x: vector.x,
            y: vector.y,
        }
    }

    /**
     * Deserialize a Vector2 from Vector2Data
     */
    deserializeVector2(data: Vector2Data): Vector2 {
        return new Vector2(data.x, data.y)
    }

    /**
     * Serialize a Matrix to MatrixData
     */
    serializeMatrix(matrix: Matrix): MatrixData {
        return {
            a: matrix.a,
            b: matrix.b,
            c: matrix.c,
            d: matrix.d,
            tx: matrix.tx,
            ty: matrix.ty,
        }
    }

    /**
     * Deserialize a Matrix from MatrixData
     */
    deserializeMatrix(data: MatrixData): Matrix {
        return new Matrix(data.a, data.b, data.c, data.d, data.tx, data.ty)
    }

    /**
     * Serialize a Transform to TransformData
     */
    serializeTransform(transform: Transform): TransformData {
        return {
            position: this.serializeVector2(transform.position),
            rotation: transform.rotation,
            scale: this.serializeVector2(transform.scale),
            pivot: this.serializeVector2(transform.pivot),
        }
    }

    /**
     * Deserialize a Transform from TransformData
     */
    deserializeTransform(data: TransformData): Transform {
        return new Transform(
            this.deserializeVector2(data.position),
            data.rotation,
            this.deserializeVector2(data.scale),
            this.deserializeVector2(data.pivot),
        )
    }

    /**
     * Serialize a Paint to PaintData
     */
    serializePaint(paint: Paint): PaintData {
        const data: PaintData = {
            type: paint.type,
            blendMode: paint.blendMode,
        }

        if (paint.type === "solid" && paint.color) {
            data.color = this.serializeColor(paint.color)
        } else if (paint.type === "gradient" && paint.gradient) {
            data.gradient = this.serializeGradient(paint.gradient)
        }

        return data
    }

    /**
     * Deserialize a Paint from PaintData
     */
    deserializePaint(data: PaintData): Paint {
        if (data.type === "solid" && data.color) {
            const color = this.deserializeColor(data.color)
            return Paint.solid(color, data.blendMode)
        }

        if (data.type === "gradient" && data.gradient) {
            return this.deserializeGradientPaint(data.gradient, data.blendMode)
        }

        throw new Error(`Invalid paint data: ${data.type}`)
    }

    /**
     * Serialize a gradient
     */
    serializeGradient(gradient: Paint["gradient"]): GradientData | undefined {
        if (!gradient) {
            return undefined
        }

        const stops: GradientStopData[] = gradient.stops.map((stop) => ({
            offset: stop.offset,
            color: this.serializeColor(stop.color),
        }))

        if (gradient.type === "linear") {
            return {
                type: "linear",
                start: this.serializeVector2(gradient.start),
                end: this.serializeVector2(gradient.end),
                stops,
            }
        }

        if (gradient.type === "radial") {
            return {
                type: "radial",
                center: this.serializeVector2(gradient.center),
                radius: gradient.radius,
                focal: gradient.focal
                    ? this.serializeVector2(gradient.focal)
                    : undefined,
                stops,
            }
        }

        return undefined
    }

    /**
     * Deserialize a gradient paint
     */
    deserializeGradientPaint(data: GradientData, blendMode: BlendMode): Paint {
        const stops = data.stops.map((stopData) => ({
            offset: stopData.offset,
            color: this.deserializeColor(stopData.color),
        }))

        if (data.type === "linear") {
            return Paint.linearGradient(
                this.deserializeVector2(data.start),
                this.deserializeVector2(data.end),
                stops,
                blendMode,
            )
        }

        // data.type === "radial"
        return Paint.radialGradient(
            this.deserializeVector2(data.center),
            data.radius,
            stops,
            data.focal ? this.deserializeVector2(data.focal) : undefined,
            blendMode,
        )
    }
}
