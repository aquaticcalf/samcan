/**
 * Custom fast-check arbitraries for editor property-based testing
 * These generators create random instances of editor types for PBT
 */

import * as fc from "fast-check"
import { Vector2 } from "../core/math/vector2"
import { Rectangle } from "../core/math/rectangle"
import { Color } from "../core/math/color"
import { Transform } from "../core/scene/transform"
import { SceneNode } from "../core/scene/node"
import { ShapeNode } from "../core/scene/nodes/shapenode"
import { Path } from "../core/math/path"
import { GroupNode } from "../core/scene/nodes/groupnode"
import { Artboard } from "../core/scene/nodes/artboard"
import type {
    ViewportState,
    ToolType,
    PanelPosition,
    KeyframeSelection,
    EditorPreferences,
    GizmoHandleType,
    SnapGuide,
} from "../core/editor/core/types"

// ============================================================================
// Math Arbitraries
// ============================================================================

/**
 * Generate a Vector2 with reasonable coordinate values
 * Uses fc.double() for double-precision floating point numbers
 */
export const arbVector2 = (min = -1000, max = 1000): fc.Arbitrary<Vector2> =>
    fc
        .record({
            x: fc.double({ min, max, noNaN: true }),
            y: fc.double({ min, max, noNaN: true }),
        })
        .map(({ x, y }) => new Vector2(x, y))

/**
 * Generate a normalized Vector2 (length = 1)
 */
export const arbNormalizedVector2: fc.Arbitrary<Vector2> = fc
    .double({ min: 0, max: Math.PI * 2, noNaN: true })
    .map((angle) => new Vector2(Math.cos(angle), Math.sin(angle)))

/**
 * Generate a Rectangle with positive dimensions
 */
export const arbRectangle = (
    minPos = -1000,
    maxPos = 1000,
    minSize = 1,
    maxSize = 500,
): fc.Arbitrary<Rectangle> =>
    fc
        .record({
            x: fc.double({ min: minPos, max: maxPos, noNaN: true }),
            y: fc.double({ min: minPos, max: maxPos, noNaN: true }),
            width: fc.double({ min: minSize, max: maxSize, noNaN: true }),
            height: fc.double({ min: minSize, max: maxSize, noNaN: true }),
        })
        .map(({ x, y, width, height }) => new Rectangle(x, y, width, height))

/**
 * Generate a Color with valid RGBA values
 */
export const arbColor: fc.Arbitrary<Color> = fc
    .record({
        r: fc.double({ min: 0, max: 1, noNaN: true }),
        g: fc.double({ min: 0, max: 1, noNaN: true }),
        b: fc.double({ min: 0, max: 1, noNaN: true }),
        a: fc.double({ min: 0, max: 1, noNaN: true }),
    })
    .map(({ r, g, b, a }) => new Color(r, g, b, a))

/**
 * Generate a Transform with reasonable values
 */
export const arbTransform: fc.Arbitrary<Transform> = fc
    .record({
        posX: fc.double({ min: -1000, max: 1000, noNaN: true }),
        posY: fc.double({ min: -1000, max: 1000, noNaN: true }),
        rotation: fc.double({ min: -Math.PI, max: Math.PI, noNaN: true }),
        scaleX: fc.double({ min: 0.1, max: 10, noNaN: true }),
        scaleY: fc.double({ min: 0.1, max: 10, noNaN: true }),
        pivotX: fc.double({ min: -100, max: 100, noNaN: true }),
        pivotY: fc.double({ min: -100, max: 100, noNaN: true }),
    })
    .map(({ posX, posY, rotation, scaleX, scaleY, pivotX, pivotY }) => {
        const t = Transform.identity()
        t.position = new Vector2(posX, posY)
        t.rotation = rotation
        t.scale = new Vector2(scaleX, scaleY)
        t.pivot = new Vector2(pivotX, pivotY)
        return t
    })

// ============================================================================
// Viewport Arbitraries
// ============================================================================

/**
 * Generate a valid zoom level (0.1 to 10)
 */
export const arbZoomLevel: fc.Arbitrary<number> = fc.double({
    min: 0.1,
    max: 10,
    noNaN: true,
})

/**
 * Generate a zoom delta for zoom in/out operations
 */
export const arbZoomDelta: fc.Arbitrary<number> = fc.double({
    min: 0.5,
    max: 2,
    noNaN: true,
})

