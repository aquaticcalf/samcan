import { Timeline } from "../../animation/timeline"
import { Path } from "../../math/path"
import { Rectangle } from "../../math/rectangle"
import type { SceneNode } from "../../scene/node"
import { Artboard } from "../../scene/nodes/artboard"
import { GroupNode } from "../../scene/nodes/groupnode"
import { ImageNode } from "../../scene/nodes/imagenode"
import { ShapeNode } from "../../scene/nodes/shapenode"
import type { Transform } from "../../scene/transform"
import type {
    ArtboardData,
    ImageData,
    NodeData,
    NodeType,
    ShapeData,
} from "../types"
import type { AnimationSerializers } from "./animations"
import type { PrimitiveSerializers } from "./primitives"

/**
 * Handles serialization and deserialization of scene nodes
 * (Artboard, GroupNode, ShapeNode, ImageNode)
 */
export class NodeSerializers {
    constructor(
        private _primitives: PrimitiveSerializers,
        private _animations: AnimationSerializers,
    ) {}

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
        this.assignNodeIds(artboard)

        // Share the node ID map with animation serializers
        this._animations.setNodeIdMap(this._nodeIdMap)

        return {
            id: this.getNodeId(artboard),
            name: "Artboard",
            width: artboard.width,
            height: artboard.height,
            backgroundColor: this._primitives.serializeColor(
                artboard.backgroundColor,
            ),
            nodes: this.serializeChildren(artboard),
            timeline: this._animations.serializeTimeline(new Timeline(0, 60)), // Empty timeline for now
        }
    }

    /**
     * Deserialize an Artboard from ArtboardData
     */
    deserializeArtboard(data: ArtboardData): Artboard {
        // Create artboard
        const backgroundColor = this._primitives.deserializeColor(
            data.backgroundColor,
        )
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
            const timeline = this._animations.deserializeTimeline(
                data.timeline,
                nodeMap,
            )
            // Store timeline on artboard (would need to add this property to Artboard class)
            // For now, we'll just create it but not attach it
        }

        return artboard
    }

    /**
     * Serialize a SceneNode to NodeData
     */
    serializeNode(node: SceneNode): NodeData {
        const baseData: NodeData = {
            id: this.getNodeId(node),
            type: this.getNodeType(node),
            name: this.getNodeName(node),
            transform: this._primitives.serializeTransform(node.transform),
            visible: node.visible,
            opacity: node.opacity,
        }

        // Add type-specific data
        if (node instanceof ShapeNode) {
            baseData.shape = this.serializeShapeData(node)
        } else if (node instanceof ImageNode) {
            baseData.image = this.serializeImageData(node)
        }

        // Add children for group nodes and artboards
        if (node instanceof GroupNode || node instanceof Artboard) {
            baseData.children = this.serializeChildren(node)
        }

        return baseData
    }

    /**
     * Deserialize a SceneNode from NodeData
     */
    deserializeNode(
        data: NodeData,
        nodeMap: Map<string, SceneNode>,
    ): SceneNode {
        // Deserialize transform
        const transform = this._primitives.deserializeTransform(data.transform)

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
     * Serialize children nodes
     */
    private serializeChildren(node: SceneNode): NodeData[] {
        return node.children.map((child) => this.serializeNode(child))
    }

    /**
     * Serialize ShapeNode data
     */
    private serializeShapeData(node: ShapeNode): ShapeData {
        return {
            path: node.path.toJSON(),
            fill: node.fill
                ? this._primitives.serializePaint(node.fill)
                : undefined,
            stroke: node.stroke
                ? this._primitives.serializePaint(node.stroke)
                : undefined,
            strokeWidth: node.strokeWidth,
        }
    }

    /**
     * Deserialize a ShapeNode from ShapeData
     */
    private deserializeShapeNode(
        data: ShapeData,
        transform: Transform,
    ): ShapeNode {
        const path = Path.fromJSON(data.path)
        const node = new ShapeNode(path, transform)

        if (data.fill) {
            node.fill = this._primitives.deserializePaint(data.fill)
        }

        if (data.stroke) {
            node.stroke = this._primitives.deserializePaint(data.stroke)
        }

        node.strokeWidth = data.strokeWidth

        return node
    }

    /**
     * Serialize ImageNode data
     */
    private serializeImageData(node: ImageNode): ImageData {
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
     * Deserialize an ImageNode from ImageData
     */
    private deserializeImageNode(
        data: ImageData,
        transform: Transform,
    ): ImageNode {
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
     * Get the node type
     */
    private getNodeType(node: SceneNode): NodeType {
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
    private getNodeName(node: SceneNode): string {
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
     * Assign unique IDs to all nodes in the scene graph
     */
    private assignNodeIds(node: SceneNode): void {
        if (!this._nodeIdMap.has(node)) {
            this._nodeIdMap.set(node, `node_${this._nextNodeId++}`)
        }

        for (const child of node.children) {
            this.assignNodeIds(child)
        }
    }

    /**
     * Get the ID for a node
     */
    private getNodeId(node: SceneNode): string {
        const id = this._nodeIdMap.get(node)
        if (!id) {
            throw new Error("Node ID not found - call assignNodeIds first")
        }
        return id
    }
}
