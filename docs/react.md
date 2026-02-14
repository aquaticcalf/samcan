# React Bindings

## Problem Statement

The core library is framework-agnostic, but many users will use React. We need bindings that:

1. Make integration easy (hooks, components)
2. Don't compromise the core library's design
3. Follow React patterns (controlled/uncontrolled, refs, etc.)
4. Handle React's rendering model correctly

This is a separate package that depends on the core, not part of the core itself.

## Design Decisions

### Why a separate package?

```
samcan/           # core, no React dependency
samcan-react/     # React bindings, depends on samcan + react
```

Reasons:

1. **Core stays pure** - No React types in core bundle
2. **Tree shaking** - Non-React users don't get React code
3. **Version flexibility** - Can support multiple React versions
4. **Clear boundary** - Core is framework-agnostic

Alternative: export React stuff from `samcan/react`. But this still puts React in the dependency tree.

### Why hooks over components?

React patterns:

1. **Render prop components** - `<Canvas render={(ctx) => ...} />`
2. **Compound components** - `<Canvas><Stroke /><Shape /></Canvas>`
3. **Hooks** - `const { render, panZoom } = useCanvas(canvasRef)`

We prefer hooks because:

1. **Flexible composition** - Use what you need
2. **No extra DOM** - Hooks don't render anything
3. **Control over rendering** - User decides when to re-render
4. **Easier testing** - Hooks are just functions

We provide hooks + one thin component wrapper for convenience.

### Why controlled state by default?

Controlled:

```tsx
const [doc, setDoc] = useState(initial_document)
return <Whiteboard document={doc} onDocumentChange={setDoc} />
```

Uncontrolled:

```tsx
const ref = useRef()
return <Whiteboard ref={ref} />
// ref.current.document to access
```

Controlled is preferred because:

1. **React paradigm** - State lives in React tree
2. **Predictable** - Document is always what you passed
3. **DevTools** - State visible in React DevTools
4. **Time travel** - Easy to implement undo with external state

Uncontrolled is an escape hatch for performance-critical cases.

### Why separate hooks for camera, tools, selection?

One big hook:

```tsx
const whiteboard = useWhiteboard(canvas, options)
// whiteboard.document, whiteboard.camera, whiteboard.tool, ...
```

Separate hooks:

```tsx
const document = useDocument(initialDoc)
const camera = useCamera(initialCamera)
const tool = useTool("select")
const render = useRender(canvasRef, document, camera)
```

Separate is better because:

1. **Granular re-renders** - Camera change doesn't re-render document list
2. **Pick what you need** - Don't want tools? Don't use the hook
3. **Testable** - Each hook is small and focused
4. **Composable** - Build custom combinations

But we also provide a combined `useWhiteboard` for quick setup.

### Why not put document in context?

React Context seems natural:

```tsx
<WhiteboardProvider>
  <Canvas />
  <Toolbar />
  <Sidebar /> // all can access document
</WhiteboardProvider>
```

Problems:

1. **Re-render blast radius** - Context change re-renders all consumers
2. **External state** - Many apps use Redux/Zustand, don't want duplicate state
3. **Tight coupling** - Components depend on context existing

Instead, we provide hooks that work with any state management:

```tsx
// With useState
const [doc, setDoc] = useState(initial)
const camera = useCamera()

// With Redux
const doc = useSelector(selectDocument)
const camera = useSelector(selectCamera)

// Same rendering hook works
useRender(canvasRef, doc, camera)
```

### Why use refs for canvas?

```tsx
const canvasRef = useRef<HTMLCanvasElement>(null)
useRender(canvasRef, doc, camera)
return <canvas ref={canvasRef} />
```

Instead of rendering canvas internally:

```tsx
<Canvas document={doc} camera={camera} />
```

Ref approach is better because:

1. **Layout control** - User controls canvas sizing/positioning
2. **Multiple canvases** - Can have canvas + minimap
3. **DOM access** - Sometimes need direct canvas manipulation
4. **Framework patterns** - Refs are the React way for imperative APIs

## Core Hooks

### useDocument

Manages document state with immutable updates.

```tsx
const [doc, dispatch] = useDocument(initial_document)

dispatch({ type: "add_element", element: stroke })
dispatch({ type: "remove_element", id: "abc" })
dispatch({ type: "update_element", id: "abc", element: newStroke })
```

Why dispatch instead of setDoc? Because document updates often depend on previous state, and reducer pattern handles this cleanly.

### useCamera

Manages camera state with pan/zoom helpers.

```tsx
const [camera, cameraActions] = useCamera(initial_camera, viewport)

cameraActions.pan(dx, dy)
cameraActions.zoom(factor, anchor)
cameraActions.fit(bounds)
cameraActions.reset()
```

Returns memoized action creators that don't change between renders.

### useTool

Manages current tool and tool-specific state.

```tsx
const [tool, setTool, toolState] = useTool("select")

setTool("pen")
setTool("shape", { shapeType: "rectangle" })

// toolState has tool-specific data
// pen: { color, width }
// shape: { shapeType, fill, stroke }
```

