# Design Document: samcan Animation Editor

## Overview

The samcan Animation Editor is a web-based authoring tool built on top of the samcan core runtime. It provides a professional-grade interface for creating vector-based animations with a focus on usability, performance, and extensibility. The editor follows a Model-View-Controller architecture with reactive state management, enabling real-time collaboration and undo/redo capabilities.

The editor is structured into these primary systems:

1. **Editor Core** - Central state management, command execution, and coordination
2. **Canvas System** - Viewport rendering, interaction handling, and gizmos
3. **Tool System** - Pluggable tools for different interaction modes
4. **Panel System** - Modular UI panels for properties, timeline, hierarchy, etc.
5. **Selection System** - Multi-object selection with transform operations
6. **Clipboard System** - Copy, paste, and duplicate operations

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           UI Layer (React)                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Toolbar  │ │Properties│ │ Timeline │ │Hierarchy │ │  Assets  │       │
│  │  Panel   │ │  Panel   │ │  Panel   │ │  Panel   │ │  Panel   │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
└───────┼────────────┼────────────┼────────────┼────────────┼─────────────┘
        │            │            │            │            │
        └────────────┴────────────┼────────────┴────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────┐
│                         Editor Core                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Editor    │  │  Selection  │  │  Clipboard  │  │   Shortcut  │     │
│  │   State     │  │   Manager   │  │   Manager   │  │   Manager   │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │                │            │
│         └────────────────┼────────────────┼────────────────┘            │
│                          │                │                             │
│  ┌───────────────────────▼────────────────▼─────────────────────────┐   │
│  │                    Command History                                │   │
│  │              (Undo/Redo Stack from Core)                         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────┐
│                         Canvas System                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Viewport   │  │    Tool     │  │   Gizmo     │  │   Snap      │     │
│  │  Manager    │  │   Manager   │  │   Renderer  │  │   Engine    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────┐
│                    samcan Core Runtime                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Renderer │ │  Scene   │ │ Timeline │ │  State   │ │  Asset   │       │
│  │          │ │  Graph   │ │          │ │ Machine  │ │ Manager  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```


## Components and Interfaces

### 1. Editor Core

The central coordinator that manages editor state and orchestrates all subsystems.

#### EditorState

```typescript
interface EditorState {
  // Document state
  document: EditorDocument | null
  isDirty: boolean
  filePath: string | null
  
  // Selection state
  selectedNodes: SceneNode[]
  selectedKeyframes: KeyframeSelection[]
  
  // Viewport state
  viewport: ViewportState
  
  // Tool state
  activeTool: ToolType
  toolOptions: Record<string, unknown>
  
  // Playback state
  isPlaying: boolean
  currentTime: number
  loopEnabled: boolean
  
  // UI state
  panels: PanelLayout
  preferences: EditorPreferences
}

interface EditorDocument {
  artboard: Artboard
  timeline: Timeline
  stateMachines: StateMachine[]
  assets: AssetData[]
  metadata: FileMetadata
}

interface ViewportState {
  zoom: number
  panX: number
  panY: number
  showGrid: boolean
  showGuides: boolean
  snapEnabled: boolean
}
```

#### Editor Class

```typescript
class Editor {
  private _state: EditorState
  private _commandHistory: CommandHistory
  private _selectionManager: SelectionManager
  private _clipboardManager: ClipboardManager
  private _shortcutManager: ShortcutManager
  private _toolManager: ToolManager
  private _runtime: AnimationRuntime
  private _renderer: Renderer
  
  // State access
  get state(): Readonly<EditorState>
  
  // Document operations
  newDocument(width: number, height: number): void
  openDocument(file: SamcanFile): void
  saveDocument(): SamcanFile
  closeDocument(): void
  
  // Command execution (with undo support)
  execute<T>(command: Command<T>, args: T[]): void
  undo(): void
  redo(): void
  
  // Selection
  select(nodes: SceneNode[]): void
  addToSelection(nodes: SceneNode[]): void
  removeFromSelection(nodes: SceneNode[]): void
  clearSelection(): void
  selectAll(): void
  
  // Clipboard
  copy(): void
  cut(): void
  paste(): void
  duplicate(): void
  
  // Playback
  play(): void
  pause(): void
  stop(): void
  seek(time: number): void
  
