import { describe, it, expect } from "bun:test"
import { Serializer } from "../core/serialization/serializer"
import { Artboard } from "../core/scene/nodes/artboard"
import { ShapeNode } from "../core/scene/nodes/shapenode"
import { GroupNode } from "../core/scene/nodes/groupnode"
import { Color } from "../core/math/color"
import { Path } from "../core/math/path"
import { Paint } from "../core/math/paint"
import { Vector2 } from "../core/math/vector2"
import { Transform } from "../core/scene/transform"
import { Timeline } from "../core/animation/timeline"
import { AnimationTrack } from "../core/animation/animationtrack"
import { Keyframe } from "../core/animation/keyframe"
import { Easing } from "../core/animation/easing"

describe("Serializer", () => {
    it("should serialize an empty artboard", () => {
        const serializer = new Serializer()
        const artboard = new Artboard(800, 600, Color.white())

        const data = serializer.serializeArtboard(artboard)

        expect(data.width).toBe(800)
        expect(data.height).toBe(600)
        expect(data.backgroundColor).toEqual({ r: 1, g: 1, b: 1, a: 1 })
        expect(data.nodes).toEqual([])
    })

    it("should serialize artboard with shape nodes", () => {
        const serializer = new Serializer()
        const artboard = new Artboard(800, 600, Color.white())

        // Create a rectangle shape
        const path = new Path()
        path.moveTo(0, 0)
        path.lineTo(100, 0)
        path.lineTo(100, 100)
        path.lineTo(0, 100)
        path.close()

        const shape = new ShapeNode(path)
        shape.fill = Paint.solid(Color.red())
        shape.stroke = Paint.solid(Color.black())
        shape.strokeWidth = 2

        artboard.addChild(shape)

        const data = serializer.serializeArtboard(artboard)

        expect(data.nodes.length).toBe(1)
        expect(data.nodes[0]?.type).toBe("shape")
        expect(data.nodes[0]?.shape?.strokeWidth).toBe(2)
        expect(data.nodes[0]?.shape?.path.length).toBe(5)
    })

    it("should serialize nested group hierarchy", () => {
        const serializer = new Serializer()
        const artboard = new Artboard(800, 600, Color.white())

        const group1 = new GroupNode()
        const group2 = new GroupNode()
        const path = new Path()
        path.moveTo(0, 0)
        path.lineTo(50, 50)
        const shape = new ShapeNode(path)

        group2.addChild(shape)
        group1.addChild(group2)
        artboard.addChild(group1)

        const data = serializer.serializeArtboard(artboard)

        expect(data.nodes.length).toBe(1)
        expect(data.nodes[0]?.type).toBe("group")
        expect(data.nodes[0]?.children?.length).toBe(1)
        expect(data.nodes[0]?.children?.[0]?.children?.length).toBe(1)
        expect(data.nodes[0]?.children?.[0]?.children?.[0]?.type).toBe("shape")
    })

    it("should serialize color correctly", () => {
        const serializer = new Serializer()
        const color = new Color(0.5, 0.75, 1.0, 0.8)

        const data = serializer.serializeColor(color)

        expect(data.r).toBe(0.5)
        expect(data.g).toBe(0.75)
        expect(data.b).toBe(1.0)
        expect(data.a).toBe(0.8)
    })

    it("should serialize vector2 correctly", () => {
        const serializer = new Serializer()
        const vector = new Vector2(100, 200)

        const data = serializer.serializeVector2(vector)

        expect(data.x).toBe(100)
        expect(data.y).toBe(200)
    })

    it("should serialize transform correctly", () => {
        const serializer = new Serializer()
        const transform = new Transform(
            new Vector2(10, 20),
            Math.PI / 4,
            new Vector2(2, 2),
            new Vector2(5, 5),
        )

        const data = serializer.serializeTransform(transform)

        expect(data.position).toEqual({ x: 10, y: 20 })
        expect(data.rotation).toBe(Math.PI / 4)
        expect(data.scale).toEqual({ x: 2, y: 2 })
        expect(data.pivot).toEqual({ x: 5, y: 5 })
    })

    it("should serialize solid paint correctly", () => {
        const serializer = new Serializer()
        const paint = Paint.solid(Color.blue(), "multiply")

        const data = serializer.serializePaint(paint)

        expect(data.type).toBe("solid")
        expect(data.blendMode).toBe("multiply")
        expect(data.color).toEqual({ r: 0, g: 0, b: 1, a: 1 })
    })

    it("should serialize linear gradient paint correctly", () => {
        const serializer = new Serializer()
        const paint = Paint.linearGradient(
            new Vector2(0, 0),
            new Vector2(100, 100),
            [
                { offset: 0, color: Color.red() },
                { offset: 1, color: Color.blue() },
            ],
        )

        const data = serializer.serializePaint(paint)

        expect(data.type).toBe("gradient")
        expect(data.gradient?.type).toBe("linear")
        expect(data.gradient?.stops.length).toBe(2)
    })

    it("should serialize timeline with tracks", () => {
        const serializer = new Serializer()
        const artboard = new Artboard(800, 600)
        const shape = new ShapeNode(new Path())
        artboard.addChild(shape)

        // Assign IDs first
        serializer.serializeArtboard(artboard)

        const timeline = new Timeline(5.0, 30)
        const track = new AnimationTrack(shape, "opacity")
        track.addKeyframe(new Keyframe(0, 0, "linear"))
        track.addKeyframe(new Keyframe(2.5, 1, "linear", Easing.inQuad))
        track.addKeyframe(new Keyframe(5.0, 0, "linear"))
        timeline.addTrack(track)

        const data = serializer.serializeTimeline(timeline)

        expect(data.duration).toBe(5.0)
        expect(data.fps).toBe(30)
        expect(data.tracks.length).toBe(1)
        expect(data.tracks[0]?.property).toBe("opacity")
        expect(data.tracks[0]?.keyframes.length).toBe(3)
        expect(data.tracks[0]?.keyframes[1]?.easingName).toBe("inQuad")
    })

    it("should serialize complete SamcanFile", () => {
        const serializer = new Serializer()
        const artboard1 = new Artboard(800, 600, Color.white())
        const artboard2 = new Artboard(1920, 1080, Color.black())

        const file = serializer.serializeSamcanFile([artboard1, artboard2], {
            name: "Test Animation",
            author: "Test Author",
        })

        expect(file.version).toBe("1.0.0")
        expect(file.metadata.name).toBe("Test Animation")
        expect(file.metadata.author).toBe("Test Author")
        expect(file.artboards.length).toBe(2)
        expect(file.artboards[0]?.width).toBe(800)
        expect(file.artboards[1]?.width).toBe(1920)
    })

    it("should generate valid JSON", () => {
        const serializer = new Serializer()
        const artboard = new Artboard(800, 600, Color.white())
        const file = serializer.serializeSamcanFile([artboard])

        const json = serializer.toJSON(file)
        const parsed = JSON.parse(json)

        expect(parsed.version).toBe("1.0.0")
        expect(parsed.artboards.length).toBe(1)
    })
})
