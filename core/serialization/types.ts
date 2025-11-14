import type { BlendMode } from "../math/paint"
import type { PathCommand } from "../math/path"
import type { InterpolationType } from "../animation/keyframe"

import type {
    NumberComparisonOperator,
    TransitionConditionType,
} from "../animation/statetransition"

/**
 * Serializable color data (RGBA components 0-1)
 */
export interface ColorData {
    r: number
    g: number
    b: number
    a: number
}

/**
 * Serializable 2D vector data
 */
export interface Vector2Data {
    x: number
    y: number
}

/**
 * Serializable transformation matrix data (2D affine transform)
 */
export interface MatrixData {
    a: number
    b: number
    c: number
    d: number
    tx: number
    ty: number
}

/**
 * Serializable transform data (position, rotation, scale, pivot)
 */
export interface TransformData {
    position: Vector2Data
    rotation: number
    scale: Vector2Data
    pivot: Vector2Data
}

/**
 * Serializable gradient stop data
 */
export interface GradientStopData {
    offset: number
    color: ColorData
}

/**
 * Serializable linear gradient data
 */
export interface LinearGradientData {
    type: "linear"
    start: Vector2Data
    end: Vector2Data
    stops: GradientStopData[]
}

/**
 * Serializable radial gradient data
 */
export interface RadialGradientData {
    type: "radial"
    center: Vector2Data
    radius: number
    focal?: Vector2Data
    stops: GradientStopData[]
}

/**
 * Serializable gradient data (union type)
 */
export type GradientData = LinearGradientData | RadialGradientData

/**
 * Serializable paint data
 */
export interface PaintData {
    type: "solid" | "gradient"
    color?: ColorData
    gradient?: GradientData
    blendMode: BlendMode
}

/**
 * Serializable shape data
 */
export interface ShapeData {
    path: PathCommand[]
    fill?: PaintData
    stroke?: PaintData
    strokeWidth: number
}

/**
 * Serializable image data
 */
export interface ImageData {
    assetId: string
    sourceRect?: {
        x: number
        y: number
        width: number
        height: number
    }
}

/**
 * Serializable text data
 */
export interface TextData {
    content: string
    fontAssetId?: string
    fontSize: number
    color: ColorData
}

/**
 * Node type discriminator
 */
export type NodeType = "artboard" | "group" | "shape" | "image" | "text"

/**
 * Serializable scene node data
 */
export interface NodeData {
    id: string
    type: NodeType
    name: string
    transform: TransformData
    visible: boolean
    opacity: number
    shape?: ShapeData
    image?: ImageData
    text?: TextData
    children?: NodeData[]
}

/**
 * Serializable keyframe data
 */
export interface KeyframeData {
    time: number
    value: unknown
    interpolation: InterpolationType
    easingName?: string
}

/**
 * Serializable animation track data
 */
export interface AnimationTrackData {
    targetNodeId: string
    property: string
    keyframes: KeyframeData[]
}

/**
 * Serializable timeline data
 */
export interface TimelineData {
    duration: number
    fps: number
    tracks: AnimationTrackData[]
}

/**
 * Serializable transition condition data
 */
export interface TransitionConditionData {
    type: TransitionConditionType
    eventName?: string
    inputName?: string
    expectedValue?: boolean
    operator?: NumberComparisonOperator
    threshold?: number
    duration?: number
}

/**
 * Serializable state transition data
 */
export interface StateTransitionData {
    from: string
    to: string
    conditions: TransitionConditionData[]
    duration: number
    priority: number
}

/**
 * Serializable animation state data
 */
export interface AnimationStateData {
    id: string
    name: string
    timeline: TimelineData
    speed: number
    loop: boolean
}

/**
 * Serializable state machine data
 */
export interface StateMachineData {
    id: string
    name: string
    states: AnimationStateData[]
    transitions: StateTransitionData[]
    initialStateId?: string
}

/**
 * Serializable artboard data
 */
export interface ArtboardData {
    id: string
    name: string
    width: number
    height: number
    backgroundColor: ColorData
    nodes: NodeData[]
    timeline: TimelineData
}

/**
 * Asset type discriminator
 */
export type AssetType = "image" | "font" | "audio"

/**
 * Serializable asset data
 */
export interface AssetData {
    id: string
    type: AssetType
    name: string
    url: string
    metadata?: Record<string, unknown>
}

/**
 * File metadata
 */
export interface FileMetadata {
    name: string
    author?: string
    created: string
    modified: string
    description?: string
}

/**
 * Root samcan file format
 */
export interface SamcanFile {
    version: string
    metadata: FileMetadata
    artboards: ArtboardData[]
    assets: AssetData[]
    stateMachines?: StateMachineData[]
}