  // Events
  on(event: EditorEvent, callback: EventCallback): () => void
}

type EditorEvent = 
  | 'stateChange'
  | 'selectionChange'
  | 'documentChange'
  | 'toolChange'
  | 'playbackChange'
```

### 2. Canvas System

Handles viewport rendering, user interaction, and visual feedback.

#### ViewportManager

```typescript
class ViewportManager {
  private _canvas: HTMLCanvasElement
  private _zoom: number = 1
  private _panX: number = 0
  private _panY: number = 0
  
  // Zoom operations
  zoomIn(centerX?: number, centerY?: number): void
  zoomOut(centerX?: number, centerY?: number): void
  zoomTo(level: number, centerX?: number, centerY?: number): void
  zoomToFit(bounds: Rectangle): void
  resetZoom(): void
  
  // Pan operations
  pan(deltaX: number, deltaY: number): void
  panTo(x: number, y: number): void
  centerOn(point: Vector2): void
  
  // Coordinate transforms
  screenToWorld(screenPoint: Vector2): Vector2
  worldToScreen(worldPoint: Vector2): Vector2
  
  // Properties
  get zoom(): number
  get viewportBounds(): Rectangle
  get transform(): Matrix
}
```

#### CanvasRenderer

```typescript
class CanvasRenderer {
  private _renderer: Renderer
  private _viewport: ViewportManager
  private _gizmoRenderer: GizmoRenderer
  
  render(state: EditorState): void
  renderArtboard(artboard: Artboard): void
  renderSelection(nodes: SceneNode[]): void
  renderGizmos(nodes: SceneNode[], tool: Tool): void
  renderGuides(guides: Guide[]): void
  renderGrid(gridSize: number): void
}
```

### 3. Tool System

Pluggable tools for different interaction modes.

#### Tool Interface

```typescript
interface Tool {
  readonly name: string
  readonly icon: string
  readonly shortcut: string
  readonly cursor: string
  
  // Lifecycle
  activate(editor: Editor): void
  deactivate(): void
  
  // Input handling
  onPointerDown(event: CanvasPointerEvent): void
  onPointerMove(event: CanvasPointerEvent): void
  onPointerUp(event: CanvasPointerEvent): void
  onKeyDown(event: KeyboardEvent): void
  onKeyUp(event: KeyboardEvent): void
  
  // Rendering
  renderOverlay?(renderer: Renderer, viewport: ViewportManager): void
}

interface CanvasPointerEvent {
  screenPosition: Vector2
  worldPosition: Vector2
  button: number
  shiftKey: boolean
  ctrlKey: boolean
  altKey: boolean
}
```

#### Built-in Tools

```typescript
class SelectionTool implements Tool {
  // Click to select, drag to move, marquee selection
}

class RectangleTool implements Tool {
  // Drag to create rectangle shapes
}

class EllipseTool implements Tool {
  // Drag to create ellipse shapes
}

class PenTool implements Tool {
  // Click/drag to create path points
}

class HandTool implements Tool {
  // Drag to pan viewport
}

class ZoomTool implements Tool {
  // Click to zoom in/out
}
```

#### ToolManager

```typescript
class ToolManager {
  private _tools: Map<ToolType, Tool>
  private _activeTool: Tool | null
  private _editor: Editor
  
  registerTool(type: ToolType, tool: Tool): void
  setActiveTool(type: ToolType): void
  getActiveTool(): Tool | null
  
  // Input routing
  handlePointerDown(event: CanvasPointerEvent): void
  handlePointerMove(event: CanvasPointerEvent): void
  handlePointerUp(event: CanvasPointerEvent): void
}

type ToolType = 
  | 'selection'
  | 'rectangle'
  | 'ellipse'
  | 'pen'
  | 'hand'
  | 'zoom'
```


### 4. Selection System

Manages object selection and provides transform operations.

#### SelectionManager

```typescript
class SelectionManager {
  private _selectedNodes: Set<SceneNode>
  private _editor: Editor
  
  // Selection operations
  select(nodes: SceneNode[]): void
  addToSelection(nodes: SceneNode[]): void
  removeFromSelection(nodes: SceneNode[]): void
  toggleSelection(node: SceneNode): void
  clear(): void
  selectAll(): void
  
