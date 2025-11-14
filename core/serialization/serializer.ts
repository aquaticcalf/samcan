import { Color } from "../math/color"
import { Vector2 } from "../math/vector2"
import { Matrix } from "../math/matrix"
import { Rectangle } from "../math/rectangle"
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
import {
    StateTransition,
    EventCondition,
    BooleanCondition,
    NumberCondition,
    TimeCondition,
    type TransitionCondition,
} from "../animation/statetransition"
import { Easing } from "../animation/easing"
import type { BlendMode } from "../math/paint"
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

    /**
     * Deserialize a SamcanFile from JSON string
     */
    fromJSON(json: string): SamcanFile {
        const data = JSON.parse(json) as SamcanFile
        return this.validateSamcanFile(data)
    }

    /**
     * Validate a SamcanFile structure
     */
    validateSamcanFile(data: unknown): SamcanFile {
        if (typeof data !== "object" || data === null) {
            throw new Error("Invalid samcan file: not an object")
        }

        const file = data as Record<string, unknown>

        if (typeof file.version !== "string") {
            throw new Error("Invalid samcan file: missing or invalid version")
        }

        if (typeof file.metadata !== "object" || file.metadata === null) {
            throw new Error("Invalid samcan file: missing or invalid metadata")
        }

        if (!Array.isArray(file.artboards)) {
            throw new Error("Invalid samcan file: missing or invalid artboards")
        }

        if (!Array.isArray(file.assets)) {
            throw new Error("Invalid samcan file: missing or invalid assets")
        }

        return data as SamcanFile
    }

    /**
     * Deserialize a SamcanFile to runtime objects
     */
    deserializeSamcanFile(data: SamcanFile): {
        artboards: Artboard[]
        stateMachines: Map<string, StateMachine>
    } {
        const artboards = data.artboards.map((artboardData) =>
            this.deserializeArtboard(artboardData),
        )

        const stateMachines = new Map<string, StateMachine>()
        if (data.stateMachines) {
            for (const smData of data.stateMachines) {
                const sm = this.deserializeStateMachine(smData, artboards)
                stateMachines.set(smData.id, sm)
            }
        }

        return { artboards, stateMachines }
    }

    /**
     * Deserialize an Artboard from ArtboardData
     */
    deserializeArtboard(data: ArtboardData): Artboard {
        // Create artboard
        const backgroundColor = this.deserializeColor(data.backgroundColor)
        const artboard = new Artboard(data.width, data.height, backgroundColor)

        // Build node ID map for this artboard
        const nodeMap = new Map<string, SceneNode>()
        nodeMap.set(data.id, artboard)

        // Deserialize all nodes
        for (const nodeData of data.nodes) {
            const node = this.deserializeNode(nodeData, nodeMap)
            artboard.addChild(node)
        }

        // Deserialize timeline if present
        if (data.timeline && data.timeline.tracks.length > 0) {
            const timeline = this.deserializeTimeline(data.timeline, nodeMap)
            // Store timeline on artboard (would need to add this property to Artboard class)
            // For now, we'll just create it but not attach it
        }

        return artboard
    }

    /**
     * Deserialize a SceneNode from NodeData
     */
    deserializeNode(
        data: NodeData,
        nodeMap: Map<string, SceneNode>,
    ): SceneNode {
        // Deserialize transform
        const transform = this.deserializeTransform(data.transform)

        // Create node based on type
        let node: SceneNode

        switch (data.type) {
            case "artboard":
                throw new Error(
                    "Artboard nodes should not be nested in node data",
                )

            case "group":
                node = new GroupNode(transform)
                break

            case "shape":
                if (!data.shape) {
                    throw new Error("Shape node missing shape data")
                }
                node = this.deserializeShapeNode(data.shape, transform)
                break

            case "image":
                if (!data.image) {
                    throw new Error("Image node missing image data")
                }
                node = this.deserializeImageNode(data.image, transform)
                break

            case "text":
                // Text nodes not yet implemented, create as group
                node = new GroupNode(transform)
                break

            default:
                throw new Error(`Unknown node type: ${data.type}`)
        }

        // Set common properties
        node.visible = data.visible
        node.opacity = data.opacity

        // Add to node map
        nodeMap.set(data.id, node)

        // Deserialize children
        if (data.children) {
            for (const childData of data.children) {
                const child = this.deserializeNode(childData, nodeMap)
                node.addChild(child)
            }
        }

        return node
    }

    /**
     * Deserialize a ShapeNode from ShapeData
     */
    deserializeShapeNode(data: ShapeData, transform: Transform): ShapeNode {
        const path = Path.fromJSON(data.path)
        const node = new ShapeNode(path, transform)

        if (data.fill) {
            node.fill = this.deserializePaint(data.fill)
        }

        if (data.stroke) {
            node.stroke = this.deserializePaint(data.stroke)
        }

        node.strokeWidth = data.strokeWidth

        return node
    }

    /**
     * Deserialize an ImageNode from ImageData
     */
    deserializeImageNode(data: ImageData, transform: Transform): ImageNode {
        const node = new ImageNode(data.assetId, transform)

        if (data.sourceRect) {
            node.sourceRect = new Rectangle(
                data.sourceRect.x,
                data.sourceRect.y,
                data.sourceRect.width,
                data.sourceRect.height,
            )
        }

        return node
    }

    /**
     * Deserialize a Timeline from TimelineData
     */
    deserializeTimeline(
        data: TimelineData,
        nodeMap: Map<string, SceneNode>,
    ): Timeline {
        const timeline = new Timeline(data.duration, data.fps)

        for (const trackData of data.tracks) {
            const track = this.deserializeAnimationTrack(trackData, nodeMap)
            timeline.addTrack(track)
        }

        return timeline
    }

    /**
     * Deserialize an AnimationTrack from AnimationTrackData
     */
    deserializeAnimationTrack(
        data: AnimationTrackData,
        nodeMap: Map<string, SceneNode>,
    ): AnimationTrack {
        const target = nodeMap.get(data.targetNodeId)
        if (!target) {
            throw new Error(
                `Target node not found for track: ${data.targetNodeId}`,
            )
        }

        const track = new AnimationTrack(target, data.property)

        for (const keyframeData of data.keyframes) {
            const keyframe = this.deserializeKeyframe(keyframeData)
            track.addKeyframe(keyframe)
        }

        return track
    }

    /**
     * Deserialize a Keyframe from KeyframeData
     */
    deserializeKeyframe(data: KeyframeData): Keyframe {
        let easing: ((t: number) => number) | undefined

        // Resolve easing function by name
        if (data.easingName) {
            const easingFn = (Easing as Record<string, (t: number) => number>)[
                data.easingName
            ]
            if (easingFn) {
                easing = easingFn
            }
        }

        return new Keyframe(data.time, data.value, data.interpolation, easing)
    }

    /**
     * Deserialize a StateMachine from StateMachineData
     */
    deserializeStateMachine(
        data: StateMachineData,
        artboards: Artboard[],
    ): StateMachine {
        const stateMachine = new StateMachine()

        // Build a node map from all artboards for timeline deserialization
        const nodeMap = new Map<string, SceneNode>()
        for (const artboard of artboards) {
            this._buildNodeMap(artboard, nodeMap)
        }

        // Deserialize states
        for (const stateData of data.states) {
            const state = this.deserializeAnimationState(stateData, nodeMap)
            stateMachine.addState(state)
        }

        // Deserialize transitions
        for (const transitionData of data.transitions) {
            const transition = this.deserializeStateTransition(transitionData)
            stateMachine.addTransition(transition)
        }

        // Set initial state if specified
        if (data.initialStateId) {
            stateMachine.changeState(data.initialStateId)
        }

        return stateMachine
    }

    /**
     * Deserialize an AnimationState from AnimationStateData
     */
    deserializeAnimationState(
        data: AnimationStateData,
        nodeMap: Map<string, SceneNode>,
    ): AnimationState {
        const timeline = this.deserializeTimeline(data.timeline, nodeMap)
        return new AnimationState(
            data.id,
            data.name,
            timeline,
            data.speed,
            data.loop,
        )
    }

    /**
     * Deserialize a StateTransition from StateTransitionData
     */
    deserializeStateTransition(data: StateTransitionData): StateTransition {
        const conditions = data.conditions.map((condData) =>
            this.deserializeTransitionCondition(condData),
        )

        return new StateTransition(
            data.from,
            data.to,
            conditions,
            data.duration,
            data.priority,
        )
    }

    /**
     * Deserialize a TransitionCondition from TransitionConditionData
     */
    deserializeTransitionCondition(
        data: TransitionConditionData,
    ): TransitionCondition {
        switch (data.type) {
            case "event":
                if (!data.eventName) {
                    throw new Error("Event condition missing eventName")
                }
                return new EventCondition(data.eventName)

            case "boolean":
                if (!data.inputName || data.expectedValue === undefined) {
                    throw new Error(
                        "Boolean condition missing inputName or expectedValue",
                    )
                }
                return new BooleanCondition(data.inputName, data.expectedValue)

            case "number":
                if (
                    !data.inputName ||
                    !data.operator ||
                    data.threshold === undefined
                ) {
                    throw new Error(
                        "Number condition missing inputName, operator, or threshold",
                    )
                }
                return new NumberCondition(
                    data.inputName,
                    data.operator,
                    data.threshold,
                )

            case "time":
                if (data.duration === undefined) {
                    throw new Error("Time condition missing duration")
                }
                return new TimeCondition(data.duration)

            default:
                throw new Error(`Unknown condition type: ${data.type}`)
        }
    }

    /**
     * Deserialize a Color from ColorData
     */
    deserializeColor(data: ColorData): Color {
        return new Color(data.r, data.g, data.b, data.a)
    }

    /**
     * Deserialize a Vector2 from Vector2Data
     */
    deserializeVector2(data: Vector2Data): Vector2 {
        return new Vector2(data.x, data.y)
    }

    /**
     * Deserialize a Matrix from MatrixData
     */
    deserializeMatrix(data: MatrixData): Matrix {
        return new Matrix(data.a, data.b, data.c, data.d, data.tx, data.ty)
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
     * Deserialize a Paint from PaintData
     */
    deserializePaint(data: PaintData): Paint {
        if (data.type === "solid" && data.color) {
            const color = this.deserializeColor(data.color)
            return Paint.solid(color, data.blendMode)
        }

        if (data.type === "gradient" && data.gradient) {
            return this._deserializeGradientPaint(data.gradient, data.blendMode)
        }

        throw new Error(`Invalid paint data: ${data.type}`)
    }

    /**
     * Deserialize a gradient paint
     */
    private _deserializeGradientPaint(
        data: GradientData,
        blendMode: BlendMode,
    ): Paint {
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

    /**
     * Build a node map from a scene graph
     */
    private _buildNodeMap(
        node: SceneNode,
        nodeMap: Map<string, SceneNode>,
    ): void {
        // Generate an ID for this node if we're rebuilding the map
        // In a real implementation, nodes would have persistent IDs
        const id = `node_${nodeMap.size}`
        nodeMap.set(id, node)

        for (const child of node.children) {
            this._buildNodeMap(child, nodeMap)
        }
    }
}
