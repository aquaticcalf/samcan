# Implementation Plan

- [ ] 1. Set up editor project structure and core interfaces
  - [x] 1.1 Create editor directory structure (editor/, editor/core/, editor/canvas/, editor/tools/, editor/panels/, editor/commands/)
    - Set up TypeScript configuration extending the main project
    - Create index.ts exports for each module
    - _Requirements: All_

  - [ ] 1.2 Define core editor interfaces and types
    - Create EditorState, EditorDocument, ViewportState interfaces
    - Create EditorEvent types and EditorPreferences interface
    - Create KeyframeSelection and related types
    - _Requirements: All_

  - [ ] 1.3 Set up fast-check for property-based testing
    - Install fast-check as dev dependency
    - Create test utilities and custom arbitraries for editor types
    - _Requirements: Testing Strategy_

- [ ] 2. Implement ViewportManager
  - [ ] 2.1 Create ViewportManager class with zoom and pan
    - Implement zoom operations (zoomIn, zoomOut, zoomTo, zoomToFit, resetZoom)
    - Implement pan operations (pan, panTo, centerOn)
    - Implement coordinate transforms (screenToWorld, worldToScreen)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 2.2 Write property tests for ViewportManager
    - **Property 1: Zoom preserves cursor position**
    - **Property 2: Pan offset consistency**
    - **Validates: Requirements 1.2, 1.3**

- [ ] 3. Implement SelectionManager
  - [ ] 3.1 Create SelectionManager class
    - Implement selection operations (select, addToSelection, removeFromSelection, toggleSelection, clear, selectAll)
    - Implement hit testing (hitTest, hitTestRect)
    - Implement selection queries (isSelected, selectedNodes, selectionBounds, selectionCenter)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.2 Write property tests for SelectionManager
    - **Property 3: Click selection exclusivity**
    - **Property 4: Shift-click toggles selection**
    - **Property 5: Marquee selection completeness**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ] 4. Implement TransformGizmo
  - [ ] 4.1 Create TransformGizmo class
    - Implement handle detection (hitTestHandle)
    - Implement transform operations (beginTransform, updateTransform, endTransform, cancelTransform)
    - Implement gizmo rendering
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 4.2 Write property tests for TransformGizmo
    - **Property 6: Proportional scale from corner**
    - **Property 7: Axis-constrained scale from edge**
    - **Property 8: Rotation around pivot**
    - **Property 9: Translation follows cursor**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**

- [ ] 5. Implement SnapEngine
  - [ ] 5.1 Create SnapEngine class
    - Implement snap detection with configurable threshold
    - Implement edge and center snapping
    - Implement alignment commands (alignLeft, alignCenter, alignRight, alignTop, alignMiddle, alignBottom)
    - Implement distribution commands (distributeHorizontally, distributeVertically)
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ] 5.2 Write property tests for SnapEngine
    - **Property 38: Edge snapping**
    - **Property 39: Center snapping**
    - **Property 40: Alignment commands**
    - **Property 41: Distribution commands**
    - **Property 42: Ctrl disables snapping**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 7. Implement Tool System
  - [ ] 7.1 Create Tool interface and ToolManager
    - Define Tool interface with lifecycle and input handling methods
    - Create ToolManager for tool registration and activation
    - Implement input routing to active tool
    - _Requirements: 8.1, 8.2, 9.1, 9.2_

  - [ ] 7.2 Implement SelectionTool
    - Handle click to select, shift-click to toggle
    - Handle drag for marquee selection
    - Handle drag on selected objects for move
    - Integrate with TransformGizmo for scale/rotate
    - _Requirements: 2.1, 2.2, 2.3, 3.2, 3.3, 3.4, 3.5_

  - [ ] 7.3 Implement RectangleTool
    - Handle drag to create rectangle
    - Support Shift for square constraint
    - Support Alt for center-based creation
    - Auto-select created shape and switch to selection tool
    - _Requirements: 8.1, 8.3, 8.4, 8.5_

  - [ ] 7.4 Write property tests for RectangleTool
    - **Property 20: Rectangle creation bounds**
    - **Property 22: Shift constrains to square**
    - **Property 23: Alt centers on start point**
    - **Validates: Requirements 8.1, 8.3, 8.4**

  - [ ] 7.5 Implement EllipseTool
    - Handle drag to create ellipse
    - Support Shift for circle constraint
    - Support Alt for center-based creation
    - Auto-select created shape and switch to selection tool
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

  - [ ] 7.6 Write property tests for EllipseTool
    - **Property 21: Ellipse creation bounds**
    - **Validates: Requirements 8.2**

  - [ ] 7.7 Implement PenTool
    - Handle click for corner points
    - Handle click-drag for curve points with handles
    - Handle click on start point to close path
    - Handle Escape to finish open path
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 7.8 Write property tests for PenTool
    - **Property 24: Pen tool corner point**
    - **Property 25: Pen tool curve point**
    - **Validates: Requirements 9.1, 9.2**

  - [ ] 7.9 Implement HandTool and ZoomTool
    - HandTool: drag to pan viewport
    - ZoomTool: click to zoom in, alt-click to zoom out
    - _Requirements: 1.2, 1.3_

