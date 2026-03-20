import type { draw_style } from "@/renderer/style"
import type { vector2 } from "@/math/vector2"
import type { rectangle } from "@/math/rectangle"
import type { element, shape_element } from "@/document/element"
import type { editor, editor_key_input, editor_pointer_input, editor_tool } from "@/editor/types"
import type { document } from "@/document/document"
import type { renderer } from "@/renderer/renderer"
import {
  add_element_document,
  clone_document,
  get_element_by_id_document,
  remove_element_document,
  update_element_document,
} from "@/document/document"
import {
  create_image_element,
  create_shape_element,
  create_stroke_element,
  create_text_element,
  element_type_shape,
  shape_type_arrow,
  shape_type_ellipse,
  shape_type_line,
  shape_type_rectangle,
} from "@/document/element"
import { element_at_point_document, elements_in_bounds_document } from "@/document/query"
import { pan_engine, screen_to_world_engine } from "@/engine/camera"
import { render_engine_with_overlay } from "@/engine/render"
import type { engine } from "@/engine/types"
import {
  editor_tool_arrow,
  editor_tool_draw,
  editor_tool_ellipse,
  editor_tool_hand,
  editor_tool_image_place,
  editor_tool_line,
  editor_tool_rectangle,
  editor_tool_select,
  editor_tool_text,
} from "@/editor/types"
import {
  begin_transaction_editor,
  cancel_transaction_editor,
  commit_transaction_editor,
  redo_editor,
  undo_editor,
} from "@/editor/history"
import { marquee_rectangle_editor, selection_bounds_editor } from "@/editor/selection"
import { create_spline } from "@/math/spline"
import { compute_stroke_bounds, process_stroke } from "@/stroke/process"
import { line_cap_round, line_join_round } from "@/renderer/style"

const overlay_selection_style: draw_style = {
  fill: [0.2, 0.5, 1, 0.15],
  stroke: [0.2, 0.5, 1, 0.95],
  stroke_width: 1,
  line_cap: line_cap_round,
  line_join: line_join_round,
  miter_limit: 10,
  alpha: 1,
}

const overlay_marquee_style: draw_style = {
  fill: [0.2, 0.5, 1, 0.07],
  stroke: [0.2, 0.5, 1, 0.7],
  stroke_width: 1,
  line_cap: line_cap_round,
  line_join: line_join_round,
  miter_limit: 10,
  alpha: 1,
}

const overlay_hover_style: draw_style = {
  fill: null,
  stroke: [0.2, 0.5, 1, 0.65],
  stroke_width: 1,
  line_cap: line_cap_round,
  line_join: line_join_round,
  miter_limit: 10,
  alpha: 1,
}

const default_shape_fill: [number, number, number, number] = [0.95, 0.95, 0.95, 1]
const default_shape_stroke: [number, number, number, number] = [0.15, 0.15, 0.15, 1]
const default_text_color: [number, number, number, number] = [0.1, 0.1, 0.1, 1]
const default_stroke_color: [number, number, number, number] = [0.1, 0.1, 0.1, 1]

type editor_options = {
  initial_tool?: number
}

export function create_editor(state: engine, options: editor_options = {}): editor {
  const current_tool = options.initial_tool ?? editor_tool_select
  const editor_state: editor = {
    engine: state,
    current_tool,
    previous_tool_before_hand: null,
    selected_element_ids: new Set(),
    hovered_element_id: null,
    active_handle: null,
    pointer_capture: false,
    drag_state: null,
    marquee_state: null,
    clipboard_payload: null,
    active_transaction: null,
    undo_stack: [],
    redo_stack: [],
    transient_guides: [],
    pointer_world: [0, 0],
    pointer_screen: [0, 0],
    tools: new Map(),
    id_counter: 0,
  }
  editor_state.tools = create_tool_registry_editor()
  return editor_state
}

export function render_editor(state: editor): void {
  render_engine_with_overlay(state.engine, (drawer) => {
    draw_editor_overlay(state, drawer)
    const tool = current_tool_impl_editor(state)
    tool.overlay(state, drawer)
  })
}

export function set_tool_editor(state: editor, tool: number): void {
  if (!state.tools.has(tool)) {
    return
  }
  if (state.current_tool === tool) {
    return
  }
  cancel_editor(state)
  state.current_tool = tool
}

