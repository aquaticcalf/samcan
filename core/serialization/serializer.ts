import { Color } from "../math/color"
import { Vector2 } from "../math/vector2"
import { Matrix } from "../math/matrix"
import { Transform } from "../scene/transform"
import { Paint } from "../math/paint"
import { Path } from "../math/path"
import { SceneNode } from "../scene/node"
import { Artboard } from "../scene/nodes/artboard"
import { GroupNode } from "../scene/nodes/groupnode"
import { ShapeNode } from "../scene/nodes/shapenode"
import { ImageNode } from "../scene/nodes/imagenode"
import { Timeline } from "../animation/timeline"
import { AnimationTrack } from "../animation/animationtrack"
import { Keyframe } from "../animation/keyframe"
import { AnimationState } from "../animation/animationstate"
import { StateMachine } from "../animation/statemachine"
import { StateTransition } from "../animation/statetransition"
import { Easing } from "../animation/easing"
import type {
    ColorData,
    Vector2Data,
    MatrixData,
    TransformData,
    PaintData,
    ShapeData,
    ImageData,
    NodeData,
    NodeType,
    KeyframeData,
    AnimationTrackData,
    TimelineData,
    AnimationStateData,
    StateMachineData,
    StateTransitionData,
    TransitionConditionData,
    ArtboardData,
    SamcanFile,
    FileMetadata,
    GradientData,
    GradientStopData,
} from "./types"

/**
 * Serializer converts runtime objects to serializable data structures
 * Handles conversion of Artboards, scene graphs, timelines, and state machines to JSON-compatible format
 */
export class Serializer {
    private _nodeIdMap: Map<SceneNode, string> = new Map()
    private _nextNodeId = 0

    /**
     * Serialize an Artboard to ArtboardData
     */
    serializeArtboard(artboard: Artboard): ArtboardData {
        // Reset node ID mapping for this artboard
        this._nodeIdMap.clear()
        this._nextNodeId = 0

        // Assign IDs to all nodes in the scene graph
        this._assignNodeIds(artboard)

        return {
            id: this._getNodeId(artboard),
            name: "Artboard",
            width: artboard.width,
            height: artboard.height,
            backgroundColor: this.serializeColor(artboard.backgroundColor),
            nodes: this._serializeChildren(artboard),
            timeline: this.serializeTimeline(new Timeline(0, 60)), // Empty timeline for now
        }
    }

    /**
     * Serialize a Timeline to TimelineData
     */
    serializeTimeline(timeline: Timeline): TimelineData {
        return {
            duration: timeline.duration,
            fps: timeline.fps,
            tracks: timeline.tracks.map((track) =>
                this.serializeAnimationTrack(track),
            ),
        }
    }

    /**
     * Serialize an AnimationTrack to AnimationTrackData
     */
    serializeAnimationTrack(track: AnimationTrack): AnimationTrackData {
        const targetId = this._nodeIdMap.get(track.target)
        if (!targetId) {
            throw new Error(
                "Cannot serialize track: target node not found in ID map",
            )
        }

        return {
            targetNodeId: targetId,
            property: track.property,
            keyframes: track.keyframes.map((keyframe) =>
                this.serializeKeyframe(keyframe),
            ),
        }
    }

    /**
     * Serialize a Keyframe to KeyframeData
     */
    serializeKeyframe(keyframe: Keyframe): KeyframeData {
        const data: KeyframeData = {
            time: keyframe.time,
            value: keyframe.value,
            interpolation: keyframe.interpolation,
        }

        // Try to find the easing function name
        if (keyframe.easing) {
            const easingName = this._getEasingName(keyframe.easing)
            if (easingName) {
                data.easingName = easingName
            }
        }

        return data
    }

    /**
     * Serialize an AnimationState to AnimationStateData
     */
    serializeAnimationState(state: AnimationState): AnimationStateData {
        return {
            id: state.id,
            name: state.name,
            timeline: this.serializeTimeline(state.timeline),
            speed: state.speed,
            loop: state.loop,
        }
    }

    /**
     * Serialize a StateMachine to StateMachineData
     */
    serializeStateMachine(
        stateMachine: StateMachine,
        id: string,
        name: string,
    ): StateMachineData {
        const states = Array.from(stateMachine.states.values()).map((state) =>
            this.serializeAnimationState(state),
        )

        const transitions = stateMachine.transitions.map((transition) =>
            this.serializeStateTransition(transition),
        )

        return {
            id,
            name,
            states,
            transitions,
            initialStateId: stateMachine.currentState?.id,
        }
    }

    /**
     * Serialize a StateTransition to StateTransitionData
     */
    serializeStateTransition(transition: StateTransition): StateTransitionData {
        return {
            from: transition.from,
            to: transition.to,
            conditions: transition.conditions.map((condition) =>
                this.serializeTransitionCondition(condition),
            ),
            duration: transition.duration,
            priority: transition.priority,
        }
    }

