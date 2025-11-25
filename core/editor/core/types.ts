/**
 * Core editor interfaces and types
 * Based on the animation-editor design document
 */

import type { SceneNode } from "../../scene/node"
import type { Artboard } from "../../scene/nodes/artboard"
import type { Timeline } from "../../animation/timeline"
import type { StateMachine } from "../../animation/statemachine"
import type { AssetData, FileMetadata } from "../../serialization/types"

// ============================================================================
// Editor Document Types
// ============================================================================

/**
 * Represents a complete editor document containing all animation data
 */
export interface EditorDocument {
    /** The root artboard containing the scene */
    artboard: Artboard
    /** The main timeline for the animation */
    timeline: Timeline
    /** State machines for interactive animations */
    stateMachines: StateMachine[]
    /** Imported assets (images, fonts, etc.) */
    assets: AssetData[]
    /** File metadata (name, author, dates) */
    metadata: FileMetadata
}

// ============================================================================
// Viewport Types
// ============================================================================

/**
 * State of the canvas viewport (zoom, pan, display options)
 */
export interface ViewportState {
    /** Current zoom level (1.0 = 100%) */
    zoom: number
    /** Horizontal pan offset in screen pixels */
    panX: number
    /** Vertical pan offset in screen pixels */
    panY: number
    /** Whether to show the grid overlay */
    showGrid: boolean
    /** Whether to show guide lines */
    showGuides: boolean
    /** Whether snapping is enabled */
    snapEnabled: boolean
}

// ============================================================================
// Selection Types
// ============================================================================

/**
 * Represents a selected keyframe on the timeline
 */
export interface KeyframeSelection {
    /** ID of the animation track */
    trackId: string
    /** ID of the node being animated */
    nodeId: string
    /** Property being animated (e.g., "transform.position.x") */
    property: string
    /** Time position of the keyframe in seconds */
    time: number
}

/**
 * Represents a range of keyframes for batch operations
 */
export interface KeyframeRange {
    /** Start time of the range in seconds */
    startTime: number
    /** End time of the range in seconds */
    endTime: number
    /** Track IDs included in the range */
    tracks: string[]
}

// ============================================================================
// Tool Types
// ============================================================================

/**
 * Available tool types in the editor
 */
export type ToolType =
    | "selection"
    | "rectangle"
    | "ellipse"
    | "pen"
    | "hand"
    | "zoom"

// ============================================================================
// Panel Types
// ============================================================================

/**
 * Position of a panel in the editor layout
 */
export type PanelPosition = "left" | "right" | "bottom" | "floating"

/**
 * State of an individual panel
 */
export interface PanelState {
    /** Whether the panel is visible */
    visible: boolean
    /** Current position of the panel */
    position: PanelPosition
    /** Current size of the panel */
    size: { width: number; height: number }
    /** Position when floating (optional) */
    floatingPosition?: { x: number; y: number }
}

/**
 * Layout configuration for all panels
 */
export interface PanelLayout {
    /** State of each panel by ID */
    panels: Map<string, PanelState>
    /** Width of the left panel area */
    leftWidth: number
    /** Width of the right panel area */
    rightWidth: number
    /** Height of the bottom panel area */
    bottomHeight: number
}

// ============================================================================
// Preferences Types
// ============================================================================

/**
 * User preferences for the editor
 */
export interface EditorPreferences {
    // Grid settings
    /** Whether to show the grid */
    showGrid: boolean
    /** Grid cell size in pixels */
    gridSize: number
    /** Grid line color (CSS color string) */
    gridColor: string

    // Snapping settings
    /** Whether snapping is enabled */
    snapEnabled: boolean
    /** Snap threshold in pixels */
    snapThreshold: number
    /** Whether to snap to grid */
    snapToGrid: boolean
    /** Whether to snap to other objects */
    snapToObjects: boolean
    /** Whether to snap to artboard edges/center */
    snapToArtboard: boolean

    // Appearance settings
    /** Editor theme */
    theme: "light" | "dark"
    /** Canvas background color (CSS color string) */
    canvasBackground: string
    /** Selection indicator color (CSS color string) */
    selectionColor: string

    // Behavior settings
    /** Whether to auto-create keyframes on property change */
    autoKeyframe: boolean
    /** Whether to confirm before deleting objects */
    confirmDelete: boolean

    // Custom shortcuts
    /** User-customized keyboard shortcuts */
    customShortcuts: Record<string, ShortcutConfig>
}

/**
 * Configuration for a keyboard shortcut
 */
