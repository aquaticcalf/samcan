# Requirements Document

## Introduction

The samcan Animation Editor is a web-based authoring tool for creating, editing, and exporting vector-based animations. Built on top of the samcan core runtime, the editor provides a professional-grade interface for animators and designers to create interactive animations that can be played back in any JavaScript environment. The editor follows modern design tool conventions (similar to Figma, Rive, After Effects) while remaining lightweight and accessible.

## Glossary

- **Editor**: The web-based authoring application for creating and editing samcan animations
- **Canvas**: The main viewport where the artboard and its contents are displayed and manipulated
- **Selection**: The set of currently selected scene nodes that can be manipulated together
- **Tool**: A mode of interaction with the canvas (e.g., selection tool, shape tool, pen tool)
- **Panel**: A UI component that displays information or controls (e.g., properties panel, timeline panel)
- **Gizmo**: Visual handles overlaid on selected objects for direct manipulation (move, rotate, scale)
- **Playhead**: The current time position indicator on the timeline
- **Scrubbing**: Dragging the playhead to preview animation at different times
- **Snapping**: Automatic alignment of objects or keyframes to guides, grids, or other objects
- **Viewport**: The visible area of the canvas, which can be panned and zoomed
- **Transform Handle**: Interactive control points for manipulating object transforms

## Requirements

### Requirement 1: Canvas Viewport and Navigation

**User Story:** As an animator, I want to navigate around the canvas freely, so that I can work on different parts of my animation at various zoom levels.

#### Acceptance Criteria

1. THE Editor SHALL display the artboard centered within the canvas viewport on initial load
2. WHEN the user scrolls the mouse wheel, THE Editor SHALL zoom the viewport in or out centered on the cursor position
3. WHEN the user holds the spacebar and drags, THE Editor SHALL pan the viewport in the drag direction
4. WHEN the user double-clicks the zoom control, THE Editor SHALL reset the viewport to fit the artboard
5. THE Editor SHALL display the current zoom level as a percentage in the toolbar

### Requirement 2: Object Selection and Multi-Selection

**User Story:** As an animator, I want to select one or more objects on the canvas, so that I can manipulate them together.

#### Acceptance Criteria

1. WHEN the user clicks on an object, THE Editor SHALL select that object and deselect all others
2. WHEN the user shift-clicks on an object, THE Editor SHALL add or remove that object from the current selection
3. WHEN the user drags a rectangle on the canvas, THE Editor SHALL select all objects intersecting the rectangle
4. WHEN objects are selected, THE Editor SHALL display selection indicators around each selected object
5. WHEN the user presses Escape, THE Editor SHALL clear the current selection

### Requirement 3: Transform Gizmos

**User Story:** As an animator, I want to move, rotate, and scale objects using visual handles, so that I can position elements precisely without using numeric inputs.

#### Acceptance Criteria

1. WHEN an object is selected, THE Editor SHALL display transform handles at the object's bounding box corners and edges
2. WHEN the user drags a corner handle, THE Editor SHALL scale the object proportionally from the opposite corner
3. WHEN the user drags an edge handle, THE Editor SHALL scale the object along that axis only
4. WHEN the user drags outside a corner handle, THE Editor SHALL rotate the object around its pivot point
5. WHEN the user drags the object body, THE Editor SHALL move the object following the cursor

### Requirement 4: Properties Panel

**User Story:** As an animator, I want to view and edit object properties numerically, so that I can make precise adjustments to position, size, rotation, and other attributes.

#### Acceptance Criteria

1. WHEN an object is selected, THE Editor SHALL display its properties in the properties panel
2. WHEN the user modifies a property value, THE Editor SHALL update the object and canvas immediately
3. WHEN multiple objects are selected, THE Editor SHALL display common properties with mixed values indicated
4. THE Editor SHALL group properties into collapsible sections (Transform, Appearance, etc.)
5. WHEN no object is selected, THE Editor SHALL display artboard properties

### Requirement 5: Layer Hierarchy Panel

**User Story:** As an animator, I want to see and manage the hierarchy of objects in my scene, so that I can organize complex animations with nested groups.

#### Acceptance Criteria

1. THE Editor SHALL display all scene nodes in a hierarchical tree view
2. WHEN the user drags a node in the hierarchy, THE Editor SHALL reparent the node to the drop target
3. WHEN the user clicks the visibility icon, THE Editor SHALL toggle the node's visibility
4. WHEN the user double-clicks a node name, THE Editor SHALL allow inline renaming
5. WHEN the user right-clicks a node, THE Editor SHALL display a context menu with node operations

### Requirement 6: Timeline Panel