export function cursor_editor(state: editor): string {
  const tool = current_tool_impl_editor(state)
  return tool.cursor(state)
}

export function pointer_down_editor(state: editor, input: editor_pointer_input): void {
  update_pointer_editor(state, input)
  const tool = current_tool_impl_editor(state)
  tool.pointer_down(state, input)
}

export function pointer_move_editor(state: editor, input: editor_pointer_input): void {
  update_pointer_editor(state, input)
  const tool = current_tool_impl_editor(state)
  tool.pointer_move(state, input)
}

export function pointer_up_editor(state: editor, input: editor_pointer_input): void {
  update_pointer_editor(state, input)
  const tool = current_tool_impl_editor(state)
  tool.pointer_up(state, input)
}

export function hover_editor(state: editor, input: editor_pointer_input): void {
  update_pointer_editor(state, input)
  const tool = current_tool_impl_editor(state)
  tool.hover(state, input)
}

export function double_click_editor(state: editor, input: editor_pointer_input): void {
  update_pointer_editor(state, input)
  const tool = current_tool_impl_editor(state)
  tool.double_click(state, input)
}

export function key_down_editor(state: editor, input: editor_key_input): void {
  if (handle_global_key_editor(state, input)) {
    return
  }
  const tool = current_tool_impl_editor(state)
  tool.key_down(state, input)
}

export function key_up_editor(state: editor, input: editor_key_input): void {
  if (normalize_key_editor(input.key) === " ") {
    if (state.previous_tool_before_hand !== null) {
      state.current_tool = state.previous_tool_before_hand
      state.previous_tool_before_hand = null
    }
  }
}

export function cancel_editor(state: editor): void {
  const tool = current_tool_impl_editor(state)
  tool.cancel(state)
}

export function copy_selection_editor(state: editor): boolean {
  const selected_ids = Array.from(state.selected_element_ids.values())
  if (selected_ids.length === 0) {
    return false
  }

  const payload_elements: element[] = []
  for (let i = 0; i < selected_ids.length; i = i + 1) {
    const id = selected_ids[i]
    if (id === undefined) {
      continue
    }
    const el = get_element_by_id_document(state.engine.document, id)
    if (el !== null) {
      payload_elements.push(clone_element_editor(el))
    }
  }

  if (payload_elements.length === 0) {
    return false
  }

  const bounds = selection_bounds_editor(state.engine.document, selected_ids)
  const anchor: vector2 =
    bounds === null
      ? [state.pointer_world[0], state.pointer_world[1]]
      : [bounds[0] + bounds[2] / 2, bounds[1] + bounds[3] / 2]
  state.clipboard_payload = {
    elements: payload_elements,
    anchor,
  }
  return true
}

export function cut_selection_editor(state: editor): boolean {
  if (!copy_selection_editor(state)) {
    return false
  }
  return delete_selection_editor(state)
}

export function paste_clipboard_editor(state: editor, world_anchor?: vector2): boolean {
  if (state.clipboard_payload === null || state.clipboard_payload.elements.length === 0) {
    return false
  }

  const anchor = world_anchor ?? [state.pointer_world[0], state.pointer_world[1]]
  const dx = anchor[0] - state.clipboard_payload.anchor[0] + 16
  const dy = anchor[1] - state.clipboard_payload.anchor[1] + 16

  begin_transaction_editor(state, "paste")
  const inserted = insert_elements_with_offset_editor(state, state.clipboard_payload.elements, dx, dy)
  if (!inserted) {
    cancel_transaction_editor(state)
    return false
  }
  commit_transaction_editor(state)
  return true
}

export function duplicate_selection_editor(state: editor): boolean {
  if (!copy_selection_editor(state)) {
    return false
  }
  return paste_clipboard_editor(state, state.pointer_world)
}

export function delete_selection_editor(state: editor): boolean {
  if (state.selected_element_ids.size === 0) {
    return false
  }

  begin_transaction_editor(state, "delete")
  const selected_ids = Array.from(state.selected_element_ids.values())
  let doc = state.engine.document
  for (let i = 0; i < selected_ids.length; i = i + 1) {
    const id = selected_ids[i]
    if (id !== undefined) {
      doc = remove_element_document(doc, id)
    }
  }
  state.engine.document = doc
  state.selected_element_ids.clear()
  commit_transaction_editor(state)
  return true
}

export function undo_action_editor(state: editor): boolean {
  const ok = undo_editor(state)
  if (ok) {
    cleanup_selection_editor(state)
  }
  return ok
}