    /**
     * Serialize a TransitionCondition to TransitionConditionData
     */
    serializeTransitionCondition(condition: {
        type: string
        eventName?: string
        inputName?: string
        expectedValue?: boolean
        operator?: string
        threshold?: number
        duration?: number
    }): TransitionConditionData {
        const data: TransitionConditionData = {
            type: condition.type as TransitionConditionData["type"],
        }

        if (condition.eventName !== undefined) {
            data.eventName = condition.eventName
        }
        if (condition.inputName !== undefined) {
            data.inputName = condition.inputName
        }
        if (condition.expectedValue !== undefined) {
            data.expectedValue = condition.expectedValue
        }
        if (condition.operator !== undefined) {
            data.operator =
                condition.operator as TransitionConditionData["operator"]
        }
        if (condition.threshold !== undefined) {
            data.threshold = condition.threshold
        }
        if (condition.duration !== undefined) {
            data.duration = condition.duration
        }

        return data
    }

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
     * Serialize a Vector2 to Vector2Data
     */
    serializeVector2(vector: Vector2): Vector2Data {
        return {
            x: vector.x,
            y: vector.y,
        }
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
            data.gradient = this._serializeGradient(paint.gradient)
        }

        return data
    }

    /**
     * Serialize a complete SamcanFile
     */
    serializeSamcanFile(
        artboards: Artboard[],
        metadata: Partial<FileMetadata> = {},
    ): SamcanFile {
        const now = new Date().toISOString()

        return {
            version: "1.0.0",
            metadata: {
                name: metadata.name || "Untitled",
                author: metadata.author,
                created: metadata.created || now,
                modified: now,
                description: metadata.description,
            },
            artboards: artboards.map((artboard) =>
                this.serializeArtboard(artboard),
            ),
            assets: [],
            stateMachines: [],
        }
    }

    /**
     * Generate JSON string from SamcanFile
     */
    toJSON(file: SamcanFile, pretty: boolean = true): string {
        return JSON.stringify(file, null, pretty ? 2 : undefined)
    }

    /**
     * Assign unique IDs to all nodes in the scene graph
     */
    private _assignNodeIds(node: SceneNode): void {
        if (!this._nodeIdMap.has(node)) {
            this._nodeIdMap.set(node, `node_${this._nextNodeId++}`)
        }

        for (const child of node.children) {
            this._assignNodeIds(child)
        }
    }

    /**
     * Get the ID for a node
     */
    private _getNodeId(node: SceneNode): string {
        const id = this._nodeIdMap.get(node)
        if (!id) {
            throw new Error("Node ID not found - call _assignNodeIds first")
        }
        return id
    }

    /**
     * Serialize children nodes
     */
    private _serializeChildren(node: SceneNode): NodeData[] {
        return node.children.map((child) => this._serializeNode(child))
    }

    /**
     * Serialize a SceneNode to NodeData
     */
    private _serializeNode(node: SceneNode): NodeData {
        const baseData: NodeData = {
            id: this._getNodeId(node),
            type: this._getNodeType(node),
            name: this._getNodeName(node),
            transform: this.serializeTransform(node.transform),
            visible: node.visible,
            opacity: node.opacity,
        }

        // Add type-specific data
        if (node instanceof ShapeNode) {
            baseData.shape = this._serializeShapeData(node)
        } else if (node instanceof ImageNode) {
            baseData.image = this._serializeImageData(node)
        }

        // Add children for group nodes and artboards
        if (node instanceof GroupNode || node instanceof Artboard) {
            baseData.children = this._serializeChildren(node)
        }

        return baseData
    }

    /**
     * Get the node type
     */
    private _getNodeType(node: SceneNode): NodeType {
        if (node instanceof Artboard) {
            return "artboard"
        }
        if (node instanceof ShapeNode) {
            return "shape"
        }
        if (node instanceof ImageNode) {
            return "image"
        }
        if (node instanceof GroupNode) {
            return "group"
        }
        return "group" // Default fallback
    }

    /**
     * Get a name for the node
     */
    private _getNodeName(node: SceneNode): string {
        if (node instanceof Artboard) {
            return "Artboard"
        }
        if (node instanceof ShapeNode) {
            return "Shape"
        }
        if (node instanceof ImageNode) {
            return "Image"
        }
        if (node instanceof GroupNode) {
            return "Group"
        }
        return "Node"
    }

    /**
     * Serialize ShapeNode data
     */
    private _serializeShapeData(node: ShapeNode): ShapeData {
        return {
            path: node.path.toJSON(),
            fill: node.fill ? this.serializePaint(node.fill) : undefined,
            stroke: node.stroke ? this.serializePaint(node.stroke) : undefined,
            strokeWidth: node.strokeWidth,
        }
    }

    /**
     * Serialize ImageNode data
     */
    private _serializeImageData(node: ImageNode): ImageData {
        // For now, we'll store the image as a string (URL or asset ID)
        const assetId =
            typeof node.imageData === "string"
                ? node.imageData
                : "embedded_image"

        const data: ImageData = {
            assetId,
        }

        if (node.sourceRect) {
            data.sourceRect = {
                x: node.sourceRect.x,
                y: node.sourceRect.y,
                width: node.sourceRect.width,
                height: node.sourceRect.height,
            }
        }

        return data
    }

    /**
     * Serialize a gradient
     */
    private _serializeGradient(
        gradient: Paint["gradient"],
    ): GradientData | undefined {
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
     * Try to find the name of an easing function
     */
    private _getEasingName(
        easingFn: (t: number) => number,
    ): string | undefined {
        // Check against known easing functions
        const easingEntries = Object.entries(Easing) as [
            string,
            (t: number) => number,
        ][]

        for (const [name, fn] of easingEntries) {
            if (fn === easingFn) {
                return name
            }
        }

        return undefined
    }
}