  // Queries
  isSelected(node: SceneNode): boolean
  get selectedNodes(): SceneNode[]
  get selectionBounds(): Rectangle | null
  get selectionCenter(): Vector2 | null
  
  // Hit testing
  hitTest(worldPoint: Vector2): SceneNode | null
  hitTestRect(worldRect: Rectangle): SceneNode[]
  
  // Events
  on(event: 'change', callback: (nodes: SceneNode[]) => void): () => void
}
```

#### TransformGizmo

```typescript
interface GizmoHandle {
  type: 'corner' | 'edge' | 'rotation' | 'center'
  position: Vector2
  cursor: string
}

class TransformGizmo {
  private _selection: SelectionManager
  private _handles: GizmoHandle[]
  
  // Handle detection
  hitTestHandle(worldPoint: Vector2): GizmoHandle | null
  
  // Transform operations
  beginTransform(handle: GizmoHandle, startPoint: Vector2): void
  updateTransform(currentPoint: Vector2, shiftKey: boolean, altKey: boolean): void
  endTransform(): Command | null
  cancelTransform(): void
  
  // Rendering
  render(renderer: Renderer, viewport: ViewportManager): void
}
```

### 5. Snap Engine

Provides snapping functionality for precise alignment.

```typescript
interface SnapResult {
  snappedPosition: Vector2
  guides: SnapGuide[]
}

interface SnapGuide {
  type: 'horizontal' | 'vertical'
  position: number
  sourceNode?: SceneNode
}

class SnapEngine {
  private _enabled: boolean = true
  private _threshold: number = 8 // pixels
  
  // Configuration
  setEnabled(enabled: boolean): void
  setThreshold(pixels: number): void
  
  // Snapping
  snap(
    position: Vector2,
    bounds: Rectangle,
    excludeNodes: SceneNode[],
    artboard: Artboard
  ): SnapResult
  
  // Alignment
  alignLeft(nodes: SceneNode[]): void
  alignCenter(nodes: SceneNode[]): void
  alignRight(nodes: SceneNode[]): void
  alignTop(nodes: SceneNode[]): void
  alignMiddle(nodes: SceneNode[]): void
  alignBottom(nodes: SceneNode[]): void
  
  // Distribution
  distributeHorizontally(nodes: SceneNode[]): void
  distributeVertically(nodes: SceneNode[]): void
}
```

### 6. Clipboard System

Handles copy, paste, and duplicate operations.

```typescript
interface ClipboardData {
  nodes: NodeData[]
  keyframes: Map<string, KeyframeData[]>
  sourceArtboardId: string
}

class ClipboardManager {
  private _data: ClipboardData | null
  private _editor: Editor
  
  // Operations
  copy(nodes: SceneNode[]): void
  cut(nodes: SceneNode[]): void
  paste(targetParent?: SceneNode): SceneNode[]
  duplicate(nodes: SceneNode[]): SceneNode[]
  
  // State
  get hasData(): boolean
  get clipboardData(): ClipboardData | null
}
```

### 7. Shortcut System

Manages keyboard shortcuts with customization support.

```typescript
interface Shortcut {
  key: string
  modifiers: ShortcutModifiers
  action: string
  description: string
}

interface ShortcutModifiers {
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
}

class ShortcutManager {
  private _shortcuts: Map<string, Shortcut>
  private _editor: Editor
  
  // Registration
  register(shortcut: Shortcut): void
  unregister(action: string): void
  
  // Handling
  handleKeyDown(event: KeyboardEvent): boolean
  
  // Customization
  setShortcut(action: string, key: string, modifiers: ShortcutModifiers): void
  resetToDefaults(): void
  
  // Queries
  getShortcut(action: string): Shortcut | null
  getAllShortcuts(): Shortcut[]
}
```

### 8. Panel System

Modular UI panels with layout persistence.

```typescript
interface PanelConfig {
  id: string
  title: string
  icon: string
  defaultPosition: PanelPosition
  defaultSize: { width: number; height: number }
  minSize?: { width: number; height: number }
  resizable: boolean
  closable: boolean
}

type PanelPosition = 'left' | 'right' | 'bottom' | 'floating'

