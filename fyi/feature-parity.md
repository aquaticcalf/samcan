# feature parity

## editor features to reproduce

### canvas and navigation

- infinite canvas
- pan and zoom
- zoom to fit, selection, and drawing
- grid mode
- snap to objects and midpoints -- grid snapping plus shape corners and midpoints for lines/arrows
- dark and light themes
- canvas background color
- view mode and zen mode
- scrollbars and viewport indicators

### tools

- selection and multi-selection
- lasso selection
- rectangle, ellipse, and diamond
- line, arrow, and elbow arrow
- freehand drawing
- eraser
- text and bound text
- image placement
- image crop editor
- frames and magic frames
- laser pointer
- linear element editor

### element behavior

- move, resize, rotate, and flip
- lock and unlock
- group and ungroup
- bring forward, send backward, front, and back
- align and distribute -- native alignment actions plus horizontal distribution
- links and element links
- arrow binding to shapes
- bound text inside containers
- z-order preservation
- deleted-element tombstones for undo and file compatibility

### editing and commands

- undo and redo
- duplicate, delete, cut, copy, and paste
- keyboard shortcuts
- command palette
- search
- context menus
- element conversion
- properties panel
- statistics/debug view
- locale switching

### libraries and data

- local shape library -- native panel with local item insertion
- import and export `.excalidrawlib` -- legacy v1 read and current v2 read/write
- library item preview and insertion -- numbered native previews and click placement
- image attachments
- document title and metadata
- recent documents
- autosave and recovery -- atomic `.autosave` sidecars are written for dirty named documents; recovery selection remains

### export and interoperability

- open and save `.excalidraw`
- png export with scale, padding, and background options
- svg export
- copy as png
- copy as svg
- copy as text/json where applicable
- image import -- embedded native image assets
- drag/drop import -- sdl file-drop placement
- clipboard image import

## local replacements

| web feature | native local behavior |
| --- | --- |
| pwa | installed native executable and native settings |
| browser local storage | document files, settings, and autosave journal |
| indexeddb image store | embedded image data plus a local decoded-image cache |
| shareable link | exported file or local read-only snapshot |
| published library | local library file import/export |
| firebase | removed |
| sentry and telemetry | removed by default |
| multiplayer | intentionally removed |
| excalidraw+ | removed or replaced by local export workflows |

## features needing extra work

### rough rendering

the hand-drawn appearance is not a simple line style. implement a deterministic
rough stroke module with seeded randomness, path simplification, double lines,
hachure fills, and arrowhead geometry.

### mermaid and text-to-diagram

the vendor collection does not contain mermaid. start with a native subset
parser for flowcharts, sequence diagrams, and simple graphs. add a layout
engine and convert the result into normal document elements. full mermaid
compatibility should be treated as a later milestone.

### ai

hosted ai is not an offline editor feature. keep the feature behind an optional
provider interface. a local model or an explicitly configured http provider can
be added later without contaminating the document core.

### embedded content

native image and link elements are straightforward. full embedded web pages
would require a webview, which violates the pure-native constraint. support a
stored link or placeholder first.