/**
 * Generate a pan delta
 */
export const arbPanDelta: fc.Arbitrary<{ deltaX: number; deltaY: number }> =
    fc.record({
        deltaX: fc.double({ min: -500, max: 500, noNaN: true }),
        deltaY: fc.double({ min: -500, max: 500, noNaN: true }),
    })

/**
 * Generate a ViewportState
 */
export const arbViewportState: fc.Arbitrary<ViewportState> = fc.record({
    zoom: arbZoomLevel,
    panX: fc.double({ min: -2000, max: 2000, noNaN: true }),
    panY: fc.double({ min: -2000, max: 2000, noNaN: true }),
    showGrid: fc.boolean(),
    showGuides: fc.boolean(),
    snapEnabled: fc.boolean(),
})

// ============================================================================
// Tool Arbitraries
// ============================================================================

/**
 * Generate a ToolType
 */
export const arbToolType: fc.Arbitrary<ToolType> = fc.constantFrom(
    "selection",
    "rectangle",
    "ellipse",
    "pen",
    "hand",
    "zoom",
)

/**
 * Generate a GizmoHandleType
 */
export const arbGizmoHandleType: fc.Arbitrary<GizmoHandleType> =
    fc.constantFrom("corner", "edge", "rotation", "center")

// ============================================================================
// Panel Arbitraries
// ============================================================================

/**
 * Generate a PanelPosition
 */
export const arbPanelPosition: fc.Arbitrary<PanelPosition> = fc.constantFrom(
    "left",
    "right",
    "bottom",
    "floating",
)

// ============================================================================
// Selection Arbitraries
// ============================================================================

/**
 * Generate a KeyframeSelection
 */
export const arbKeyframeSelection: fc.Arbitrary<KeyframeSelection> = fc.record({
    trackId: fc.uuid(),
    nodeId: fc.uuid(),
    property: fc.constantFrom(
        "transform.position.x",
        "transform.position.y",
        "transform.rotation",
        "transform.scale.x",
        "transform.scale.y",
        "opacity",
    ),
    time: fc.double({ min: 0, max: 60, noNaN: true }),
})

// ============================================================================
// Scene Node Arbitraries
// ============================================================================

/**
 * Generate a basic SceneNode
 */
export const arbSceneNode: fc.Arbitrary<SceneNode> = arbTransform.map(
    (transform) => new SceneNode(transform),
)

/**
 * Generate a simple rectangle Path
 */
export const arbRectanglePath = (
    minSize = 10,
    maxSize = 500,
): fc.Arbitrary<Path> =>
    fc
        .record({
            width: fc.double({ min: minSize, max: maxSize, noNaN: true }),
            height: fc.double({ min: minSize, max: maxSize, noNaN: true }),
        })
        .map(({ width, height }) => {
            const path = new Path()
            path.moveTo(0, 0)
            path.lineTo(width, 0)
            path.lineTo(width, height)
            path.lineTo(0, height)
            path.close()
            return path
        })

/**
 * Generate a ShapeNode with a simple rectangle path
 */
export const arbShapeNode: fc.Arbitrary<ShapeNode> = fc
    .record({
        transform: arbTransform,
        path: arbRectanglePath(),
    })
    .map(({ transform, path }) => {
        const node = new ShapeNode(path, transform)
        return node
    })

/**
 * Generate a GroupNode
 */
export const arbGroupNode: fc.Arbitrary<GroupNode> = arbTransform.map(
    (transform) => {
        const node = new GroupNode()
        node.transform = transform
        return node
    },
)

/**
 * Generate an Artboard with reasonable dimensions
 */
export const arbArtboard: fc.Arbitrary<Artboard> = fc
    .record({
        width: fc.integer({ min: 100, max: 4000 }),
        height: fc.integer({ min: 100, max: 4000 }),
        bgColor: arbColor,
    })
    .map(({ width, height, bgColor }) => {
        const artboard = new Artboard(width, height)
        artboard.backgroundColor = bgColor
        return artboard
    })

// ============================================================================
// Snap Arbitraries
// ============================================================================

/**
 * Generate a SnapGuide
 */