export function redo_action_editor(state: editor): boolean {
  const ok = redo_editor(state)
  if (ok) {
    cleanup_selection_editor(state)
  }
  return ok
}

function draw_editor_overlay(state: editor, drawer: renderer): void {
  if (state.hovered_element_id !== null && !state.selected_element_ids.has(state.hovered_element_id)) {
    const hovered = get_element_by_id_document(state.engine.document, state.hovered_element_id)
    if (hovered !== null) {
      drawer.draw_rectangle(hovered.bounds, overlay_hover_style)
    }
  }

  const selected_ids = Array.from(state.selected_element_ids.values())
  const selection_bounds = selection_bounds_editor(state.engine.document, selected_ids)
  if (selection_bounds !== null) {
    drawer.draw_rectangle(selection_bounds, overlay_selection_style)
  }

  if (state.marquee_state !== null) {
    const marquee = marquee_rectangle_editor(
      state.marquee_state.origin_world[0],
      state.marquee_state.origin_world[1],
      state.marquee_state.current_world[0],
      state.marquee_state.current_world[1],
    )
    drawer.draw_rectangle(marquee, overlay_marquee_style)
  }

  for (let i = 0; i < state.transient_guides.length; i = i + 1) {
    const guide = state.transient_guides[i]
    if (guide !== undefined) {
      drawer.draw_rectangle(guide, overlay_hover_style)
    }
  }
}

function create_tool_registry_editor(): Map<number, editor_tool> {
  const tools = new Map<number, editor_tool>()
  tools.set(editor_tool_select, create_select_tool_editor())
  tools.set(editor_tool_hand, create_hand_tool_editor())
  tools.set(editor_tool_draw, create_draw_tool_editor())
  tools.set(editor_tool_rectangle, create_shape_tool_editor(editor_tool_rectangle))
  tools.set(editor_tool_ellipse, create_shape_tool_editor(editor_tool_ellipse))
  tools.set(editor_tool_line, create_shape_tool_editor(editor_tool_line))
  tools.set(editor_tool_arrow, create_shape_tool_editor(editor_tool_arrow))
  tools.set(editor_tool_text, create_text_tool_editor())
  tools.set(editor_tool_image_place, create_image_tool_editor())
  return tools
}

function create_select_tool_editor(): editor_tool {
  return {
    id: editor_tool_select,
    name: "select",
    pointer_down: (state, input) => {
      const hit = element_at_point_document(
        state.engine.document,
        state.pointer_world[0],
        state.pointer_world[1],
      )
      const is_shift = !!input.shift

      if (hit !== null) {
        if (is_shift) {
          if (state.selected_element_ids.has(hit.id)) {
            state.selected_element_ids.delete(hit.id)
          } else {
            state.selected_element_ids.add(hit.id)
          }
        } else {
          if (!state.selected_element_ids.has(hit.id) || state.selected_element_ids.size > 1) {
            state.selected_element_ids.clear()
            state.selected_element_ids.add(hit.id)
          }
        }

        const selected = Array.from(state.selected_element_ids.values())
        if (selected.length > 0) {
          begin_transaction_editor(state, "move")
          state.drag_state = {
            kind: "move",
            origin_world: [state.pointer_world[0], state.pointer_world[1]],
            current_world: [state.pointer_world[0], state.pointer_world[1]],
            base_document: clone_document(state.engine.document),
            moved_element_ids: selected,
          }
          state.pointer_capture = true
        }
        return
      }

      if (!is_shift) {
        state.selected_element_ids.clear()
      }

      const marquee_state = {
        kind: "marquee" as const,
        origin_world: [state.pointer_world[0], state.pointer_world[1]] as vector2,
        current_world: [state.pointer_world[0], state.pointer_world[1]] as vector2,
        add_mode: is_shift,
      }
      state.drag_state = marquee_state
      state.marquee_state = marquee_state
      state.pointer_capture = true
    },
    pointer_move: (state) => {
      if (state.drag_state === null) {
        update_hover_editor(state)
        return
      }

      if (state.drag_state.kind === "move") {
        state.drag_state.current_world = [state.pointer_world[0], state.pointer_world[1]]
        apply_move_drag_editor(state)
        return
      }

      if (state.drag_state.kind === "marquee") {
        state.drag_state.current_world = [state.pointer_world[0], state.pointer_world[1]]
        state.marquee_state = state.drag_state
      }
    },
    pointer_up: (state) => {
      if (state.drag_state === null) {
        state.pointer_capture = false
        return
      }

      if (state.drag_state.kind === "move") {
        commit_transaction_editor(state)
      }

      if (state.drag_state.kind === "marquee") {
        apply_marquee_selection_editor(state, state.drag_state)
      }

      state.drag_state = null
      state.marquee_state = null
      state.pointer_capture = false
    },
    double_click: () => {},
    key_down: () => {},
    cancel: (state) => {
      if (state.drag_state !== null && state.drag_state.kind === "move") {
        cancel_transaction_editor(state)
      }
      state.drag_state = null
      state.marquee_state = null
      state.pointer_capture = false
    },
    hover: (state) => {
      update_hover_editor(state)
    },
    cursor: (state) => {
      if (state.drag_state !== null && state.drag_state.kind === "move") {
        return "grabbing"
      }
      return "default"
    },
    overlay: () => {},
  }
}