### useRender

Sets up rendering loop for canvas.

```tsx
useRender(canvasRef, doc, camera, {
  onBeforeRender: (renderer) => {},
  onAfterRender: (renderer) => {},
})
```

Handles:

- Creating renderer from canvas
- Updating when doc/camera change
- RequestAnimationFrame loop
- Cleanup on unmount

### usePointerHandlers

Translates DOM events to canvas interactions.

```tsx
const handlers = usePointerHandlers({
  camera,
  cameraActions,
  doc,
  dispatch,
  tool,
  toolState,
})

return <canvas {...handlers} />
```

Returns `onPointerDown`, `onPointerMove`, `onPointerUp`, `onWheel` handlers that:

- Convert screen coords to world coords
- Apply current tool logic
- Update camera for pan/zoom
- Handle multi-touch

### useSpatialIndex

Maintains spatial index in sync with document.

```tsx
const spatialIndex = useSpatialIndex(doc)

// Query in event handlers
const hits = query_point_spatial_index(spatialIndex, worldX, worldY)
```

Updates automatically when document changes. Memoized to avoid rebuilding on every render.

### useSelection

Manages selection state.

```tsx
const [selection, selectionActions] = useSelection()

selectionActions.select(id)
selectionActions.toggle(id)
selectionActions.selectAll()
selectionActions.clear()

// selection.ids: Set<string>
// selection.bounds: rectangle | null
```

Selection is separate from document - it's view state.

## Convenience Component

For quick prototyping, a component that wires everything together:

```tsx
<Whiteboard
  initialDocument={doc}
  onDocumentChange={onDocChange}
  initialCamera={camera}
  onCameraChange={onCamChange}
  tools={["select", "pen", "shape", "eraser"]}
  initialTool="select"
/>
```

Internally uses all the hooks. For production, prefer hooks for control.

## Usage Patterns

### Minimal Setup

```tsx
function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [doc, dispatch] = useDocument(create_document())
  const [camera, cameraActions] = useCamera(create_camera(), { width: 800, height: 600 })

  useRender(canvasRef, doc, camera)
  const handlers = usePointerHandlers({ camera, cameraActions, doc, dispatch, tool: "select" })

  return <canvas ref={canvasRef} width={800} height={600} {...handlers} />
}
```

### With External State

```tsx
function App() {
  const doc = useSelector((state) => state.document)
  const dispatchRedux = useDispatch()

  const dispatch = useCallback(
    (action) => {
      dispatchRedux(documentSlice.actions.apply(action))
    },
    [dispatchRedux],
  )

  // ... rest same
}
```

### Custom Tools

```tsx
const customTools = {
  laser: {
    onPointerDown: (ctx) => {
      /* start laser */
    },
    onPointerMove: (ctx) => {
      /* update laser */
    },
    onPointerUp: (ctx) => {
      /* end laser */
    },
    render: (ctx, renderer) => {
      /* draw laser overlay */
    },
  },
}

const [tool, setTool] = useTool("select", customTools)
```

## File Structure

```
samcan-react/
  src/
    hooks/
      useDocument.ts
      useCamera.ts
      useTool.ts
      useRender.ts
      usePointerHandlers.ts
      useSpatialIndex.ts
      useSelection.ts
    components/
      Whiteboard.tsx
    tools/
      select.ts
      pen.ts
      shape.ts
      eraser.ts
    index.ts
  package.json  # peer dep on react + samcan
```

## Dependencies

- `samcan` - Core library (peer dependency)
- `react` - React (peer dependency)

No other dependencies. No state management library - works with any.

## Performance Notes

### Render Loop

The render hook uses `requestAnimationFrame`. It only renders when:

- Document changes (referential equality check)
- Camera changes
- Force render requested

This prevents unnecessary redraws. Camera pan during drag uses RAF directly, not React state, to avoid render-per-frame.

### Memoization

All hooks memoize appropriately:

- Action creators don't change identity
- Spatial index only rebuilds on document change
- Event handlers stable unless dependencies change

Use `React.memo` on components that receive document/camera to prevent re-renders.

### Large Documents

For 10k+ elements:

- Virtualize element list UI (only render visible in sidebar)
- Spatial index handles culling
- Don't store entire document in React state (use ref + forceUpdate)

## Open Questions

1. **Server components** - Can any of this work with React Server Components? Probably not, it's all client state.

2. **Concurrent mode** - Are there issues with concurrent rendering? The render loop is imperative (canvas), might conflict.

3. **Suspense for images** - Should image loading integrate with Suspense? Could show loading state while images load.

4. **State persistence** - Should hooks handle localStorage/IndexedDB persistence? Or leave to userland?

## Success Criteria

The React bindings are done when:

1. Basic whiteboard works with ~50 lines of user code
2. All core functionality is accessible via hooks
3. Integration with Redux/Zustand/etc works smoothly
4. Performance is good (no unnecessary re-renders)
5. TypeScript types are helpful and correct