**User Story:** As an animator, I want to view and edit keyframes on a timeline, so that I can control the timing and sequencing of my animations.

#### Acceptance Criteria

1. THE Editor SHALL display a timeline with a time ruler showing seconds and frames
2. WHEN the user clicks on the timeline ruler, THE Editor SHALL move the playhead to that time
3. WHEN the user drags the playhead, THE Editor SHALL update the canvas to show the animation at that time
4. THE Editor SHALL display keyframe markers for each animated property track
5. WHEN the user drags a keyframe marker, THE Editor SHALL move the keyframe to the new time position

### Requirement 7: Keyframe Editing

**User Story:** As an animator, I want to add, modify, and delete keyframes, so that I can define how properties change over time.

#### Acceptance Criteria

1. WHEN the user presses the keyframe button with an object selected, THE Editor SHALL add a keyframe at the current time for all animated properties
2. WHEN the user modifies a property at a time with no keyframe, THE Editor SHALL create a new keyframe automatically
3. WHEN the user selects a keyframe and presses Delete, THE Editor SHALL remove that keyframe
4. WHEN the user right-clicks a keyframe, THE Editor SHALL display options for interpolation type and easing
5. WHEN the user selects multiple keyframes, THE Editor SHALL allow batch operations (delete, move, copy)

### Requirement 8: Shape Creation Tools

**User Story:** As an animator, I want to create basic shapes quickly, so that I can build vector graphics without external tools.

#### Acceptance Criteria

1. WHEN the rectangle tool is active and the user drags on the canvas, THE Editor SHALL create a rectangle shape
2. WHEN the ellipse tool is active and the user drags on the canvas, THE Editor SHALL create an ellipse shape
3. WHEN the user holds Shift while dragging, THE Editor SHALL constrain the shape to equal width and height
4. WHEN the user holds Alt while dragging, THE Editor SHALL create the shape centered on the start point
5. WHEN shape creation completes, THE Editor SHALL select the new shape and switch to the selection tool

### Requirement 9: Pen Tool for Path Drawing

**User Story:** As an animator, I want to draw custom vector paths, so that I can create complex shapes beyond basic primitives.

#### Acceptance Criteria

1. WHEN the pen tool is active and the user clicks, THE Editor SHALL add a corner point to the current path
2. WHEN the pen tool is active and the user click-drags, THE Editor SHALL add a curve point with control handles
3. WHEN the user clicks on the starting point, THE Editor SHALL close the path
4. WHEN the user presses Escape during path drawing, THE Editor SHALL finish the path as open
5. WHEN the user clicks on an existing point, THE Editor SHALL allow editing that point's position and handles

### Requirement 10: Fill and Stroke Editing

**User Story:** As an animator, I want to set colors and styles for fills and strokes, so that I can style my vector graphics.

#### Acceptance Criteria

1. WHEN an object is selected, THE Editor SHALL display fill and stroke controls in the properties panel
2. WHEN the user clicks the fill color, THE Editor SHALL open a color picker with solid and gradient options
3. WHEN the user selects a gradient fill, THE Editor SHALL display gradient stops that can be edited
4. WHEN the user modifies stroke width, THE Editor SHALL update the object's stroke immediately
5. THE Editor SHALL support stroke cap and join style options (round, square, miter)

### Requirement 11: Undo and Redo

**User Story:** As an animator, I want to undo and redo my actions, so that I can experiment freely and recover from mistakes.

#### Acceptance Criteria

1. WHEN the user presses Ctrl+Z, THE Editor SHALL undo the most recent action
2. WHEN the user presses Ctrl+Shift+Z, THE Editor SHALL redo the most recently undone action
3. THE Editor SHALL maintain an undo history of at least 100 actions
4. WHEN an action is undone, THE Editor SHALL update the canvas and all panels to reflect the previous state
5. WHEN a new action is performed after undo, THE Editor SHALL clear the redo history

### Requirement 12: File Operations

**User Story:** As an animator, I want to save and load my work, so that I can persist my animations and continue editing later.

#### Acceptance Criteria

1. WHEN the user triggers save, THE Editor SHALL serialize the animation to the samcan JSON format
2. WHEN the user triggers open, THE Editor SHALL load and deserialize a samcan file
3. WHEN the user triggers export, THE Editor SHALL provide options for compressed output
4. THE Editor SHALL track unsaved changes and warn before closing with unsaved work
5. WHEN loading a file with missing assets, THE Editor SHALL display warnings and provide placeholder handling

### Requirement 13: Playback Controls

**User Story:** As an animator, I want to preview my animation in the editor, so that I can see how it will look when played back.

#### Acceptance Criteria