function create_hand_tool_editor(): editor_tool {
  return {
    id: editor_tool_hand,
    name: "hand",
    pointer_down: (state) => {
      state.drag_state = {
        kind: "pan",
        origin_screen: [state.pointer_screen[0], state.pointer_screen[1]],
        current_screen: [state.pointer_screen[0], state.pointer_screen[1]],
      }
      state.pointer_capture = true
    },
    pointer_move: (state) => {
      if (state.drag_state === null || state.drag_state.kind !== "pan") {
        return
      }
      const dx_screen = state.pointer_screen[0] - state.drag_state.current_screen[0]
      const dy_screen = state.pointer_screen[1] - state.drag_state.current_screen[1]
      state.drag_state.current_screen = [state.pointer_screen[0], state.pointer_screen[1]]
      const zoom = Math.max(0.001, state.engine.camera[2])
      const dx_world = -dx_screen / zoom
      const dy_world = -dy_screen / zoom
      pan_engine(state.engine, dx_world, dy_world)
    },
    pointer_up: (state) => {
      state.drag_state = null
      state.pointer_capture = false
    },
    double_click: () => {},
    key_down: () => {},
    cancel: (state) => {
      state.drag_state = null
      state.pointer_capture = false
    },
    hover: () => {},
    cursor: () => "grab",
    overlay: () => {},
  }
}

function create_draw_tool_editor(): editor_tool {
  return {
    id: editor_tool_draw,
    name: "draw",
    pointer_down: (state) => {
      begin_transaction_editor(state, "draw")
      state.drag_state = {
        kind: "draw",
        points: [[state.pointer_world[0], state.pointer_world[1]]],
        pressure: [1],
      }
      state.pointer_capture = true
    },
    pointer_move: (state) => {
      if (state.drag_state === null || state.drag_state.kind !== "draw") {
        return
      }
      state.drag_state.points.push([state.pointer_world[0], state.pointer_world[1]])
      state.drag_state.pressure.push(1)
    },
    pointer_up: (state) => {
      if (state.drag_state !== null && state.drag_state.kind === "draw") {
        insert_drawn_stroke_editor(state, state.drag_state.points, state.drag_state.pressure)
        commit_transaction_editor(state)
      }
      state.drag_state = null
      state.pointer_capture = false
    },
    double_click: () => {},
    key_down: () => {},
    cancel: (state) => {
      cancel_transaction_editor(state)
      state.drag_state = null
      state.pointer_capture = false
    },
    hover: () => {},
    cursor: () => "crosshair",
    overlay: (state, drawer) => {
      if (state.drag_state === null || state.drag_state.kind !== "draw") {
        return
      }
      if (state.drag_state.points.length > 1) {
        drawer.draw_polyline(state.drag_state.points, overlay_hover_style)
      }
    },
  }
}