interface PanelLayout {
  panels: Map<string, PanelState>
  leftWidth: number
  rightWidth: number
  bottomHeight: number
}

interface PanelState {
  visible: boolean
  position: PanelPosition
  size: { width: number; height: number }
  floatingPosition?: { x: number; y: number }
}

class PanelManager {
  private _panels: Map<string, PanelConfig>
  private _layout: PanelLayout
  
  registerPanel(config: PanelConfig): void
  showPanel(id: string): void
  hidePanel(id: string): void
  togglePanel(id: string): void
  
  setLayout(layout: PanelLayout): void
  getLayout(): PanelLayout
  resetLayout(): void
  
  // Persistence
  saveLayout(): void
  loadLayout(): void
}
```


## Data Models

### Editor-Specific Commands

Building on the core command system, the editor adds these commands:

```typescript
// Transform commands
class MoveNodesCommand extends BaseCommand<MoveNodesArgs> {
  // Move nodes by delta, supports multi-selection
}

class ScaleNodesCommand extends BaseCommand<ScaleNodesArgs> {
  // Scale nodes from anchor point
}

class RotateNodesCommand extends BaseCommand<RotateNodesArgs> {
  // Rotate nodes around pivot
}

// Hierarchy commands
class GroupNodesCommand extends BaseCommand<GroupNodesArgs> {
  // Create group from selection
}

class UngroupNodesCommand extends BaseCommand<UngroupNodesArgs> {
  // Dissolve group, preserve children
}

class ReparentNodeCommand extends BaseCommand<ReparentNodeArgs> {
  // Move node to new parent
}

class ReorderNodeCommand extends BaseCommand<ReorderNodeArgs> {
  // Change node order within parent
}

// Shape commands
class CreateShapeCommand extends BaseCommand<CreateShapeArgs> {
  // Create rectangle, ellipse, or path
}

class ModifyPathCommand extends BaseCommand<ModifyPathArgs> {
  // Edit path points and handles
}

// Timeline commands
class MoveKeyframesCommand extends BaseCommand<MoveKeyframesArgs> {
  // Move keyframes in time
}

class DeleteKeyframesCommand extends BaseCommand<DeleteKeyframesArgs> {
  // Remove keyframes
}

class SetInterpolationCommand extends BaseCommand<SetInterpolationArgs> {
  // Change keyframe interpolation
}

// Appearance commands
class SetFillCommand extends BaseCommand<SetFillArgs> {
  // Set node fill paint
}

class SetStrokeCommand extends BaseCommand<SetStrokeArgs> {
  // Set node stroke paint and width
}
```

### Keyframe Selection

```typescript
interface KeyframeSelection {
  trackId: string
  nodeId: string
  property: string
  time: number
}

interface KeyframeRange {
  startTime: number
  endTime: number
  tracks: string[]
}
```

### Editor Preferences

```typescript
interface EditorPreferences {
  // Grid
  showGrid: boolean
  gridSize: number
  gridColor: string
  
  // Snapping
  snapEnabled: boolean
  snapThreshold: number
  snapToGrid: boolean
  snapToObjects: boolean
  snapToArtboard: boolean
  
  // Appearance
  theme: 'light' | 'dark'
  canvasBackground: string
  selectionColor: string
  
  // Behavior
  autoKeyframe: boolean
  confirmDelete: boolean
  
