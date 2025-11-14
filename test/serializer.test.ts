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
import { AnimationState } from "../core/animation/animationstate"
import { StateMachine } from "../core/animation/statemachine"
import {
    StateTransition,
    EventCondition,
    BooleanCondition,
    NumberCondition,
    TimeCondition,
} from "../core/animation/statetransition"

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

describe("Serializer - Deserialization", () => {
    it("should deserialize an empty artboard", () => {
        const serializer = new Serializer()
        const artboard = new Artboard(800, 600, Color.white())

        const data = serializer.serializeArtboard(artboard)
        const deserialized = serializer.deserializeArtboard(data)

        expect(deserialized.width).toBe(800)
        expect(deserialized.height).toBe(600)
        expect(deserialized.backgroundColor.equals(Color.white())).toBe(true)
        expect(deserialized.children.length).toBe(0)
    })

    it("should deserialize artboard with shape nodes", () => {
        const serializer = new Serializer()
        const artboard = new Artboard(800, 600, Color.white())

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
        const deserialized = serializer.deserializeArtboard(data)

        expect(deserialized.children.length).toBe(1)
        const deserializedShape = deserialized.children[0] as ShapeNode
        expect(deserializedShape).toBeInstanceOf(ShapeNode)
        expect(deserializedShape.strokeWidth).toBe(2)
        expect(deserializedShape.path.commands.length).toBe(5)
        expect(deserializedShape.fill?.type).toBe("solid")
        expect(deserializedShape.stroke?.type).toBe("solid")
    })

    it("should deserialize nested group hierarchy", () => {
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
        const deserialized = serializer.deserializeArtboard(data)

        expect(deserialized.children.length).toBe(1)
        const deserializedGroup1 = deserialized.children[0] as GroupNode
        expect(deserializedGroup1).toBeInstanceOf(GroupNode)
        expect(deserializedGroup1.children.length).toBe(1)
        const deserializedGroup2 = deserializedGroup1.children[0] as GroupNode
        expect(deserializedGroup2).toBeInstanceOf(GroupNode)
        expect(deserializedGroup2.children.length).toBe(1)
        expect(deserializedGroup2.children[0]).toBeInstanceOf(ShapeNode)
    })

    it("should deserialize color correctly", () => {
        const serializer = new Serializer()
        const color = new Color(0.5, 0.75, 1.0, 0.8)

        const data = serializer.serializeColor(color)
        const deserialized = serializer.deserializeColor(data)

        expect(deserialized.r).toBe(0.5)
        expect(deserialized.g).toBe(0.75)
        expect(deserialized.b).toBe(1.0)
        expect(deserialized.a).toBe(0.8)
    })

    it("should deserialize vector2 correctly", () => {
        const serializer = new Serializer()
        const vector = new Vector2(100, 200)

        const data = serializer.serializeVector2(vector)
        const deserialized = serializer.deserializeVector2(data)

        expect(deserialized.x).toBe(100)
        expect(deserialized.y).toBe(200)
    })

    it("should deserialize transform correctly", () => {
        const serializer = new Serializer()
        const transform = new Transform(
            new Vector2(10, 20),
            Math.PI / 4,
            new Vector2(2, 2),
            new Vector2(5, 5),
        )

        const data = serializer.serializeTransform(transform)
        const deserialized = serializer.deserializeTransform(data)

        expect(deserialized.position.x).toBe(10)
        expect(deserialized.position.y).toBe(20)
        expect(deserialized.rotation).toBe(Math.PI / 4)
        expect(deserialized.scale.x).toBe(2)
        expect(deserialized.scale.y).toBe(2)
        expect(deserialized.pivot.x).toBe(5)
        expect(deserialized.pivot.y).toBe(5)
    })

    it("should deserialize solid paint correctly", () => {
        const serializer = new Serializer()
        const paint = Paint.solid(Color.blue(), "multiply")

        const data = serializer.serializePaint(paint)
        const deserialized = serializer.deserializePaint(data)

        expect(deserialized.type).toBe("solid")
        expect(deserialized.blendMode).toBe("multiply")
        expect(deserialized.color?.equals(Color.blue())).toBe(true)
    })

    it("should deserialize linear gradient paint correctly", () => {
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
        const deserialized = serializer.deserializePaint(data)

        expect(deserialized.type).toBe("gradient")
        expect(deserialized.gradient?.type).toBe("linear")
        expect(deserialized.gradient?.stops.length).toBe(2)
        if (deserialized.gradient?.type === "linear") {
            expect(deserialized.gradient.start.x).toBe(0)
            expect(deserialized.gradient.start.y).toBe(0)
            expect(deserialized.gradient.end.x).toBe(100)
            expect(deserialized.gradient.end.y).toBe(100)
        }
    })

    it("should deserialize radial gradient paint correctly", () => {
        const serializer = new Serializer()
        const paint = Paint.radialGradient(
            new Vector2(50, 50),
            100,
            [
                { offset: 0, color: Color.white() },
                { offset: 1, color: Color.black() },
            ],
            new Vector2(60, 60),
        )

        const data = serializer.serializePaint(paint)
        const deserialized = serializer.deserializePaint(data)

        expect(deserialized.type).toBe("gradient")
        expect(deserialized.gradient?.type).toBe("radial")
        if (deserialized.gradient?.type === "radial") {
            expect(deserialized.gradient.center.x).toBe(50)
            expect(deserialized.gradient.center.y).toBe(50)
            expect(deserialized.gradient.radius).toBe(100)
            expect(deserialized.gradient.focal?.x).toBe(60)
            expect(deserialized.gradient.focal?.y).toBe(60)
        }
    })

    it("should deserialize timeline with tracks", () => {
        const serializer = new Serializer()
        const artboard = new Artboard(800, 600)
        const shape = new ShapeNode(new Path())
        artboard.addChild(shape)

        serializer.serializeArtboard(artboard)

        const timeline = new Timeline(5.0, 30)
        const track = new AnimationTrack(shape, "opacity")
        track.addKeyframe(new Keyframe(0, 0, "linear"))
        track.addKeyframe(new Keyframe(2.5, 1, "linear", Easing.inQuad))
        track.addKeyframe(new Keyframe(5.0, 0, "linear"))
        timeline.addTrack(track)

        const data = serializer.serializeTimeline(timeline)

        const nodeMap = new Map<string, ShapeNode>()
        nodeMap.set("node_1", shape)

        const deserialized = serializer.deserializeTimeline(data, nodeMap)

        expect(deserialized.duration).toBe(5.0)
        expect(deserialized.fps).toBe(30)
        expect(deserialized.tracks.length).toBe(1)
        expect(deserialized.tracks[0]?.property).toBe("opacity")
        expect(deserialized.tracks[0]?.keyframes.length).toBe(3)
        expect(deserialized.tracks[0]?.keyframes[1]?.easing).toBe(Easing.inQuad)
    })

    it("should deserialize keyframe with easing", () => {
        const serializer = new Serializer()
        const keyframe = new Keyframe(1.5, 100, "cubic", Easing.outCubic)

        const data = serializer.serializeKeyframe(keyframe)
        const deserialized = serializer.deserializeKeyframe(data)

        expect(deserialized.time).toBe(1.5)
        expect(deserialized.value).toBe(100)
        expect(deserialized.interpolation).toBe("cubic")
        expect(deserialized.easing).toBe(Easing.outCubic)
    })

    it("should round-trip serialize and deserialize complete artboard", () => {
        const serializer = new Serializer()

        const artboard = new Artboard(1920, 1080, Color.fromRGB(128, 128, 128))

        const group = new GroupNode()
        group.transform.position = new Vector2(100, 100)
        group.transform.rotation = Math.PI / 6
        group.opacity = 0.8

        const path = new Path()
        path.moveTo(0, 0)
        path.lineTo(200, 0)
        path.lineTo(200, 200)
        path.lineTo(0, 200)
        path.close()

        const shape = new ShapeNode(path)
        shape.fill = Paint.linearGradient(
            new Vector2(0, 0),
            new Vector2(200, 200),
            [
                { offset: 0, color: Color.red() },
                { offset: 0.5, color: Color.green() },
                { offset: 1, color: Color.blue() },
            ],
        )
        shape.stroke = Paint.solid(Color.black())
        shape.strokeWidth = 3

        group.addChild(shape)
        artboard.addChild(group)

        const serialized = serializer.serializeArtboard(artboard)
        const deserialized = serializer.deserializeArtboard(serialized)

        expect(deserialized.width).toBe(1920)
        expect(deserialized.height).toBe(1080)
        expect(deserialized.children.length).toBe(1)

        const deserializedGroup = deserialized.children[0] as GroupNode
        expect(deserializedGroup.transform.position.x).toBe(100)
        expect(deserializedGroup.transform.position.y).toBe(100)
        expect(deserializedGroup.opacity).toBe(0.8)
        expect(deserializedGroup.children.length).toBe(1)

        const deserializedShape = deserializedGroup.children[0] as ShapeNode
        expect(deserializedShape.strokeWidth).toBe(3)
        expect(deserializedShape.fill?.type).toBe("gradient")
        expect(deserializedShape.stroke?.type).toBe("solid")
    })

    it("should deserialize complete SamcanFile", () => {
        const serializer = new Serializer()
        const artboard1 = new Artboard(800, 600, Color.white())
        const artboard2 = new Artboard(1920, 1080, Color.black())

        const file = serializer.serializeSamcanFile([artboard1, artboard2], {
            name: "Test Animation",
            author: "Test Author",
        })

        const result = serializer.deserializeSamcanFile(file)

        expect(result.artboards.length).toBe(2)
        expect(result.artboards[0]?.width).toBe(800)
        expect(result.artboards[0]?.height).toBe(600)
        expect(result.artboards[1]?.width).toBe(1920)
        expect(result.artboards[1]?.height).toBe(1080)
    })

    it("should parse and deserialize from JSON string", () => {
        const serializer = new Serializer()
        const artboard = new Artboard(800, 600, Color.white())
        const file = serializer.serializeSamcanFile([artboard])

        const json = serializer.toJSON(file)
        const parsed = serializer.fromJSON(json)
        const result = serializer.deserializeSamcanFile(parsed)

        expect(result.artboards.length).toBe(1)
        expect(result.artboards[0]?.width).toBe(800)
        expect(result.artboards[0]?.height).toBe(600)
    })

    it("should validate SamcanFile structure", () => {
        const serializer = new Serializer()

        expect(() => {
            serializer.validateSamcanFile(null)
        }).toThrow("Invalid samcan file: not an object")

        expect(() => {
            serializer.validateSamcanFile({})
        }).toThrow("Invalid samcan file: missing or invalid version")

        expect(() => {
            serializer.validateSamcanFile({ version: "1.0.0" })
        }).toThrow("Invalid samcan file: missing or invalid metadata")

        expect(() => {
            serializer.validateSamcanFile({
                version: "1.0.0",
                metadata: {
                    name: "Test",
                    created: "20XX-XX-XX",
                    modified: "20XX-XX-XX",
                },
            })
        }).toThrow("Invalid samcan file: missing or invalid artboards")
    })

    it("should validate version format", () => {
        const serializer = new Serializer()

        expect(() => {
            serializer.validateSamcanFile({
                version: "invalid",
                metadata: {
                    name: "Test",
                    created: "20XX-XX-XX",
                    modified: "20XX-XX-XX",
                },
                artboards: [],
                assets: [],
            })
        }).toThrow("unsupported version format")

        expect(() => {
            serializer.validateSamcanFile({
                version: "1.0",
                metadata: {
                    name: "Test",
                    created: "20XX-XX-XX",
                    modified: "20XX-XX-XX",
                },
                artboards: [],
                assets: [],
            })
        }).toThrow("unsupported version format")
    })

    it("should validate metadata fields", () => {
        const serializer = new Serializer()

        expect(() => {
            serializer.validateSamcanFile({
                version: "1.0.0",
                metadata: {
                    created: "20XX-XX-XX",
                    modified: "20XX-XX-XX",
                },
                artboards: [],
                assets: [],
            })
        }).toThrow("metadata missing required field 'name'")

        expect(() => {
            serializer.validateSamcanFile({
                version: "1.0.0",
                metadata: {
                    name: "Test",
                    modified: "20XX-XX-XX",
                },
                artboards: [],
                assets: [],
            })
        }).toThrow("metadata missing required field 'created'")

        expect(() => {
            serializer.validateSamcanFile({
                version: "1.0.0",
                metadata: {
                    name: "Test",
                    created: "20XX-XX-XX",
                },
                artboards: [],
                assets: [],
            })
        }).toThrow("metadata missing required field 'modified'")
    })

    it("should validate artboard structure", () => {
        const serializer = new Serializer()

        expect(() => {
            serializer.validateSamcanFile({
                version: "1.0.0",
                metadata: {
                    name: "Test",
                    created: "20XX-XX-XX",
                    modified: "20XX-XX-XX",
                },
                artboards: [null],
                assets: [],
            })
        }).toThrow("artboard at index 0 is not an object")

        expect(() => {
            serializer.validateSamcanFile({
                version: "1.0.0",
                metadata: {
                    name: "Test",
                    created: "20XX-XX-XX",
                    modified: "20XX-XX-XX",
                },
                artboards: [
                    {
                        name: "Artboard",
                        width: 800,
                        height: 600,
                        backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
                        nodes: [],
                        timeline: { duration: 0, fps: 60, tracks: [] },
                    },
                ],
                assets: [],
            })
        }).toThrow("artboard at index 0 missing 'id'")

        expect(() => {
            serializer.validateSamcanFile({
                version: "1.0.0",
                metadata: {
                    name: "Test",
                    created: "20XX-XX-XX",
                    modified: "20XX-XX-XX",
                },
                artboards: [
                    {
                        id: "artboard_1",
                        name: "Artboard",
                        width: -100,
                        height: 600,
                        backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
                        nodes: [],
                        timeline: { duration: 0, fps: 60, tracks: [] },
                    },
                ],
                assets: [],
            })
        }).toThrow("artboard at index 0 has invalid 'width'")
    })

    it("should handle JSON parsing errors gracefully", () => {
        const serializer = new Serializer()

        expect(() => {
            serializer.fromJSON("invalid json {")
        }).toThrow("Failed to parse samcan file")

        expect(() => {
            serializer.fromJSON("")
        }).toThrow("Failed to parse samcan file")
    })

    it("should migrate file to current version", () => {
        const serializer = new Serializer()
        const artboard = new Artboard(800, 600, Color.white())
        const file = serializer.serializeSamcanFile([artboard])

        file.version = "1.0.0"

        const migrated = serializer.migrateSamcanFile(file)

        expect(migrated.version).toBe("1.0.0")
        expect(migrated.artboards.length).toBe(1)
    })

    it("should reject incompatible major versions", () => {
        const serializer = new Serializer()
        const artboard = new Artboard(800, 600, Color.white())
        const file = serializer.serializeSamcanFile([artboard])

        file.version = "2.0.0"

        expect(() => {
            serializer.migrateSamcanFile(file)
        }).toThrow("Incompatible samcan file version")
    })

    it("should accept compatible minor versions", () => {
        const serializer = new Serializer()
        const artboard = new Artboard(800, 600, Color.white())
        const file = serializer.serializeSamcanFile([artboard])

        file.version = "1.0.0"

        const migrated = serializer.migrateSamcanFile(file)

        expect(migrated.version).toBe("1.0.0")
    })

    it("should validate and migrate when loading from JSON", () => {
        const serializer = new Serializer()
        const artboard = new Artboard(800, 600, Color.white())
        const file = serializer.serializeSamcanFile([artboard])

        const json = serializer.toJSON(file)
        const loaded = serializer.fromJSON(json)

        expect(loaded.version).toBe("1.0.0")
        expect(loaded.artboards.length).toBe(1)
    })

    it("should reject invalid JSON structure during load", () => {
        const serializer = new Serializer()

        const invalidFile = {
            version: "1.0.0",
            metadata: {
                name: "Test",
                created: "20XX-XX-XX",
                modified: "20XX-XX-XX",
            },
            artboards: "not an array",
            assets: [],
        }

        expect(() => {
            serializer.fromJSON(JSON.stringify(invalidFile))
        }).toThrow("Invalid samcan file: missing or invalid artboards")
    })
})

