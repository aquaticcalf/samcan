# Input Layer

## Problem Statement

User input comes from many sources:

- Mouse (click, drag, scroll)
- Touch (tap, drag, pinch)
- Stylus (pressure, tilt, buttons)
- Keyboard (shortcuts, modifiers)

Each has different event types, coordinate systems, and capabilities. We need a unified abstraction that:

1. Normalizes input across sources
2. Provides consistent coordinates (world space)
3. Handles gestures (pan, zoom, draw)
4. Supports pressure and tilt for styluses

## Design Decisions

### Why abstract over pointer events?

Browser has:

- `MouseEvent` - mouse only
- `TouchEvent` - touch only
- `PointerEvent` - unified, modern

We use `PointerEvent` as the base but still abstract because:

1. **Coordinate conversion** - Need world coords, not screen
2. **Gesture recognition** - Pinch-zoom, two-finger pan
3. **Pressure normalization** - Pressure values vary by device
4. **State tracking** - Track active pointers, drag state

### Why track pointer state ourselves?

The browser tells us "pointer moved to (x, y)" but we often need:

- Is this pointer dragging?
- Where did the drag start?
- How far has it moved?
- What buttons are pressed?

Tracking state ourselves lets us answer these without re-querying the DOM.

```typescript
type pointer_state = {
  id: number
  type: "mouse" | "touch" | "pen"
  position: vector2 // current world position
  start_position: vector2 // where drag started
  pressure: number // 0-1
  tilt: vector2 // stylus tilt
  buttons: number // button bitmask
  is_dragging: boolean
  is_primary: boolean
}
```

### Why separate raw events from gestures?

Raw events: individual pointer actions
Gestures: high-level interactions from one or more pointers

```
Raw events → Gesture recognizer → Gesture callbacks

pointerdown + pointermove + pointerup → "drag" gesture
two pointers moving apart → "pinch-zoom" gesture
quick tap → "tap" gesture
```

This separation allows:

1. Same raw events can produce different gestures (depending on tool)
2. Gestures can be composed (drag + pinch = pan-zoom)
3. Tool system hooks into gesture level, not raw events

### Why provide both levels?

Some tools need raw events (pen tool needs every point). Some need gestures (select tool needs drag rectangle). Providing both:

```typescript
type input_handler = {
  // Raw events
  on_pointer_down?: (state: pointer_state) => void
  on_pointer_move?: (state: pointer_state) => void
  on_pointer_up?: (state: pointer_state) => void

  // Gestures
  on_tap?: (position: vector2) => void
  on_drag_start?: (position: vector2) => void
  on_drag?: (start: vector2, current: vector2, delta: vector2) => void
  on_drag_end?: (start: vector2, end: vector2) => void
  on_pinch?: (center: vector2, scale: number, rotation: number) => void
}
```

Tools implement what they need.

### Why handle keyboard separately?

Keyboard modifiers (shift, ctrl, alt) affect pointer behavior:

- Shift + drag = constrain to axis
- Ctrl + click = add to selection
- Space + drag = pan (hand tool)

We track modifier state globally and include it in pointer state:

```typescript
type modifier_state = {
  shift: boolean
  ctrl: boolean
  alt: boolean
  meta: boolean
  space: boolean
}

type pointer_state = {
  // ...
  modifiers: modifier_state
}
```

Keyboard shortcuts (Ctrl+Z for undo) are separate - they trigger commands, not affect pointer behavior.

### Why pressure normalization?

Pressure values vary:

- Most devices: 0-1 range
- Some tablets: different sensitivity curves
- Mouse: always 0.5 (no pressure)
- Touch: varies by device

We normalize to 0-1 and optionally apply a response curve:

```typescript
function normalize_pressure(raw: number, device_type: string): number {
  if (device_type === "mouse") return default_mouse_pressure
  return apply_pressure_curve(raw, pressure_curve)
}
```

Users can configure the pressure curve (linear, ease-in, ease-out, S-curve).

### Why predict pointer position?

Stylus input has latency. The hardware samples at intervals, OS processes, browser delivers event. By the time we get the event, the physical stylus is ahead.

Prediction uses velocity to estimate where the pointer is now:

```typescript
function predict_position(history: pointer_state[], look_ahead_ms: number): vector2
```

This reduces perceived latency for drawing. It can cause overshooting, so we use modest prediction (8-16ms).

## Event Flow

```
DOM PointerEvent
    ↓
capture_pointer_event(event, camera) → pointer_state
    ↓
update_pointer_history(state)
    ↓
detect_gestures(history) → gesture[]
    ↓
invoke handler callbacks
```

### Coordinate Conversion

Every pointer position goes through:

```
screen coords (from event.clientX/Y)
    ↓
canvas coords (subtract canvas offset)
    ↓
world coords (apply inverse view transform)
```

Tools always receive world coordinates.

### Gesture Detection

Gestures are detected from pointer history:

**Tap**: pointerdown → pointerup with minimal movement, short duration

**Drag**: pointerdown → pointermove with movement > threshold

**Pinch**: two pointers, distance changing

**Rotate**: two pointers, angle changing (often combined with pinch)

## Multi-touch Handling

Single pointer is simple. Multiple pointers require:

1. **Pointer tracking** - Map of pointer ID to state
2. **Primary detection** - Which pointer is "primary" for tool
3. **Gesture combination** - Two pointers can zoom AND pan simultaneously

Our approach:

- First pointer is primary (gets raw events)
- Two pointers trigger pinch-zoom (camera gesture)
- Three+ pointers ignored

