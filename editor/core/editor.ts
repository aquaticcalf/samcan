/**
 * Main Editor class - the central coordinator for all editor functionality
 */

import type { EditorConfig, EditorState, EditorEvents } from "../types"
import { Vector2 } from "../../core/math"
import { EventEmitter } from "../events"
import { Viewport } from "./viewport"

export class Editor {
    private _canvas: HTMLCanvasElement
    private _viewport: Viewport
    private _eventEmitter: EventEmitter<EditorEvents>
    private _state: EditorState

    constructor(config: EditorConfig) {
        this._canvas = config.canvas
        this._eventEmitter = new EventEmitter()

        // Initialize viewport
        this._viewport = new Viewport({
            canvas: this._canvas,
            zoom: config.initialZoom ?? 1.0,
            pan: Vector2.zero(),
        })

        // Initialize editor state
        this._state = {
            selectedNodes: [],
            activeTool: "select",
            zoom: config.initialZoom ?? 1.0,
            pan: Vector2.zero(),
            showGrid: config.showGrid ?? true,
            showRulers: config.showRulers ?? true,
            currentTime: 0,
            isPlaying: false,
        }
    }

    /**
     * Get current editor state
     */
    get state(): Readonly<EditorState> {
        return this._state
    }

    /**
     * Get viewport instance
     */
    get viewport(): Viewport {
        return this._viewport
    }

    /**
     * Get canvas element
     */
    get canvas(): HTMLCanvasElement {
        return this._canvas
    }

    /**
     * Subscribe to editor events
     */
    on<K extends keyof EditorEvents>(
        event: K,
        handler: (data: EditorEvents[K]) => void,
    ): () => void {
        return this._eventEmitter.on(event, handler)
    }

    /**
     * Emit an editor event
     */
    protected emit<K extends keyof EditorEvents>(
        event: K,
        data: EditorEvents[K],
    ): void {
        this._eventEmitter.emit(event, data)
    }

    /**
     * Update editor state and emit change event
     */
    protected updateState(partial: Partial<EditorState>): void {
        this._state = { ...this._state, ...partial }
        this.emit("state:change", { state: this._state })
    }

    /**
     * Destroy editor and cleanup resources
     */
    destroy(): void {
        this._eventEmitter.removeAllListeners()
    }
}
