# roadmap

the order below is deliberate. each phase produces a usable and testable
foundation for the next one.

## phase 0: reference freeze

- record the exact reference repository state.
- make a feature matrix from the action files and tests.
- collect representative `.excalidraw` and `.excalidrawlib` fixtures.
- identify which cloud features are removed or replaced locally.

## phase 1: native shell

- create the odin project and build script.
- open an sdl3 window.
- initialize opengl.
- implement resize, dpi, keyboard, mouse, text input, clipboard, and drag/drop. done.
- draw a clearable canvas with a camera.

## phase 2: data and persistence

- define document and element structs.
- parse and serialize `.excalidraw`.
- parse and serialize `.excalidrawlib`. done for legacy v1 and current v2.
- add atomic save, autosave, settings, recent files, and recovery.
- prove round-trip compatibility before adding more tools.

## phase 3: geometry and scene

- implement ids, z-order, bounds, transforms, and hit testing.
- implement selection, lasso, groups, locks, frames, and deleted elements.
- implement lines, arrows, bindings, and linear editing.
- add snapping, alignment, and distribution. grid, shape endpoint snapping, alignment, and distribution are done.

## phase 4: renderer

- render primitives and images.
- render text with font atlases and shaping.
- implement rough strokes and fills.
- add selection overlays, handles, grids, and themes.
- add offscreen rendering for export.

## phase 5: interaction tools

- implement all creation tools.
- implement move, resize, rotate, crop, eraser, and freehand behavior.
- implement text editing and bound text.
- implement copy, paste, duplicate, delete, undo, and redo.

## phase 6: native ui

- build the toolbar and properties panel.
- build menus, dialogs, context menus, and command palette.
- add keyboard shortcuts and localization.
- add library browsing and insertion. done for local files and click placement.

## phase 7: import and export

- open/save dialogs.
- png and svg export.
- clipboard png/svg/text support.
- image import and drag/drop. done for native file dialogs and sdl file drops.
- export options for scale, padding, background, and embedded scene data.

## phase 8: advanced parity

- charts and paste conversion.
- native mermaid subset.
- custom fonts and more complete script shaping.
- native link/placeholder behavior for embeds.
- optional ai provider interface.

## phase 9: hardening

- visual regression suite.
- interaction regression suite.
- large-scene profiling.
- autosave failure testing.
- packaging, file associations, installer, and update strategy.

the first serious milestone should be a native app that can open, edit, save,
reload, and render a real `.excalidraw` file. do not begin with menus or ai.