export interface ShortcutConfig {
    /** The key code (e.g., "KeyZ", "Delete") */
    key: string
    /** Modifier keys */
    modifiers: ShortcutModifiers
    /** Action identifier */
    action: string
    /** Human-readable description */
    description: string
}

/**
 * Modifier keys for shortcuts
 */
export interface ShortcutModifiers {
    /** Ctrl key (Cmd on Mac) */
    ctrl?: boolean
    /** Shift key */
    shift?: boolean
    /** Alt key (Option on Mac) */
    alt?: boolean
    /** Meta key (Windows key / Cmd on Mac) */
    meta?: boolean
}

// ============================================================================
// Editor State
// ============================================================================

/**
 * Complete state of the editor
 */
export interface EditorState {
    // Document state
    /** Currently open document (null if no document) */
    document: EditorDocument | null
    /** Whether the document has unsaved changes */
    isDirty: boolean
    /** Path to the current file (null if not saved) */
    filePath: string | null

    // Selection state
    /** Currently selected scene nodes */
    selectedNodes: SceneNode[]
    /** Currently selected keyframes on the timeline */
    selectedKeyframes: KeyframeSelection[]

    // Viewport state
    /** Current viewport configuration */
    viewport: ViewportState

    // Tool state
    /** Currently active tool */
    activeTool: ToolType
    /** Options for the current tool */
    toolOptions: Record<string, unknown>

    // Playback state
    /** Whether animation is currently playing */
    isPlaying: boolean
    /** Current playback time in seconds */
    currentTime: number
    /** Whether to loop playback */
    loopEnabled: boolean

    // UI state
    /** Panel layout configuration */
    panels: PanelLayout
    /** User preferences */
    preferences: EditorPreferences
}

// ============================================================================
// Editor Events
// ============================================================================

/**
 * Types of events emitted by the editor
 */
export type EditorEventType =
    | "stateChange"
    | "selectionChange"
    | "documentChange"
    | "toolChange"
    | "playbackChange"
    | "viewportChange"
    | "keyframeChange"
    | "preferencesChange"

/**
 * Base event data for all editor events
 */
export interface EditorEventData {
    /** Type of the event */
    type: EditorEventType
    /** Timestamp of the event */
    timestamp: number
}

/**
 * Event data for state changes
 */
export interface StateChangeEvent extends EditorEventData {
    type: "stateChange"
    /** Previous state (partial) */
    previousState: Partial<EditorState>
    /** New state (partial) */
    newState: Partial<EditorState>
}

/**
 * Event data for selection changes
 */
export interface SelectionChangeEvent extends EditorEventData {
    type: "selectionChange"
    /** Previously selected nodes */
    previousSelection: SceneNode[]
    /** Newly selected nodes */
    newSelection: SceneNode[]
}

/**
 * Event data for document changes
 */
export interface DocumentChangeEvent extends EditorEventData {
    type: "documentChange"
    /** Type of document change */
    changeType: "new" | "open" | "save" | "close" | "modify"
}

/**
 * Event data for tool changes
 */
export interface ToolChangeEvent extends EditorEventData {
    type: "toolChange"
    /** Previous tool */
    previousTool: ToolType
    /** New tool */
    newTool: ToolType
}

/**
 * Event data for playback changes
 */
export interface PlaybackChangeEvent extends EditorEventData {
    type: "playbackChange"
    /** Whether playback is active */
    isPlaying: boolean
    /** Current time in seconds */
    currentTime: number
}

/**
 * Event data for viewport changes
 */
export interface ViewportChangeEvent extends EditorEventData {
    type: "viewportChange"
    /** Previous viewport state */
    previousViewport: ViewportState
    /** New viewport state */
    newViewport: ViewportState
}

/**
 * Event data for keyframe changes
 */
export interface KeyframeChangeEvent extends EditorEventData {
    type: "keyframeChange"
    /** Type of keyframe change */
    changeType: "add" | "remove" | "move" | "modify"
    /** Affected keyframes */
    keyframes: KeyframeSelection[]
}

/**
 * Event data for preferences changes
 */
export interface PreferencesChangeEvent extends EditorEventData {
    type: "preferencesChange"
    /** Changed preference keys */
    changedKeys: (keyof EditorPreferences)[]
}

/**
 * Union type of all editor events
 */
export type EditorEvent =
    | StateChangeEvent
    | SelectionChangeEvent
    | DocumentChangeEvent
    | ToolChangeEvent
    | PlaybackChangeEvent
    | ViewportChangeEvent
    | KeyframeChangeEvent
    | PreferencesChangeEvent

/**
 * Callback function for editor events
 */