function create_shape_tool_editor(tool: number): editor_tool {
  return {
    id: tool,
    name: shape_tool_name_editor(tool),
    pointer_down: (state) => {
      begin_transaction_editor(state, "shape")
      const element_id = next_id_editor(state, "shape")
      const shape_type = shape_type_for_tool_editor(tool)
      const start = [state.pointer_world[0], state.pointer_world[1]] as vector2
      const shape = create_shape_element(
        element_id,
        [start[0], start[1], 1, 1],
        next_z_index_editor(state.engine.document),
        state.engine.document.active_layer_id,
        shape_type,
        default_shape_fill,
        default_shape_stroke,
        1.5,
        shape_type === shape_type_rectangle || shape_type === shape_type_ellipse ? null : start,
        shape_type === shape_type_rectangle || shape_type === shape_type_ellipse ? null : start,
      )
      state.engine.document = add_element_document(state.engine.document, shape)
      state.selected_element_ids.clear()
      state.selected_element_ids.add(element_id)
      state.drag_state = {
        kind: "shape",
        origin_world: [start[0], start[1]],
        current_world: [start[0], start[1]],
        element_id,
        shape_tool: tool,
      }
      state.pointer_capture = true
    },
    pointer_move: (state, input) => {
      if (state.drag_state === null || state.drag_state.kind !== "shape") {
        return
      }
      state.drag_state.current_world = [state.pointer_world[0], state.pointer_world[1]]
      const keep_square = !!input.shift
      update_shape_preview_editor(state, state.drag_state, keep_square)
    },
    pointer_up: (state) => {
      if (state.drag_state !== null && state.drag_state.kind === "shape") {
        commit_transaction_editor(state)
      }
      state.drag_state = null
      state.pointer_capture = false
    },
    double_click: () => {},
    key_down: () => {},
    cancel: (state) => {
      cancel_transaction_editor(state)
      state.drag_state = null
      state.pointer_capture = false
    },
    hover: () => {},
    cursor: () => "crosshair",
    overlay: () => {},
  }
}

function create_text_tool_editor(): editor_tool {
  return {
    id: editor_tool_text,
    name: "text",
    pointer_down: (state) => {
      begin_transaction_editor(state, "text")
      const element_id = next_id_editor(state, "text")
      const x = state.pointer_world[0]
      const y = state.pointer_world[1]
      const text = create_text_element(
        element_id,
        [x, y, 220, 40],
        next_z_index_editor(state.engine.document),
        state.engine.document.active_layer_id,
        "Text",
        "sans-serif",
        18,
        default_text_color,
        0,
      )
      state.engine.document = add_element_document(state.engine.document, text)
      state.selected_element_ids.clear()
      state.selected_element_ids.add(element_id)
      state.drag_state = {
        kind: "text",
        origin_world: [x, y],
        current_world: [x, y],
        element_id,
      }
      state.pointer_capture = true
    },
    pointer_move: (state) => {
      if (state.drag_state === null || state.drag_state.kind !== "text") {
        return
      }
      state.drag_state.current_world = [state.pointer_world[0], state.pointer_world[1]]
      update_box_resize_editor(state, state.drag_state.element_id, state.drag_state.origin_world, state.drag_state.current_world)
    },
    pointer_up: (state) => {
      if (state.drag_state !== null && state.drag_state.kind === "text") {
        commit_transaction_editor(state)
      }
      state.drag_state = null
      state.pointer_capture = false
    },
    double_click: () => {},
    key_down: () => {},
    cancel: (state) => {
      cancel_transaction_editor(state)
      state.drag_state = null
      state.pointer_capture = false
    },
    hover: () => {},
    cursor: () => "text",
    overlay: () => {},
  }
}

function create_image_tool_editor(): editor_tool {
  return {
    id: editor_tool_image_place,
    name: "image_place",
    pointer_down: (state) => {
      begin_transaction_editor(state, "image")
      const element_id = next_id_editor(state, "image")
      const x = state.pointer_world[0]
      const y = state.pointer_world[1]
      const image = create_image_element(
        element_id,
        [x, y, 220, 140],
        next_z_index_editor(state.engine.document),
        state.engine.document.active_layer_id,
        "",
        0,
        0,
        1,
      )
      state.engine.document = add_element_document(state.engine.document, image)
      state.selected_element_ids.clear()
      state.selected_element_ids.add(element_id)
      state.drag_state = {
        kind: "image",
        origin_world: [x, y],
        current_world: [x, y],
        element_id,
      }
      state.pointer_capture = true
    },
    pointer_move: (state) => {
      if (state.drag_state === null || state.drag_state.kind !== "image") {
        return
      }
      state.drag_state.current_world = [state.pointer_world[0], state.pointer_world[1]]
      update_box_resize_editor(state, state.drag_state.element_id, state.drag_state.origin_world, state.drag_state.current_world)
    },
    pointer_up: (state) => {
      if (state.drag_state !== null && state.drag_state.kind === "image") {
        commit_transaction_editor(state)
      }
      state.drag_state = null
      state.pointer_capture = false
    },
    double_click: () => {},
    key_down: () => {},
    cancel: (state) => {
      cancel_transaction_editor(state)
      state.drag_state = null
      state.pointer_capture = false
    },
    hover: () => {},
    cursor: () => "copy",
    overlay: () => {},
  }
}