export const arbSnapGuide: fc.Arbitrary<SnapGuide> = fc.record({
    type: fc.constantFrom("horizontal", "vertical") as fc.Arbitrary<
        "horizontal" | "vertical"
    >,
    position: fc.double({ min: -1000, max: 1000, noNaN: true }),
    sourceNode: fc.constant(undefined),
})

// ============================================================================
// Drag Operation Arbitraries
// ============================================================================

/**
 * Generate start and end points for a drag operation
 */
export const arbDragPoints: fc.Arbitrary<{
    start: Vector2
    end: Vector2
}> = fc.record({
    start: arbVector2(-500, 500),
    end: arbVector2(-500, 500),
})

/**
 * Generate modifier key state for drag operations
 */
export const arbModifierKeys: fc.Arbitrary<{
    shiftKey: boolean
    ctrlKey: boolean
    altKey: boolean
}> = fc.record({
    shiftKey: fc.boolean(),
    ctrlKey: fc.boolean(),
    altKey: fc.boolean(),
})

// ============================================================================
// Time Arbitraries
// ============================================================================

/**
 * Generate a valid animation time (0 to 60 seconds)
 */
export const arbAnimationTime: fc.Arbitrary<number> = fc.double({
    min: 0,
    max: 60,
    noNaN: true,
})

/**
 * Generate a time delta for scrubbing
 */
export const arbTimeDelta: fc.Arbitrary<number> = fc.double({
    min: -10,
    max: 10,
    noNaN: true,
})

// ============================================================================
// Preferences Arbitraries
// ============================================================================

/**
 * Generate a hex color string like "#ff00aa"
 */
const arbHexColor: fc.Arbitrary<string> = fc
    .tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
    )
    .map(
        ([r, g, b]) =>
            `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`,
    )

/**
 * Generate EditorPreferences
 */
export const arbEditorPreferences: fc.Arbitrary<EditorPreferences> = fc.record({
    showGrid: fc.boolean(),
    gridSize: fc.integer({ min: 5, max: 100 }),
    gridColor: arbHexColor,
    snapEnabled: fc.boolean(),
    snapThreshold: fc.integer({ min: 1, max: 20 }),
    snapToGrid: fc.boolean(),
    snapToObjects: fc.boolean(),
    snapToArtboard: fc.boolean(),
    theme: fc.constantFrom("light", "dark") as fc.Arbitrary<"light" | "dark">,
    canvasBackground: arbHexColor,
    selectionColor: arbHexColor,
    autoKeyframe: fc.boolean(),
    confirmDelete: fc.boolean(),
    customShortcuts: fc.constant({}),
})

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a list of scene nodes with a given size range
 */
export const arbSceneNodeList = (
    minSize = 0,
    maxSize = 10,
): fc.Arbitrary<SceneNode[]> =>
    fc.array(arbSceneNode, { minLength: minSize, maxLength: maxSize })

/**
 * Generate a scene with an artboard and some child nodes
 */
export const arbScene: fc.Arbitrary<{
    artboard: Artboard
    nodes: SceneNode[]
}> = fc
    .record({
        artboard: arbArtboard,
        nodeCount: fc.integer({ min: 1, max: 10 }),
    })
    .chain(({ artboard, nodeCount }) =>
        fc
            .array(arbSceneNode, {
                minLength: nodeCount,
                maxLength: nodeCount,
            })
            .map((nodes) => {
                // Add nodes to artboard
                for (const node of nodes) {
                    artboard.addChild(node)
                }
                return { artboard, nodes }
            }),
    )

/**
 * Check if two numbers are approximately equal
 */
export function approxEqual(a: number, b: number, epsilon = 0.0001): boolean {
    return Math.abs(a - b) < epsilon
}

/**
 * Check if two Vector2s are approximately equal
 */
export function vectorApproxEqual(
    a: Vector2,
    b: Vector2,
    epsilon = 0.0001,
): boolean {
    return approxEqual(a.x, b.x, epsilon) && approxEqual(a.y, b.y, epsilon)
}

/**
 * Check if two Rectangles are approximately equal
 */
export function rectangleApproxEqual(
    a: Rectangle,
    b: Rectangle,
    epsilon = 0.0001,
): boolean {
    return (
        approxEqual(a.x, b.x, epsilon) &&
        approxEqual(a.y, b.y, epsilon) &&
        approxEqual(a.width, b.width, epsilon) &&
        approxEqual(a.height, b.height, epsilon)
    )
}