  // Shortcuts
  customShortcuts: Record<string, Shortcut>
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following correctness properties have been identified:

### Property 1: Zoom preserves cursor position
*For any* viewport state, cursor position, and zoom delta, zooming should keep the world point under the cursor at the same screen position.
**Validates: Requirements 1.2**

### Property 2: Pan offset consistency
*For any* viewport state and pan delta, the viewport offset should change by exactly the pan delta.
**Validates: Requirements 1.3**

### Property 3: Click selection exclusivity
*For any* scene with objects and a click on an object, the selection should contain only that clicked object.
**Validates: Requirements 2.1**

### Property 4: Shift-click toggles selection
*For any* selection state and shift-click on an object, the object should be added if not selected, or removed if already selected.
**Validates: Requirements 2.2**

### Property 5: Marquee selection completeness
*For any* set of objects and marquee rectangle, all objects whose bounds intersect the rectangle should be selected, and no others.
**Validates: Requirements 2.3**

### Property 6: Proportional scale from corner
*For any* object and corner drag, the resulting scale should be proportional (same factor for width and height) and anchored at the opposite corner.
**Validates: Requirements 3.2**

### Property 7: Axis-constrained scale from edge
*For any* object and edge drag, only the axis perpendicular to that edge should change.
**Validates: Requirements 3.3**

### Property 8: Rotation around pivot
*For any* object and rotation drag, the object should rotate around its pivot point, preserving the pivot's world position.
**Validates: Requirements 3.4**

### Property 9: Translation follows cursor
*For any* object and drag delta, the object's position should change by exactly that delta.
**Validates: Requirements 3.5**

### Property 10: Property modification reflects immediately
*For any* property change through the properties panel, the object's property should equal the new value.
**Validates: Requirements 4.2**

### Property 11: Reparenting preserves node
*For any* node and valid target parent, reparenting should result in the node being a child of the target.
**Validates: Requirements 5.2**

### Property 12: Visibility toggle inverts state
*For any* node, toggling visibility should invert its visible property.
**Validates: Requirements 5.3**

### Property 13: Playhead click positioning
*For any* click position on the timeline ruler, the playhead time should correspond to that position.
**Validates: Requirements 6.2**

### Property 14: Scrubbing updates canvas
*For any* playhead time, the canvas should display the animation state at that exact time.
**Validates: Requirements 6.3**

### Property 15: Keyframe time modification
*For any* keyframe and new time position, dragging the keyframe should update its time to the new position.
**Validates: Requirements 6.5**

### Property 16: Keyframe button creates keyframes
*For any* selected object and current time, pressing the keyframe button should create keyframes for all animatable properties at that time.
**Validates: Requirements 7.1**

### Property 17: Auto-keyframe on property change
*For any* property modification at a time without an existing keyframe, a new keyframe should be created automatically.
**Validates: Requirements 7.2**

### Property 18: Keyframe deletion
*For any* selected keyframe, pressing delete should remove that keyframe from its track.
**Validates: Requirements 7.3**

### Property 19: Batch keyframe operations
*For any* set of selected keyframes and batch operation, the operation should apply to all selected keyframes.
**Validates: Requirements 7.5**

### Property 20: Rectangle creation bounds
*For any* drag start and end points with the rectangle tool, the created rectangle should have bounds matching those points.
**Validates: Requirements 8.1**

### Property 21: Ellipse creation bounds
*For any* drag start and end points with the ellipse tool, the created ellipse should have bounds matching those points.
**Validates: Requirements 8.2**

### Property 22: Shift constrains to square
*For any* shape creation drag with shift held, the resulting shape should have equal width and height.
**Validates: Requirements 8.3**

### Property 23: Alt centers on start point
*For any* shape creation drag with alt held, the shape's center should be at the drag start point.
**Validates: Requirements 8.4**

### Property 24: Pen tool corner point
*For any* click with the pen tool, a corner point should be added to the path at that position.
**Validates: Requirements 9.1**

### Property 25: Pen tool curve point
*For any* click-drag with the pen tool, a curve point with control handles should be added.
**Validates: Requirements 9.2**

### Property 26: Stroke width modification
*For any* stroke width change, the object's stroke width should equal the new value.
**Validates: Requirements 10.4**

### Property 27: Undo/Redo round-trip
*For any* undoable action, executing then undoing should restore the previous state, and redoing should restore the action's result.
**Validates: Requirements 11.1, 11.2**

### Property 28: History size limit
*For any* sequence of actions, the undo history should maintain at least 100 entries (or all entries if fewer than 100 actions performed).
**Validates: Requirements 11.3**

### Property 29: Redo cleared on new action
*For any* undo followed by a new action, the redo stack should be empty.
**Validates: Requirements 11.5**

### Property 30: Save/Load round-trip
*For any* editor document, saving then loading should produce an equivalent document.
**Validates: Requirements 12.1, 12.2**

### Property 31: Dirty flag on modification
*For any* document modification, the isDirty flag should be set to true.
**Validates: Requirements 12.4**

### Property 32: Play sets playing state
*For any* editor state, clicking play should set isPlaying to true.
**Validates: Requirements 13.1**

### Property 33: Pause preserves time
*For any* playing state, clicking pause should set isPlaying to false while preserving currentTime.
**Validates: Requirements 13.2**

### Property 34: Stop resets to zero
*For any* editor state, clicking stop should set isPlaying to false and currentTime to 0.
**Validates: Requirements 13.3**

### Property 35: Loop behavior at end
*For any* animation reaching its end, playback should stop if loop is disabled, or restart from 0 if loop is enabled.
**Validates: Requirements 13.5**

### Property 36: Delete removes selected
*For any* selection, pressing delete should remove all selected nodes from the scene.
**Validates: Requirements 14.3**

### Property 37: Arrow key nudge
*For any* selected objects and arrow key press, positions should change by exactly 1 pixel in the arrow direction.
**Validates: Requirements 14.4**

### Property 38: Edge snapping
*For any* object dragged within snap threshold of another object's edge, the position should snap to that edge.
**Validates: Requirements 15.1**

### Property 39: Center snapping
*For any* object dragged within snap threshold of the artboard center, the position should snap to center.
**Validates: Requirements 15.2**

### Property 40: Alignment commands
*For any* selection and alignment command, all selected objects should align to the specified edge or center.
**Validates: Requirements 15.3**

### Property 41: Distribution commands
*For any* selection of 3+ objects and distribution command, objects should be evenly spaced.
**Validates: Requirements 15.4**

### Property 42: Ctrl disables snapping
*For any* drag with Ctrl held, snapping should not occur regardless of snap settings.
**Validates: Requirements 15.5**

### Property 43: Copy/Paste round-trip
*For any* selection, copying then pasting should create duplicates with equivalent properties.
**Validates: Requirements 16.1, 16.2**

### Property 44: Duplicate preserves clipboard
*For any* selection and clipboard state, duplicate should create copies without modifying the clipboard.
**Validates: Requirements 16.3**

### Property 45: Paste includes animation
*For any* copied objects with keyframes, pasting should include the animation data.
**Validates: Requirements 16.5**

### Property 46: Group creates container
*For any* selection of 2+ objects, grouping should create a group node containing all selected objects.
**Validates: Requirements 17.1**

### Property 47: Ungroup flattens hierarchy
*For any* group, ungrouping should move children to the group's parent and remove the group.
**Validates: Requirements 17.2**

### Property 48: Group/Ungroup preserves world transforms
*For any* objects, grouping then ungrouping should preserve their world transforms.
**Validates: Requirements 17.4**

### Property 49: State creation with timeline
*For any* new state machine state, it should have an associated timeline.
**Validates: Requirements 18.2**

### Property 50: Asset import creates asset
*For any* dropped image file, an asset should be created in the asset manager.
**Validates: Requirements 19.2**

### Property 51: Asset drop creates node
*For any* asset dropped on canvas, an image node should be created using that asset.
**Validates: Requirements 19.3**

### Property 52: Unused asset detection
*For any* asset with no node references, it should be marked as unused.
**Validates: Requirements 19.5**

### Property 53: Workspace state persistence round-trip
*For any* workspace state (panel layout, preferences), saving then loading should restore the same state.
**Validates: Requirements 20.1, 20.2, 20.3, 20.4**


## Error Handling

### Error Types

```typescript
class EditorError extends Error {
  constructor(message: string, public code: EditorErrorCode) {
    super(message)
  }
}

enum EditorErrorCode {
  // Document errors
  DOCUMENT_NOT_LOADED = 'DOCUMENT_NOT_LOADED',
  INVALID_DOCUMENT = 'INVALID_DOCUMENT',
  UNSAVED_CHANGES = 'UNSAVED_CHANGES',
  
  // Selection errors
  INVALID_SELECTION = 'INVALID_SELECTION',
  NO_SELECTION = 'NO_SELECTION',
  
  // Command errors
  COMMAND_FAILED = 'COMMAND_FAILED',
  NOTHING_TO_UNDO = 'NOTHING_TO_UNDO',
  NOTHING_TO_REDO = 'NOTHING_TO_REDO',
  
  // Asset errors
  ASSET_NOT_FOUND = 'ASSET_NOT_FOUND',
  ASSET_LOAD_FAILED = 'ASSET_LOAD_FAILED',
  INVALID_ASSET_TYPE = 'INVALID_ASSET_TYPE',
  
  // Tool errors
  INVALID_TOOL = 'INVALID_TOOL',
  TOOL_OPERATION_FAILED = 'TOOL_OPERATION_FAILED',
}
```

### Error Recovery Strategies

1. **Command Failures**: If a command fails during execution, automatically undo any partial changes
2. **Asset Loading**: Display placeholder for failed assets, allow retry or replacement
3. **File Operations**: Auto-save drafts to prevent data loss, offer recovery on crash
4. **Tool Operations**: Cancel current operation and return to selection tool on error

## Testing Strategy

### Unit Testing

Unit tests verify individual components in isolation:

- **ViewportManager**: Test zoom/pan calculations, coordinate transforms
- **SelectionManager**: Test selection operations, hit testing
- **SnapEngine**: Test snap calculations, alignment, distribution
- **ClipboardManager**: Test copy/paste serialization
- **ShortcutManager**: Test shortcut matching and execution
- **Commands**: Test each command's execute/undo behavior

### Property-Based Testing

The editor will use **fast-check** as the property-based testing library for TypeScript.

Property-based tests verify universal properties across random inputs:

- Each correctness property from the design document will be implemented as a property-based test
- Tests will run a minimum of 100 iterations to ensure coverage
- Each test will be tagged with the format: `**Feature: animation-editor, Property {number}: {property_text}**`

Key property test categories:

1. **Transform Properties**: Verify zoom, pan, scale, rotate, translate operations
2. **Selection Properties**: Verify selection state consistency
3. **Command Properties**: Verify undo/redo round-trips
4. **Serialization Properties**: Verify save/load round-trips
5. **Hierarchy Properties**: Verify group/ungroup preserves transforms

### Integration Testing

Integration tests verify component interactions:

- **Tool → Selection → Canvas**: Test tool interactions update selection and render correctly
- **Properties Panel → Commands → Scene**: Test property edits create commands and update scene
- **Timeline → Playback → Canvas**: Test timeline scrubbing updates canvas correctly
- **File Operations → Document State**: Test save/load preserves all document data

### Visual Regression Testing

- Capture canvas snapshots for key states (selection, gizmos, guides)
- Compare against reference images to detect rendering regressions
- Test across different viewport zoom levels and pan positions

## Performance Considerations

### Rendering Optimization

1. **Dirty Region Tracking**: Only re-render changed areas
2. **Gizmo Layer Separation**: Render gizmos on separate canvas to avoid full scene redraws
3. **Throttled Updates**: Debounce rapid property changes during drag operations
4. **Virtual Scrolling**: Use virtual lists for hierarchy and timeline panels with many items

### Memory Management

1. **Command History Pruning**: Limit undo history to prevent memory growth
2. **Asset Caching**: Cache loaded assets with LRU eviction
3. **Clipboard Size Limits**: Warn when copying large selections

### Responsiveness

1. **Async Operations**: Use web workers for heavy computations (path boolean operations)
2. **Progressive Loading**: Load large documents incrementally
3. **Input Prioritization**: Prioritize user input handling over background tasks

## UI Framework

The editor UI will be built with React, using:

- **State Management**: Zustand for editor state with React integration
- **Component Library**: Custom components with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS for consistent styling
- **Canvas**: Direct canvas rendering with React wrapper for lifecycle management

### Panel Components

```typescript
// Properties Panel
interface PropertiesPanelProps {
  selection: SceneNode[]
  onPropertyChange: (property: string, value: unknown) => void
}

// Timeline Panel
interface TimelinePanelProps {
  timeline: Timeline
  currentTime: number
  selectedKeyframes: KeyframeSelection[]
  onSeek: (time: number) => void
  onKeyframeSelect: (keyframes: KeyframeSelection[]) => void
}

// Hierarchy Panel
interface HierarchyPanelProps {
  root: SceneNode
  selection: SceneNode[]
  onSelect: (nodes: SceneNode[]) => void
  onReparent: (node: SceneNode, newParent: SceneNode) => void
}

// Assets Panel
interface AssetsPanelProps {
  assets: AssetData[]
  onImport: (files: File[]) => void
  onDelete: (assetId: string) => void
  onDragStart: (asset: AssetData) => void
}
```