function current_tool_impl_editor(state: editor): editor_tool {
  return state.tools.get(state.current_tool) ?? state.tools.get(editor_tool_select)!
}

function update_pointer_editor(state: editor, input: editor_pointer_input): void {
  state.pointer_screen[0] = input.screen[0]
  state.pointer_screen[1] = input.screen[1]
  screen_to_world_engine(state.engine, input.screen, state.pointer_world)
}

function handle_global_key_editor(state: editor, input: editor_key_input): boolean {
  const normalized = normalize_key_editor(input.key)
  const mod = !!input.meta || !!input.ctrl

  if (mod && normalized === "z" && !input.shift) {
    undo_action_editor(state)
    return true
  }

  if ((mod && normalized === "y") || (mod && normalized === "z" && !!input.shift)) {
    redo_action_editor(state)
    return true
  }

  if (mod && normalized === "c") {
    copy_selection_editor(state)
    return true
  }

  if (mod && normalized === "x") {
    cut_selection_editor(state)
    return true
  }

  if (mod && normalized === "v") {
    paste_clipboard_editor(state)
    return true
  }

  if (mod && normalized === "d") {
    duplicate_selection_editor(state)
    return true
  }

  if (normalized === "delete" || normalized === "backspace") {
    delete_selection_editor(state)
    return true
  }

  if (normalized === "escape") {
    cancel_editor(state)
    return true
  }

  if (normalized === " ") {
    if (state.current_tool !== editor_tool_hand) {
      state.previous_tool_before_hand = state.current_tool
      state.current_tool = editor_tool_hand
    }
    return true
  }

  if (normalized === "v") {
    set_tool_editor(state, editor_tool_select)
    return true
  }
  if (normalized === "h") {
    set_tool_editor(state, editor_tool_hand)
    return true
  }
  if (normalized === "p") {
    set_tool_editor(state, editor_tool_draw)
    return true
  }
  if (normalized === "r") {
    set_tool_editor(state, editor_tool_rectangle)
    return true
  }
  if (normalized === "e") {
    set_tool_editor(state, editor_tool_ellipse)
    return true
  }
  if (normalized === "l") {
    set_tool_editor(state, editor_tool_line)
    return true
  }
  if (normalized === "a") {
    set_tool_editor(state, editor_tool_arrow)
    return true
  }
  if (normalized === "t") {
    set_tool_editor(state, editor_tool_text)
    return true
  }
  if (normalized === "i") {
    set_tool_editor(state, editor_tool_image_place)
    return true
  }

  return false
}

function normalize_key_editor(key: string): string {
  if (key.length === 1) {
    return key.toLowerCase()
  }
  return key.toLowerCase()
}

function update_hover_editor(state: editor): void {
  const hit = element_at_point_document(
    state.engine.document,
    state.pointer_world[0],
    state.pointer_world[1],
  )
  state.hovered_element_id = hit?.id ?? null
}

function apply_move_drag_editor(state: editor): void {
  if (state.drag_state === null || state.drag_state.kind !== "move") {
    return
  }

  const dx = state.drag_state.current_world[0] - state.drag_state.origin_world[0]
  const dy = state.drag_state.current_world[1] - state.drag_state.origin_world[1]
  let doc = state.drag_state.base_document
  for (let i = 0; i < state.drag_state.moved_element_ids.length; i = i + 1) {
    const id = state.drag_state.moved_element_ids[i]
    if (id === undefined) {
      continue
    }
    const base_element = get_element_by_id_document(state.drag_state.base_document, id)
    if (base_element === null) {
      continue
    }
    const moved = move_element_editor(base_element, dx, dy)
    doc = update_element_document(doc, id, moved)
  }
  state.engine.document = doc
}