Tools can opt out of multi-touch:

```typescript
type tool_config = {
  allow_multi_touch: boolean // false = ignore non-primary
}
```

## Types

```typescript
type pointer_type = "mouse" | "touch" | "pen"

type pointer_state = {
  readonly id: number
  readonly type: pointer_type
  readonly position: vector2
  readonly start_position: vector2
  readonly delta: vector2
  readonly pressure: number
  readonly tilt: vector2
  readonly buttons: number
  readonly modifiers: modifier_state
  readonly is_dragging: boolean
  readonly is_primary: boolean
  readonly timestamp: number
}

type modifier_state = {
  readonly shift: boolean
  readonly ctrl: boolean
  readonly alt: boolean
  readonly meta: boolean
  readonly space: boolean
}

type gesture =
  | { type: "tap"; position: vector2 }
  | { type: "drag_start"; position: vector2 }
  | { type: "drag"; start: vector2; current: vector2; delta: vector2 }
  | { type: "drag_end"; start: vector2; end: vector2 }
  | { type: "pinch"; center: vector2; scale: number; rotation: number }

type input_config = {
  readonly drag_threshold: number
  readonly tap_duration_ms: number
  readonly pressure_curve: "linear" | "ease_in" | "ease_out" | "s_curve"
  readonly predict_position: boolean
  readonly prediction_ms: number
}

type input_state = {
  readonly pointers: Map<number, pointer_state>
  readonly modifiers: modifier_state
  readonly history: pointer_state[]
  readonly config: input_config
}
```

## Functions

### State Management

```typescript
function create_input_state(config?: Partial<input_config>): input_state
function update_input_state_pointer_down(
  state: input_state,
  event: PointerEvent,
  camera: camera_state,
): input_state
function update_input_state_pointer_move(
  state: input_state,
  event: PointerEvent,
  camera: camera_state,
): input_state
function update_input_state_pointer_up(state: input_state, event: PointerEvent): input_state
function update_input_state_key(
  state: input_state,
  event: KeyboardEvent,
  is_down: boolean,
): input_state
```

### Queries

```typescript
function get_primary_pointer(state: input_state): pointer_state | null
function get_pointer_count(state: input_state): number
function is_dragging(state: input_state): boolean
function get_drag_delta(state: input_state): vector2 | null
```

### Gesture Detection

```typescript
function detect_gestures(state: input_state): gesture[]
function is_tap(state: input_state, pointer_id: number): boolean
function get_pinch_info(
  state: input_state,
): { center: vector2; scale: number; rotation: number } | null
```

### Coordinate Conversion

```typescript
function screen_to_canvas(event: PointerEvent, canvas: HTMLCanvasElement): vector2
function canvas_to_world(canvas_pos: vector2, camera: camera_state): vector2
function event_to_world(
  event: PointerEvent,
  canvas: HTMLCanvasElement,
  camera: camera_state,
): vector2
```

### Utilities

```typescript
function normalize_pressure(raw: number, curve: string): number
function predict_pointer_position(
  history: pointer_state[],
  look_ahead_ms: number,
  out: vector2,
): vector2
function get_velocity(history: pointer_state[], out: vector2): vector2
```

## File Structure

```
input/
  types.ts         # pointer_state, gesture, input_config
  state.ts         # Input state management
  events.ts        # DOM event handlers
  gestures.ts      # Gesture detection
  coords.ts        # Coordinate conversion
  pressure.ts      # Pressure normalization and curves
  predict.ts       # Position prediction
```

## Integration

### With React Bindings

```tsx
function usePointerHandlers(camera, doc, dispatch, tool) {
  const inputState = useRef(create_input_state())

  const onPointerDown = useCallback(
    (e) => {
      inputState.current = update_input_state_pointer_down(inputState.current, e, camera)
      const gestures = detect_gestures(inputState.current)
      // invoke tool handlers
    },
    [camera, tool],
  )

  // ... similar for move/up
}
```

### With Tools

Tools receive processed input:

```typescript
type tool = {
  on_pointer_down?: (pointer: pointer_state, doc: document, dispatch: dispatch) => void
  on_gesture?: (gesture: gesture, doc: document, dispatch: dispatch) => void
}
```

Tools don't handle raw DOM events or coordinate conversion - that's done for them.

## Platform Considerations

### Touch Behavior

- Prevent default to disable scroll/zoom (when on canvas)
- Handle `touchAction: "none"` in CSS
- Safari quirks with pointer events

### Stylus Detection

```typescript
function is_stylus(state: pointer_state): boolean {
  return state.type === "pen" || state.pressure !== 0.5
}
```

Mouse pressure is always 0.5. Non-0.5 pressure usually means stylus.

### High-frequency Input

Some devices report 120Hz+ input. Options:

1. Process every event (most accurate)
2. Throttle to 60Hz (reduce CPU)
3. Batch events per animation frame

We process every event but render at 60fps.

## Open Questions

1. **Palm rejection** - Should we detect and ignore palm touches? This is hard without OS support.

2. **Hover events** - Stylus can hover without touching. Do we need hover tracking for preview?

3. **Button mapping** - Stylus buttons, middle mouse button. What do they do?

4. **Touch drawing** - Can finger be used to draw, or only stylus? Configurable?

## Success Criteria

The input layer is done when:

1. Mouse, touch, and stylus all work correctly
2. Coordinates are accurate (click on element = hit)
3. Pressure sensitivity works smoothly
4. Pinch-zoom is responsive
5. No jank from too many events