- [ ] 8. Implement Editor Commands
  - [ ] 8.1 Create transform commands
    - MoveNodesCommand with delta and multi-selection support
    - ScaleNodesCommand with anchor point
    - RotateNodesCommand with pivot
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 11.1, 11.2_

  - [ ] 8.2 Create hierarchy commands
    - GroupNodesCommand to create group from selection
    - UngroupNodesCommand to dissolve group
    - ReparentNodeCommand to move node to new parent
    - ReorderNodeCommand to change sibling order
    - _Requirements: 5.2, 17.1, 17.2, 17.4_

  - [ ] 8.3 Write property tests for hierarchy commands
    - **Property 46: Group creates container**
    - **Property 47: Ungroup flattens hierarchy**
    - **Property 48: Group/Ungroup preserves world transforms**
    - **Validates: Requirements 17.1, 17.2, 17.4**

  - [ ] 8.4 Create shape commands
    - CreateShapeCommand for rectangle, ellipse, path creation
    - ModifyPathCommand for path point editing
    - _Requirements: 8.1, 8.2, 9.1, 9.2_

  - [ ] 8.5 Create appearance commands
    - SetFillCommand for fill paint
    - SetStrokeCommand for stroke paint and width
    - _Requirements: 10.2, 10.3, 10.4_

  - [ ] 8.6 Write property tests for appearance commands
    - **Property 26: Stroke width modification**
    - **Property 10: Property modification reflects immediately**
    - **Validates: Requirements 10.4, 4.2**

  - [ ] 8.7 Create timeline commands
    - MoveKeyframesCommand for time adjustment
    - DeleteKeyframesCommand for keyframe removal
    - SetInterpolationCommand for easing changes
    - _Requirements: 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 8.8 Write property tests for timeline commands
    - **Property 15: Keyframe time modification**
    - **Property 16: Keyframe button creates keyframes**
    - **Property 17: Auto-keyframe on property change**
    - **Property 18: Keyframe deletion**
    - **Property 19: Batch keyframe operations**
    - **Validates: Requirements 6.5, 7.1, 7.2, 7.3, 7.5**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 10. Implement ClipboardManager
  - [ ] 10.1 Create ClipboardManager class
    - Implement copy with node serialization
    - Implement cut (copy + delete)
    - Implement paste with offset positioning
    - Implement duplicate without clipboard modification
    - Support animation data in clipboard
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [ ] 10.2 Write property tests for ClipboardManager
    - **Property 43: Copy/Paste round-trip**
    - **Property 44: Duplicate preserves clipboard**
    - **Property 45: Paste includes animation**
    - **Validates: Requirements 16.1, 16.2, 16.3, 16.5**

- [ ] 11. Implement ShortcutManager
  - [ ] 11.1 Create ShortcutManager class
    - Implement shortcut registration and matching
    - Implement keyboard event handling
    - Implement shortcut customization
    - Register default shortcuts (Ctrl+Z, Ctrl+S, V, R, E, P, Delete, arrows)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [ ] 11.2 Write property tests for ShortcutManager
    - **Property 36: Delete removes selected**
    - **Property 37: Arrow key nudge**
    - **Validates: Requirements 14.3, 14.4**