1. WHEN the user clicks the play button, THE Editor SHALL start animation playback from the current time
2. WHEN the user clicks the pause button, THE Editor SHALL pause playback at the current time
3. WHEN the user clicks the stop button, THE Editor SHALL stop playback and return to time zero
4. THE Editor SHALL display the current playback time in the timeline
5. WHEN playback reaches the end, THE Editor SHALL stop or loop based on the loop setting

### Requirement 14: Keyboard Shortcuts

**User Story:** As an animator, I want to use keyboard shortcuts for common actions, so that I can work efficiently without constantly using menus.

#### Acceptance Criteria

1. THE Editor SHALL support standard shortcuts (Ctrl+S save, Ctrl+Z undo, Ctrl+C copy, Ctrl+V paste)
2. THE Editor SHALL support tool shortcuts (V selection, R rectangle, E ellipse, P pen)
3. WHEN the user presses Delete with objects selected, THE Editor SHALL delete the selected objects
4. WHEN the user presses arrow keys with objects selected, THE Editor SHALL nudge objects by 1 pixel
5. THE Editor SHALL allow viewing and customizing keyboard shortcuts in a settings panel

### Requirement 15: Snapping and Alignment

**User Story:** As an animator, I want objects to snap to guides and other objects, so that I can align elements precisely.

#### Acceptance Criteria

1. WHEN dragging an object near another object's edge, THE Editor SHALL snap to that edge and display a guide line
2. WHEN dragging an object near the artboard center, THE Editor SHALL snap to the center and display guide lines
3. THE Editor SHALL provide alignment commands (align left, center, right, top, middle, bottom)
4. THE Editor SHALL provide distribution commands (distribute horizontally, vertically)
5. WHEN the user holds Ctrl while dragging, THE Editor SHALL temporarily disable snapping

### Requirement 16: Copy, Paste, and Duplicate

**User Story:** As an animator, I want to copy and paste objects, so that I can reuse elements efficiently.

#### Acceptance Criteria

1. WHEN the user copies selected objects, THE Editor SHALL store them in the clipboard
2. WHEN the user pastes, THE Editor SHALL create duplicates of clipboard objects at an offset position
3. WHEN the user duplicates (Ctrl+D), THE Editor SHALL create copies immediately without using clipboard
4. THE Editor SHALL support pasting objects between different artboards
5. WHEN pasting objects with keyframes, THE Editor SHALL include the animation data

### Requirement 17: Group and Ungroup

**User Story:** As an animator, I want to group objects together, so that I can manipulate multiple objects as a single unit.

#### Acceptance Criteria

1. WHEN the user groups selected objects, THE Editor SHALL create a new group node containing those objects
2. WHEN the user ungroups a group, THE Editor SHALL move the children to the group's parent and delete the group
3. WHEN a group is selected, THE Editor SHALL allow entering the group to edit children directly
4. THE Editor SHALL preserve relative transforms when grouping and ungrouping
5. WHEN animating a group, THE Editor SHALL apply the animation to all children

### Requirement 18: State Machine Editor

**User Story:** As an animator, I want to create interactive state machines, so that I can build animations that respond to user input.

#### Acceptance Criteria

1. THE Editor SHALL provide a state machine panel for creating and editing states
2. WHEN the user creates a state, THE Editor SHALL associate it with a timeline
3. WHEN the user creates a transition, THE Editor SHALL allow defining conditions and blend duration
4. THE Editor SHALL display state machine as a node graph with states and transition arrows
5. WHEN testing the state machine, THE Editor SHALL allow triggering events and setting inputs manually

### Requirement 19: Asset Management Panel

**User Story:** As an animator, I want to import and manage images and fonts, so that I can use external assets in my animations.

#### Acceptance Criteria

1. THE Editor SHALL provide an assets panel listing all imported assets
2. WHEN the user drags an image file into the editor, THE Editor SHALL import it as an asset
3. WHEN the user drags an asset onto the canvas, THE Editor SHALL create an image node using that asset
4. THE Editor SHALL display asset thumbnails and metadata (dimensions, file size)
5. WHEN an asset is unused, THE Editor SHALL indicate this and allow removal

### Requirement 20: Editor State Persistence

**User Story:** As an animator, I want the editor to remember my workspace layout and preferences, so that I can resume work with my preferred setup.

#### Acceptance Criteria

1. THE Editor SHALL persist panel layout and sizes to local storage
2. THE Editor SHALL persist recent files list for quick access
3. THE Editor SHALL persist user preferences (grid settings, snap settings, shortcuts)
4. WHEN the editor loads, THE Editor SHALL restore the previous workspace state
5. THE Editor SHALL provide a reset option to restore default workspace layout

