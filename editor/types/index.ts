/**
 * Core type definitions and interfaces for the samcan Editor
 */

import type { SceneNode } from "../../core/scene"
import type { Vector2 } from "../../core/math"

/**
 * Editor state represents the current state of the editor
 */
export interface EditorState {
    /** Currently selected nodes */
    selectedNodes: readonly SceneNode[]
    /** Active tool identifier */
    activeTool: string
    /** Current zoom level (1.0 = 100%) */
    zoom: number
    /** Pan offset in canvas space */
    pan: Vector2
    /** Whether grid is visible */
    showGrid: boolean
    /** Whether rulers are visible */
    showRulers: boolean
    /** Current playback time in milliseconds */
    currentTime: number
    /** Whether animation is playing */
    isPlaying: boolean
}

/**
 * Editor configuration options
 */
export interface EditorConfig {
    /** Canvas element to render into */
    canvas: HTMLCanvasElement
    /** Initial zoom level (default: 1.0) */
    initialZoom?: number
    /** Enable grid by default (default: true) */
    showGrid?: boolean
    /** Enable rulers by default (default: true) */
    showRulers?: boolean
    /** Grid size in pixels (default: 10) */
    gridSize?: number
    /** Enable snapping (default: true) */
    enableSnapping?: boolean
}

/**
 * Event types emitted by the editor
 */
export interface EditorEvents {
    /** Fired when selection changes */
    "selection:change": { nodes: readonly SceneNode[] }
    /** Fired when active tool changes */
    "tool:change": { toolId: string }
    /** Fired when viewport changes (zoom/pan) */
    "viewport:change": { zoom: number; pan: Vector2 }
    /** Fired when timeline position changes */
    "timeline:change": { time: number }
    /** Fired when playback state changes */
    "playback:change": { isPlaying: boolean }
    /** Fired when history state changes */
    "history:change": { canUndo: boolean; canRedo: boolean }
    /** Fired when editor state changes */
    "state:change": { state: EditorState }
}

/**
 * Tool interface for editor tools
 */
export interface Tool {
    /** Unique tool identifier */
    readonly id: string
    /** Display name */
    readonly name: string
    /** Tool cursor style */
    readonly cursor: string

    /** Called when tool is activated */
    onActivate(): void
    /** Called when tool is deactivated */
    onDeactivate(): void

    /** Handle mouse down event */
    onMouseDown(event: MouseEvent, canvasPos: Vector2): void
    /** Handle mouse move event */
    onMouseMove(event: MouseEvent, canvasPos: Vector2): void
    /** Handle mouse up event */
    onMouseUp(event: MouseEvent, canvasPos: Vector2): void
    /** Handle key down event */
    onKeyDown(event: KeyboardEvent): void
    /** Handle key up event */
    onKeyUp(event: KeyboardEvent): void
}

/**
 * Command interface for undoable operations
 */
export interface EditorCommand {
    /** Execute the command */
    execute(): void
    /** Undo the command */
    undo(): void
    /** Optional: merge with another command of the same type */
    merge?(other: EditorCommand): boolean
}

/**
 * Plugin interface for extending editor functionality
 */
export interface EditorPlugin {
    /** Unique plugin identifier */
    readonly id: string
    /** Plugin name */
    readonly name: string
    /** Plugin version */
    readonly version: string

    /** Initialize plugin with editor instance */
    initialize(editor: unknown): void
    /** Cleanup plugin resources */
    destroy(): void
}

/**
 * Viewport configuration
 */
export interface ViewportConfig {
    /** Zoom level (1.0 = 100%) */
    zoom: number
    /** Pan offset in canvas space */
    pan: Vector2
    /** Canvas dimensions */
    canvasSize: { width: number; height: number }
}

/**
 * Grid configuration
 */
export interface GridConfig {
    /** Grid size in pixels */
    size: number
    /** Grid color */
    color: string
    /** Grid opacity (0-1) */
    opacity: number
    /** Enable snapping to grid */
    snap: boolean
}

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
    /** Key combination (e.g., "Ctrl+Z", "Delete") */
    key: string
    /** Command to execute */
    command: string
    /** Optional: only active when specific tool is active */
    toolId?: string
}