function move_element_editor(el: element, dx: number, dy: number): element {
  const moved = clone_element_editor(el)
  moved.bounds = [el.bounds[0] + dx, el.bounds[1] + dy, el.bounds[2], el.bounds[3]]

  if (moved.type === element_type_shape) {
    const shape = moved as shape_element
    if (shape.start_point !== null) {
      shape.start_point = [shape.start_point[0] + dx, shape.start_point[1] + dy]
    }
    if (shape.end_point !== null) {
      shape.end_point = [shape.end_point[0] + dx, shape.end_point[1] + dy]
    }
  }

  return moved
}

function apply_marquee_selection_editor(
  state: editor,
  marquee_state: { origin_world: vector2; current_world: vector2; add_mode: boolean },
): void {
  const rect = marquee_rectangle_editor(
    marquee_state.origin_world[0],
    marquee_state.origin_world[1],
    marquee_state.current_world[0],
    marquee_state.current_world[1],
  )
  if (!marquee_state.add_mode) {
    state.selected_element_ids.clear()
  }
  const in_bounds = elements_in_bounds_document(state.engine.document, rect)
  for (let i = 0; i < in_bounds.length; i = i + 1) {
    const el = in_bounds[i]
    if (el !== undefined) {
      state.selected_element_ids.add(el.id)
    }
  }
}

function update_shape_preview_editor(
  state: editor,
  drag_state: { origin_world: vector2; current_world: vector2; element_id: string; shape_tool: number },
  keep_square: boolean,
): void {
  const el = get_element_by_id_document(state.engine.document, drag_state.element_id)
  if (el === null || el.type !== element_type_shape) {
    return
  }

  const rect = rectangle_from_points_editor(drag_state.origin_world, drag_state.current_world, keep_square)
  const shape = clone_element_editor(el) as shape_element
  shape.bounds = rect
  if (shape.shape_type === shape_type_line || shape.shape_type === shape_type_arrow) {
    shape.start_point = [drag_state.origin_world[0], drag_state.origin_world[1]]
    shape.end_point = [drag_state.current_world[0], drag_state.current_world[1]]
  }
  state.engine.document = update_element_document(state.engine.document, el.id, shape)
}

function update_box_resize_editor(
  state: editor,
  element_id: string,
  origin_world: vector2,
  current_world: vector2,
): void {
  const el = get_element_by_id_document(state.engine.document, element_id)
  if (el === null) {
    return
  }

  const rect = rectangle_from_points_editor(origin_world, current_world, false)
  const updated = clone_element_editor(el)
  updated.bounds = [rect[0], rect[1], Math.max(rect[2], 2), Math.max(rect[3], 2)]
  state.engine.document = update_element_document(state.engine.document, element_id, updated)
}

function insert_drawn_stroke_editor(state: editor, points: vector2[], pressure: number[]): void {
  if (points.length === 0) {
    return
  }

  const simplified_out: vector2[] = Array.from({ length: points.length }, () => [0, 0] as vector2)
  const spline = create_spline()
  const processed = process_stroke(points, pressure, {
    color: default_stroke_color,
    width: 2,
    opacity: 1,
    pressure_sensitivity: 0.5,
  }, simplified_out, spline)
  const stroke_bounds: rectangle = [0, 0, 0, 0]
  compute_stroke_bounds(points, 2, stroke_bounds)

  const element_id = next_id_editor(state, "stroke")
  const stroke = create_stroke_element(
    element_id,
    stroke_bounds,
    next_z_index_editor(state.engine.document),
    state.engine.document.active_layer_id,
    points,
    pressure,
    default_stroke_color,
    2,
  )
  stroke.simplified_points = processed.simplified
  stroke.spline = processed.spline
  state.engine.document = add_element_document(state.engine.document, stroke)
  state.selected_element_ids.clear()
  state.selected_element_ids.add(element_id)
}

