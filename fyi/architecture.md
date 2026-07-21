# architecture

## design principle

use the existing repository as a specification, not as a runtime dependency.
port the data model and interaction rules into odin, then implement the
renderer and desktop shell natively.

the important reference areas are:

- `packages/element`: element types, bounds, collision, selection, transforms,
  text, arrows, bindings, groups, frames, and z-order.
- `packages/excalidraw`: actions, tools, renderer, menus, export, libraries,
  undo/redo, and editor state.
- `excalidraw-app/data`: browser persistence, image storage, file management,
  autosaving, and library persistence.

## native stack

- `sdl3`: window creation, input events, text input, clipboard, drag and drop.
- `opengl`: the rendering backend.
- `nanovg`: antialiased vector paths and small 2d drawing operations.
- `microui`: native menus, dialogs, panels, and property controls.
- `stb/image`: image decoding.
- `stb/image_write`: png encoding.
- `stb/truetype` and `fontstash`: font loading and glyph atlases.
- `kb_text_shape`: unicode shaping and complex script layout.
- odin core json and file APIs: document parsing and persistence.
- `windows`: native windows dialogs, file associations, and platform glue.
- `zlib`: optional compression for caches or future packaged formats.

do not use every vendor library just because it is available. box2d, box3d,
raylib, wgpu, vulkan, cgltf, and unrelated audio libraries are not needed for
the core editor.

## runtime layers

```text
sdl3 event loop
        |
        v
input translator
        |
        v
tools and actions
        |
        v
document model
        |
        +--> undo and redo
        +--> dirty state
        +--> autosave
        +--> library persistence
        |
        v
scene renderer
        |
        v
opengl window
```

## core data model

```text
document
  elements
  app_state
  binary_files
  library_items
  metadata
  history
```

elements should be tagged unions with shared fields for id, position, size,
angle, style, group ids, frame id, lock state, and deletion state. specialized
fields should cover linear paths, arrow bindings, text, images, frames, and
embeds.

## suggested source tree

```text
src/
  main.odin
  app/
  platform/
  document/
  elements/
  geometry/
  renderer/
  tools/
  ui/
  persistence/
  text/
  images/
  export/
  library/
  mermaid/
tests/
assets/
build.ps1
```

## frame loop

1. poll sdl events.
2. translate platform coordinates and modifiers into editor input.
3. give input to the active tool or text editor.
4. mutate the document through actions.
5. record a history command when the mutation is complete.
6. mark the document dirty and schedule autosave.
7. rebuild only the affected render caches.
8. draw the scene, selection layer, and ui layer.
9. swap the opengl buffers.

keep the document independent from the renderer. this makes file loading,
undo/redo, export, and tests possible without opening a window.

## rendering model

use world coordinates for document elements and a viewport containing camera
position, zoom, and canvas size. render in layers:

1. background and grid.
2. scene elements in z-order.
3. selection, hover, bindings, and resize handles.
4. transient freehand and linear-editor overlays.
5. menus, dialogs, toolbars, and status information.

the hand-drawn style needs its own deterministic stroke generator. it should
support rough lines, double strokes, wobble, hachure fills, dashed lines,
arrowheads, and cached geometry. exact roughjs parity is a separate renderer
task because no matching vendor library is bundled with odin.
