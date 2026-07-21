# testing

## reference sources

use the existing repository tests as the behavior checklist:

- `packages/element/tests`: geometry, bounds, collision, selection, binding,
  frames, resize, text, z-order, and transforms.
- `packages/excalidraw/tests`: editor actions, history, libraries, restore,
  export, shortcuts, and component behavior.
- `packages/utils/tests`: png, svg, clipboard, and export behavior.

the odin implementation does not need to run the typescript tests. it should
port their cases into native tests and keep the original fixtures as oracles.

## file tests

- read real `.excalidraw` fixtures.
- write them back and compare normalized json.
- preserve image metadata and binary files.
- test old and current version migrations.
- preserve unknown fields where possible.
- round-trip `.excalidrawlib` files.
- fuzz malformed input and confirm safe failure.

## geometry tests

- bounds for every element type.
- rotated hit testing.
- selection and lasso edge cases.
- resize handles and aspect rules.
- arrow binding and unbinding.
- group, frame, and z-order behavior.
- snapping and alignment.
- text wrapping and container resizing.

## renderer tests

- render fixed scenes at fixed camera settings.
- compare golden pngs with a small tolerance.
- compare svg output structurally.
- test dark and light themes.
- test transparent and colored export backgrounds.
- test high export scale.
- test images, text, arrows, rough fills, and deleted elements.

## visual capture mode

the native capture program renders a realistic classroom board and a
directional interaction matrix into numbered png files. the wrapper also
encodes those frames into an mp4 when ffmpeg is available:

```powershell
powershell -ExecutionPolicy Bypass -File tools/visual-test.ps1
```

the output folder contains `manifest.txt`, the frame images, and
`visual-test.mp4`. pass a folder to keep a stable output location:

```powershell
powershell -ExecutionPolicy Bypass -File tools/visual-test.ps1 build/visual-latest
```

## interaction tests

automate sequences such as:

1. create a rectangle.
2. resize and rotate it.
3. create an arrow and bind it to the rectangle.
4. add bound text.
5. group, duplicate, lock, and undo.
6. save, close, reopen, and compare the document.

also cover keyboard shortcuts, clipboard operations, drag/drop, dialogs,
autosave, crash recovery, and switching between documents.

## definition of done

the first complete release is done when it can:

- open and save real reference files.
- reproduce the core canvas interactions without browser dependencies.
- render the major element types with the hand-drawn style.
- preserve undo/redo and local recovery across restarts.
- export png and svg.
- manage local libraries.
- pass file, geometry, interaction, and visual regression suites.
- run as a native odin executable on windows.