function clone_element_editor(el: element): element {
  if (el.type === element_type_shape) {
    const shape = el as shape_element
    return {
      ...shape,
      bounds: [shape.bounds[0], shape.bounds[1], shape.bounds[2], shape.bounds[3]],
      fill_color:
        shape.fill_color === null
          ? null
          : [shape.fill_color[0], shape.fill_color[1], shape.fill_color[2], shape.fill_color[3]],
      stroke_color:
        shape.stroke_color === null
          ? null
          : [
              shape.stroke_color[0],
              shape.stroke_color[1],
              shape.stroke_color[2],
              shape.stroke_color[3],
            ],
      start_point: shape.start_point === null ? null : [shape.start_point[0], shape.start_point[1]],
      end_point: shape.end_point === null ? null : [shape.end_point[0], shape.end_point[1]],
    }
  }

  if ("points" in el) {
    const stroke = el as any
    return {
      ...stroke,
      bounds: [stroke.bounds[0], stroke.bounds[1], stroke.bounds[2], stroke.bounds[3]],
      points: stroke.points.map((p: vector2) => [p[0], p[1]]),
      pressure: stroke.pressure === null ? null : [...stroke.pressure],
      color: [stroke.color[0], stroke.color[1], stroke.color[2], stroke.color[3]],
      simplified_points:
        stroke.simplified_points === null
          ? null
          : stroke.simplified_points.map((p: vector2) => [p[0], p[1]]),
      spline: stroke.spline,
    }
  }

  if ("src" in el) {
    const image = el as any
    return {
      ...image,
      bounds: [image.bounds[0], image.bounds[1], image.bounds[2], image.bounds[3]],
    }
  }

  const text = el as any
  return {
    ...text,
    bounds: [text.bounds[0], text.bounds[1], text.bounds[2], text.bounds[3]],
    color: [text.color[0], text.color[1], text.color[2], text.color[3]],
  }
}

function insert_elements_with_offset_editor(
  state: editor,
  elements: readonly element[],
  dx: number,
  dy: number,
): boolean {
  if (elements.length === 0) {
    return false
  }

  const id_map = new Map<string, string>()
  for (let i = 0; i < elements.length; i = i + 1) {
    const item = elements[i]
    if (item !== undefined) {
      id_map.set(item.id, next_id_editor(state, "el"))
    }
  }

  let doc = state.engine.document
  state.selected_element_ids.clear()
  for (let i = 0; i < elements.length; i = i + 1) {
    const item = elements[i]
    if (item === undefined) {
      continue
    }
    const clone = move_element_editor(item, dx, dy)
    const new_id = id_map.get(item.id)
    if (new_id === undefined) {
      continue
    }
    ;(clone as any).id = new_id
    ;(clone as any).z_index = next_z_index_editor(doc)
    doc = add_element_document(doc, clone)
    state.selected_element_ids.add(new_id)
  }

  state.engine.document = doc
  return true
}

function shape_type_for_tool_editor(tool: number): number {
  if (tool === editor_tool_rectangle) {
    return shape_type_rectangle
  }
  if (tool === editor_tool_ellipse) {
    return shape_type_ellipse
  }
  if (tool === editor_tool_line) {
    return shape_type_line
  }
  return shape_type_arrow
}

function shape_tool_name_editor(tool: number): string {
  if (tool === editor_tool_rectangle) {
    return "rectangle"
  }
  if (tool === editor_tool_ellipse) {
    return "ellipse"
  }
  if (tool === editor_tool_line) {
    return "line"
  }
  if (tool === editor_tool_arrow) {
    return "arrow"
  }
  return "shape"
}

function rectangle_from_points_editor(a: vector2, b: vector2, keep_square: boolean): rectangle {
  const x1 = a[0]
  const y1 = a[1]
  let x2 = b[0]
  let y2 = b[1]

  if (keep_square) {
    const dx = x2 - x1
    const dy = y2 - y1
    const size = Math.max(Math.abs(dx), Math.abs(dy))
    x2 = x1 + Math.sign(dx || 1) * size
    y2 = y1 + Math.sign(dy || 1) * size
  }

  const x = Math.min(x1, x2)
  const y = Math.min(y1, y2)
  const width = Math.max(1, Math.abs(x2 - x1))
  const height = Math.max(1, Math.abs(y2 - y1))
  return [x, y, width, height]
}

function next_id_editor(state: editor, prefix: string): string {
  state.id_counter = state.id_counter + 1
  return `${prefix}_${Date.now()}_${state.id_counter}`
}

function next_z_index_editor(doc: document): number {
  let max = -1
  for (const item of doc.elements.values()) {
    if (item.z_index > max) {
      max = item.z_index
    }
  }
  return max + 1
}

function cleanup_selection_editor(state: editor): void {
  const ids = Array.from(state.selected_element_ids.values())
  for (let i = 0; i < ids.length; i = i + 1) {
    const id = ids[i]
    if (id === undefined) {
      continue
    }
    if (get_element_by_id_document(state.engine.document, id) === null) {
      state.selected_element_ids.delete(id)
    }
  }
}