describe("Serializer - State Machine Deserialization", () => {
    it("should deserialize animation state", () => {
        const serializer = new Serializer()
        const artboard = new Artboard(800, 600)
        const shape = new ShapeNode(new Path())
        artboard.addChild(shape)

        serializer.serializeArtboard(artboard)

        const timeline = new Timeline(3.0, 60)
        const track = new AnimationTrack(shape, "opacity")
        track.addKeyframe(new Keyframe(0, 0, "linear"))
        track.addKeyframe(new Keyframe(3.0, 1, "linear"))
        timeline.addTrack(track)

        const state = new AnimationState(
            "idle",
            "Idle State",
            timeline,
            1.5,
            true,
        )
        const stateData = serializer.serializeAnimationState(state)

        const nodeMap = new Map()
        nodeMap.set("node_1", shape)

        const deserialized = serializer.deserializeAnimationState(
            stateData,
            nodeMap,
        )

        expect(deserialized.id).toBe("idle")
        expect(deserialized.name).toBe("Idle State")
        expect(deserialized.speed).toBe(1.5)
        expect(deserialized.loop).toBe(true)
        expect(deserialized.timeline.duration).toBe(3.0)
        expect(deserialized.timeline.fps).toBe(60)
    })

    it("should deserialize event condition", () => {
        const serializer = new Serializer()
        const condition = new EventCondition("jump")
        const conditionData = serializer.serializeTransitionCondition(condition)

        const deserialized =
            serializer.deserializeTransitionCondition(conditionData)

        expect(deserialized.type).toBe("event")
        expect((deserialized as EventCondition).eventName).toBe("jump")
    })

    it("should deserialize boolean condition", () => {
        const serializer = new Serializer()
        const condition = new BooleanCondition("isGrounded", true)
        const conditionData = serializer.serializeTransitionCondition(condition)

        const deserialized =
            serializer.deserializeTransitionCondition(conditionData)

        expect(deserialized.type).toBe("boolean")
        expect((deserialized as BooleanCondition).inputName).toBe("isGrounded")
        expect((deserialized as BooleanCondition).expectedValue).toBe(true)
    })

    it("should deserialize number condition", () => {
        const serializer = new Serializer()
        const condition = new NumberCondition("speed", "greaterThan", 5.0)
        const conditionData = serializer.serializeTransitionCondition(condition)

        const deserialized =
            serializer.deserializeTransitionCondition(conditionData)

        expect(deserialized.type).toBe("number")
        expect((deserialized as NumberCondition).inputName).toBe("speed")
        expect((deserialized as NumberCondition).operator).toBe("greaterThan")
        expect((deserialized as NumberCondition).threshold).toBe(5.0)
    })

    it("should deserialize time condition", () => {
        const serializer = new Serializer()
        const condition = new TimeCondition(2.5)
        const conditionData = serializer.serializeTransitionCondition(condition)

        const deserialized =
            serializer.deserializeTransitionCondition(conditionData)

        expect(deserialized.type).toBe("time")
        expect((deserialized as TimeCondition).duration).toBe(2.5)
    })

    it("should deserialize state transition", () => {
        const serializer = new Serializer()
        const conditions = [
            new EventCondition("attack"),
            new BooleanCondition("canAttack", true),
        ]
        const transition = new StateTransition(
            "idle",
            "attack",
            conditions,
            0.2,
            10,
        )
        const transitionData = serializer.serializeStateTransition(transition)

        const deserialized =
            serializer.deserializeStateTransition(transitionData)

        expect(deserialized.from).toBe("idle")
        expect(deserialized.to).toBe("attack")
        expect(deserialized.duration).toBe(0.2)
        expect(deserialized.priority).toBe(10)
        expect(deserialized.conditions.length).toBe(2)
    })

    it("should deserialize complete state machine", () => {
        const serializer = new Serializer()
        const artboard = new Artboard(800, 600)
        const shape = new ShapeNode(new Path())
        artboard.addChild(shape)

        serializer.serializeArtboard(artboard)

        const stateMachine = new StateMachine()

        const idleTimeline = new Timeline(2.0, 60)
        const idleTrack = new AnimationTrack(shape, "opacity")
        idleTrack.addKeyframe(new Keyframe(0, 1, "linear"))
        idleTimeline.addTrack(idleTrack)
        const idleState = new AnimationState(
            "idle",
            "Idle",
            idleTimeline,
            1.0,
            true,
        )
        stateMachine.addState(idleState)

        const runTimeline = new Timeline(1.0, 60)
        const runTrack = new AnimationTrack(shape, "opacity")
        runTrack.addKeyframe(new Keyframe(0, 0.5, "linear"))
        runTimeline.addTrack(runTrack)
        const runState = new AnimationState(
            "run",
            "Run",
            runTimeline,
            2.0,
            true,
        )
        stateMachine.addState(runState)

        const transition = new StateTransition(
            "idle",
            "run",
            [new EventCondition("startRun")],
            0.1,
            5,
        )
        stateMachine.addTransition(transition)

        stateMachine.changeState("idle")

        const smData = serializer.serializeStateMachine(
            stateMachine,
            "sm1",
            "Main State Machine",
        )

        const deserialized = serializer.deserializeStateMachine(smData, [
            artboard,
        ])

        expect(deserialized.states.size).toBe(2)
        expect(deserialized.getState("idle")).toBeDefined()
        expect(deserialized.getState("run")).toBeDefined()
        expect(deserialized.transitions.length).toBe(1)
        expect(deserialized.currentState?.id).toBe("idle")
    })

    it("should round-trip state machine serialization", () => {
        const serializer = new Serializer()
        const artboard = new Artboard(800, 600)
        const shape = new ShapeNode(new Path())
        artboard.addChild(shape)

        serializer.serializeArtboard(artboard)

        const stateMachine = new StateMachine()

        const timeline1 = new Timeline(3.0, 30)
        const track1 = new AnimationTrack(shape, "transform.position.x")
        track1.addKeyframe(new Keyframe(0, 0, "linear"))
        track1.addKeyframe(new Keyframe(3.0, 100, "cubic", Easing.inOutCubic))
        timeline1.addTrack(track1)

        const state1 = new AnimationState(
            "state1",
            "State 1",
            timeline1,
            1.0,
            false,
        )
        stateMachine.addState(state1)

        const timeline2 = new Timeline(2.0, 30)
        const track2 = new AnimationTrack(shape, "transform.position.y")
        track2.addKeyframe(new Keyframe(0, 0, "linear"))
        track2.addKeyframe(new Keyframe(2.0, 50, "linear"))
        timeline2.addTrack(track2)

        const state2 = new AnimationState(
            "state2",
            "State 2",
            timeline2,
            0.5,
            true,
        )
        stateMachine.addState(state2)

        const transition1 = new StateTransition(
            "state1",
            "state2",
            [new TimeCondition(3.0)],
            0.5,
            1,
        )
        stateMachine.addTransition(transition1)

        const transition2 = new StateTransition(
            "state2",
            "state1",
            [new NumberCondition("health", "lessThan", 50)],
            0.3,
            2,
        )
        stateMachine.addTransition(transition2)

        stateMachine.changeState("state1")

        const smData = serializer.serializeStateMachine(
            stateMachine,
            "sm1",
            "Test SM",
        )
        const deserialized = serializer.deserializeStateMachine(smData, [
            artboard,
        ])

        expect(deserialized.states.size).toBe(2)
        expect(deserialized.transitions.length).toBe(2)

        const deserializedState1 = deserialized.getState("state1")
        expect(deserializedState1?.name).toBe("State 1")
        expect(deserializedState1?.speed).toBe(1.0)
        expect(deserializedState1?.loop).toBe(false)
        expect(deserializedState1?.timeline.duration).toBe(3.0)

        const deserializedState2 = deserialized.getState("state2")
        expect(deserializedState2?.name).toBe("State 2")
        expect(deserializedState2?.speed).toBe(0.5)
        expect(deserializedState2?.loop).toBe(true)
        expect(deserializedState2?.timeline.duration).toBe(2.0)

        expect(deserialized.currentState?.id).toBe("state1")
    })
})
