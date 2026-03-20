import type { engine } from "@/engine/types"
import type { editor_snapper } from "@/editor/snaptypes"
import type { vector2 } from "@/math/vector2"
import type { rectangle } from "@/math/rectangle"
import type { renderer } from "@/renderer/renderer"
import type { document } from "@/document/document"
import type { element } from "@/document/element"

export const editor_tool_select = 0
export const editor_tool_hand = 1
export const editor_tool_draw = 2
export const editor_tool_rectangle = 3
export const editor_tool_ellipse = 4
export const editor_tool_line = 5
export const editor_tool_arrow = 6
export const editor_tool_text = 7
export const editor_tool_image_place = 8
export type editor_tool_id = number | string

export type editor_pointer_input = {
  screen: vector2
  button?: number
  shift?: boolean
  alt?: boolean
  ctrl?: boolean
  meta?: boolean
}

export type editor_key_input = {
  key: string
  shift?: boolean
  alt?: boolean
  ctrl?: boolean
  meta?: boolean
  repeat?: boolean
}

export type editor_clipboard_payload = {
  elements: element[]
  anchor: vector2
}

export type editor_move_state = {
  kind: "move"
  origin_world: vector2
  current_world: vector2
  base_document: document
  moved_element_ids: string[]
}

export type editor_pending_move_state = {
  kind: "pending_move"
  origin_world: vector2
  origin_screen: vector2
  selected_element_ids: string[]
}

export type editor_resize_state = {
  kind: "resize"
  origin_world: vector2
  current_world: vector2
  base_document: document
  resized_element_ids: string[]
  selection_bounds: rectangle
  handle: string
  keep_aspect: boolean
  centered: boolean
}

export type editor_rotate_state = {
  kind: "rotate"
  origin_world: vector2
  current_world: vector2
  base_document: document
  rotated_element_ids: string[]
  selection_bounds: rectangle
  center: vector2
  start_angle: number
}

export type editor_marquee_state = {
  kind: "marquee"
  origin_world: vector2
  current_world: vector2
  add_mode: boolean
}

export type editor_pending_marquee_state = {
  kind: "pending_marquee"
  origin_world: vector2
  origin_screen: vector2
  add_mode: boolean
}

export type editor_pan_state = {
  kind: "pan"
  origin_screen: vector2
  current_screen: vector2
}

export type editor_shape_state = {
  kind: "shape"
  origin_world: vector2
  current_world: vector2
  element_id: string
  shape_tool: editor_tool_id
}

export type editor_text_state = {
  kind: "text"
  origin_world: vector2
  current_world: vector2
  element_id: string
}

export type editor_image_state = {
  kind: "image"
  origin_world: vector2
  current_world: vector2
  element_id: string
}

export type editor_draw_state = {
  kind: "draw"
  points: vector2[]
  pressure: number[]
}

export type editor_text_edit_state = {
  element_id: string
  draft: string
  original: string
  caret: number
  anchor: number | null
  preferred_column: number | null
}

export type editor_interaction_state =
  | editor_pending_move_state
  | editor_move_state
  | editor_resize_state
  | editor_rotate_state
  | editor_pending_marquee_state
  | editor_marquee_state
  | editor_pan_state
  | editor_shape_state
  | editor_text_state
  | editor_image_state
  | editor_draw_state

export type editor_transaction = {
  label: string
  before: document
}

export type editor_tool = {
  id: editor_tool_id
  name: string
  pointer_down: (state: editor, input: editor_pointer_input) => void
  pointer_move: (state: editor, input: editor_pointer_input) => void
  pointer_up: (state: editor, input: editor_pointer_input) => void
  double_click: (state: editor, input: editor_pointer_input) => void
  key_down: (state: editor, input: editor_key_input) => void
  cancel: (state: editor) => void
  hover: (state: editor, input: editor_pointer_input) => void
  cursor: (state: editor) => string
  overlay: (state: editor, drawer: renderer) => void
}

export type editor_plugin = {
  id: string
  tools: editor_tool[]
}

export type editor = {
  engine: engine
  current_tool: editor_tool_id
  previous_tool_before_hand: editor_tool_id | null
  selected_element_ids: Set<string>
  hovered_element_id: string | null
  active_handle: string | null
  pointer_capture: boolean
  drag_state: editor_interaction_state | null
  marquee_state: editor_marquee_state | null
  clipboard_payload: editor_clipboard_payload | null
  active_transaction: editor_transaction | null
  undo_stack: document[]
  redo_stack: document[]
  transient_guides: rectangle[]
  pointer_world: vector2
  pointer_screen: vector2
  has_pointer_input: boolean
  text_edit: editor_text_edit_state | null
  snappers: editor_snapper[]
  tools: Map<editor_tool_id, editor_tool>
  plugin_tools: Map<string, editor_tool_id[]>
  id_counter: number
}