export type EditorEventCallback<T extends EditorEvent = EditorEvent> = (
    event: T,
) => void

// ============================================================================
// Gizmo Types
// ============================================================================

/**
 * Types of transform gizmo handles
 */
export type GizmoHandleType = "corner" | "edge" | "rotation" | "center"

/**
 * A handle on the transform gizmo
 */
export interface GizmoHandle {
    /** Type of handle */
    type: GizmoHandleType
    /** Position of the handle in world coordinates */
    position: { x: number; y: number }
    /** CSS cursor to show when hovering */
    cursor: string
    /** Index for corner/edge handles (0-3 for corners, 0-3 for edges) */
    index?: number
}

// ============================================================================
// Snap Types
// ============================================================================

/**
 * Result of a snap operation
 */
export interface SnapResult {
    /** The snapped position */
    snappedPosition: { x: number; y: number }
    /** Guide lines to display */
    guides: SnapGuide[]
}

/**
 * A snap guide line to display
 */
export interface SnapGuide {
    /** Orientation of the guide */
    type: "horizontal" | "vertical"
    /** Position of the guide (x for vertical, y for horizontal) */
    position: number
    /** Source node that caused the snap (optional) */
    sourceNode?: SceneNode
}

// ============================================================================
// Clipboard Types
// ============================================================================

/**
 * Data stored in the clipboard for copy/paste operations
 */
export interface ClipboardData {
    /** Serialized node data */
    nodes: import("../../serialization/types").NodeData[]
    /** Keyframe data for each node (keyed by node ID) */
    keyframes: Map<string, import("../../serialization/types").KeyframeData[]>
    /** ID of the source artboard */
    sourceArtboardId: string
}

// ============================================================================
// Canvas Input Types
// ============================================================================

/**
 * Pointer event data for canvas interactions
 */
export interface CanvasPointerEvent {
    /** Position in screen coordinates */
    screenPosition: { x: number; y: number }
    /** Position in world coordinates */
    worldPosition: { x: number; y: number }
    /** Mouse button (0 = left, 1 = middle, 2 = right) */
    button: number
    /** Whether shift key is pressed */
    shiftKey: boolean
    /** Whether ctrl key is pressed */
    ctrlKey: boolean
    /** Whether alt key is pressed */
    altKey: boolean
    /** Whether meta key is pressed */
    metaKey: boolean
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default viewport state
 */
export const DEFAULT_VIEWPORT_STATE: ViewportState = {
    zoom: 1,
    panX: 0,
    panY: 0,
    showGrid: true,
    showGuides: true,
    snapEnabled: true,
}

/**
 * Default editor preferences
 */
export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
    // Grid
    showGrid: true,
    gridSize: 10,
    gridColor: "#e0e0e0",

    // Snapping
    snapEnabled: true,
    snapThreshold: 8,
    snapToGrid: true,
    snapToObjects: true,
    snapToArtboard: true,

    // Appearance
    theme: "dark",
    canvasBackground: "#1e1e1e",
    selectionColor: "#0d99ff",

    // Behavior
    autoKeyframe: true,
    confirmDelete: true,

    // Shortcuts
    customShortcuts: {},
}

/**
 * Create a default panel layout
 */
export function createDefaultPanelLayout(): PanelLayout {
    return {
        panels: new Map([
            [
                "properties",
                {
                    visible: true,
                    position: "right",
                    size: { width: 280, height: 0 },
                },
            ],
            [
                "hierarchy",
                {
                    visible: true,
                    position: "left",
                    size: { width: 240, height: 0 },
                },
            ],
            [
                "timeline",
                {
                    visible: true,
                    position: "bottom",
                    size: { width: 0, height: 200 },
                },
            ],
            [
                "assets",
                {
                    visible: true,
                    position: "left",
                    size: { width: 240, height: 0 },
                },
            ],
        ]),
        leftWidth: 240,
        rightWidth: 280,
        bottomHeight: 200,
    }
}

/**
 * Create a default editor state
 */
export function createDefaultEditorState(): EditorState {
    return {
        // Document
        document: null,
        isDirty: false,
        filePath: null,

        // Selection
        selectedNodes: [],
        selectedKeyframes: [],

        // Viewport
        viewport: { ...DEFAULT_VIEWPORT_STATE },

        // Tool
        activeTool: "selection",
        toolOptions: {},

        // Playback
        isPlaying: false,
        currentTime: 0,
        loopEnabled: true,

        // UI
        panels: createDefaultPanelLayout(),
        preferences: { ...DEFAULT_EDITOR_PREFERENCES },
    }
}