- [ ] 12. Implement Editor Core
  - [ ] 12.1 Create Editor class
    - Implement state management with EditorState
    - Wire up CommandHistory from core
    - Integrate SelectionManager, ClipboardManager, ShortcutManager, ToolManager
    - Implement document operations (newDocument, openDocument, saveDocument, closeDocument)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 12.1, 12.2, 12.4_

  - [ ] 12.2 Write property tests for Editor undo/redo
    - **Property 27: Undo/Redo round-trip**
    - **Property 28: History size limit**
    - **Property 29: Redo cleared on new action**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.5**

  - [ ] 12.3 Write property tests for Editor save/load
    - **Property 30: Save/Load round-trip**
    - **Property 31: Dirty flag on modification**
    - **Validates: Requirements 12.1, 12.2, 12.4**

  - [ ] 12.4 Implement playback controls
    - Implement play, pause, stop, seek methods
    - Integrate with AnimationRuntime from core
    - Handle loop behavior at animation end
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ] 12.5 Write property tests for playback
    - **Property 32: Play sets playing state**
    - **Property 33: Pause preserves time**
    - **Property 34: Stop resets to zero**
    - **Property 35: Loop behavior at end**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.5**

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Implement Canvas Rendering
  - [ ] 14.1 Create CanvasRenderer class
    - Implement artboard rendering with background
    - Implement scene graph traversal and rendering
    - Implement selection indicator rendering
    - Implement gizmo overlay rendering
    - Implement guide line rendering for snapping
    - _Requirements: 1.1, 2.4, 3.1, 15.1, 15.2_

  - [ ] 14.2 Create canvas input handling
    - Handle mouse/pointer events and route to ToolManager
    - Handle keyboard events and route to ShortcutManager
    - Handle spacebar+drag for pan
    - Handle wheel for zoom
    - _Requirements: 1.2, 1.3, 14.1, 14.2_

  - [ ] 14.3 Write property tests for canvas coordinate transforms
    - **Property 13: Playhead click positioning**
    - **Property 14: Scrubbing updates canvas**
    - **Validates: Requirements 6.2, 6.3**

- [ ] 15. Implement React UI Panels
  - [ ] 15.1 Create PanelManager and layout system
    - Implement panel registration and state management
    - Implement resizable panel layout
    - Implement panel visibility toggling
    - _Requirements: 20.1_

  - [ ] 15.2 Create PropertiesPanel component
    - Display selected node properties
    - Handle property editing with command creation
    - Display artboard properties when no selection
    - Group properties into collapsible sections
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 15.3 Create HierarchyPanel component
    - Display scene tree with expand/collapse
    - Handle drag-and-drop for reparenting
    - Handle visibility toggle
    - Handle inline renaming
    - Handle context menu
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 15.4 Write property tests for HierarchyPanel operations
    - **Property 11: Reparenting preserves node**
    - **Property 12: Visibility toggle inverts state**
    - **Validates: Requirements 5.2, 5.3**

  - [ ] 15.5 Create TimelinePanel component
    - Display time ruler with seconds/frames
    - Display playhead with drag support
    - Display keyframe markers per track
    - Handle keyframe selection and dragging
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 15.6 Create Toolbar component
    - Display tool buttons with active state
    - Display zoom level
    - Display playback controls
    - _Requirements: 1.5, 13.1, 13.2, 13.3, 13.4_

  - [ ] 15.7 Create AssetsPanel component
    - Display asset list with thumbnails
    - Handle file drop for import
    - Handle drag to canvas for node creation
    - Display unused asset indicator
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [ ] 15.8 Write property tests for asset operations
    - **Property 50: Asset import creates asset**
    - **Property 51: Asset drop creates node**
    - **Property 52: Unused asset detection**
    - **Validates: Requirements 19.2, 19.3, 19.5**

- [ ] 16. Implement State Machine Editor
  - [ ] 16.1 Create StateMachinePanel component
    - Display state machine as node graph
    - Handle state creation with timeline association
    - Handle transition creation with conditions
    - Handle event triggering for testing
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [ ] 16.2 Write property tests for state machine
    - **Property 49: State creation with timeline**
    - **Validates: Requirements 18.2**

- [ ] 17. Implement Fill and Stroke Editor
  - [ ] 17.1 Create ColorPicker component
    - Support solid color selection
    - Support gradient creation and editing
    - Display gradient stops editor
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 17.2 Create StrokeEditor component
    - Support stroke width editing
    - Support stroke cap and join options
    - _Requirements: 10.4, 10.5_

- [ ] 18. Implement Editor State Persistence
  - [ ] 18.1 Create persistence utilities
    - Implement localStorage save/load for panel layout
    - Implement recent files list management
    - Implement preferences persistence
    - Implement workspace state restoration on load
    - Implement reset to defaults
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

  - [ ] 18.2 Write property tests for persistence
    - **Property 53: Workspace state persistence round-trip**
    - **Validates: Requirements 20.1, 20.2, 20.3, 20.4**

- [ ] 19. Implement File Operations UI
  - [ ] 19.1 Create file operation handlers
    - Implement save with dirty state tracking
    - Implement open with file picker
    - Implement export with compression options
    - Implement unsaved changes warning
    - Handle missing assets on load
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 20. Wire up complete editor application
  - [ ] 20.1 Create main Editor React component
    - Compose all panels with PanelManager layout
    - Wire up canvas with input handling
    - Connect all managers to Editor core
    - _Requirements: All_

  - [ ] 20.2 Create editor entry point
    - Initialize Editor with canvas element
    - Set up default document or load from URL
    - Register all default tools and shortcuts
    - _Requirements: All_

- [ ] 21. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
