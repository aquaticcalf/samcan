# vendor usage

## use first

### sdl3

use it for the desktop window, mouse and keyboard events, text input, clipboard,
drag and drop, window resize, dpi changes, and basic platform-independent
behavior.

### opengl and nanovg

use opengl for the main gpu backend. use nanovg where antialiased paths and
simple vector ui drawing are useful. large scene rendering can use direct
opengl buffers and cached geometry instead of routing every element through
nanovg.

### microui

use microui for the native control layer: menus, property panels, command
palette, dialogs, checkboxes, sliders, and library controls. write a custom
renderer backend for its draw commands using nanovg or opengl.

### text and images

- `stb/image` for imported raster images.
- `stb/image_write` for png export.
- `stb/truetype` for parsing and rasterizing fonts.
- `fontstash` for glyph atlas management.
- `kb_text_shape` for script shaping and glyph placement.

the bundled fonts from the reference app can be added as application assets,
subject to their individual licenses.

### windows

use the windows bindings for native open/save dialogs, file associations,
application data paths, and any platform behavior that sdl3 does not expose.

## use later or only if needed

- `zlib`: compression for caches or an optional packaged document format.
- `commonmark`: only if markdown rendering becomes a native feature.
- `miniaudio`: not needed unless the application gains audio.
- `curl`: not needed for the offline editor; reserve it for an explicitly
  optional ai or update integration.

## do not make these core dependencies

box2d, box3d, raylib, wgpu, vulkan, directx, cgltf, openexr, portmidi, lua,
and the platform-specific graphics bindings are useful libraries, but they do
not solve the editor's central problems. adding them early would increase the
surface area without improving parity.

## licensing

the reference project and each vendor library have their own licenses. keep a
third-party notices file, preserve notices when porting algorithms, and track
font licenses separately.
