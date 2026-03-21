import type { editor_tool, editor_tool_id } from "@/editor/types"
import { add_element_document } from "@/document/document"
import {
  create_shape_element,
  shape_type_ellipse,
  shape_type_frame,
  shape_type_rectangle,
} from "@/document/element"
import {
  begin_transaction_editor,
  cancel_transaction_editor,
  commit_transaction_editor,
} from "@/editor/history"
import { update_shape_preview_editor } from "@/editor/ops"
import { snap_point_editor } from "@/editor/snap"
import {
  next_id_editor,
  next_z_index_editor,
  shape_name_for_tool_editor,
  shape_type_for_tool_editor,
} from "@/editor/shared"
import { default_shape_fill, default_shape_stroke } from "@/editor/styles"

export function create_shape_tool_editor(tool: editor_tool_id): editor_tool {
  return {
    id: tool,
    name: shape_name_for_tool_editor(tool),
    pointer_down: (state) => {
      begin_transaction_editor(state, shape_name_for_tool_editor(tool))
      const element_id = next_id_editor(state, "shape")
      const shape_type = shape_type_for_tool_editor(tool)
      const start: [number, number] = [state.pointer_world[0], state.pointer_world[1]]
      const is_box =
        shape_type === shape_type_rectangle ||
        shape_type === shape_type_ellipse ||
        shape_type === shape_type_frame
      const fill = shape_type === shape_type_frame ? null : default_shape_fill
      const shape = create_shape_element(
        element_id,
        [start[0], start[1], 1, 1],
        next_z_index_editor(state.engine.document),
        state.engine.document.active_layer_id,
        shape_type,
        fill,
        default_shape_stroke,
        1.5,
        is_box ? null : start,
        is_box ? null : start,
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
      if (state.drag_state === null || state.drag_state.kind !== "shape") return
      state.drag_state.current_world = snap_point_editor(
        state,
        [state.pointer_world[0], state.pointer_world[1]],
        "shape",
      )
      update_shape_preview_editor(state, state.drag_state, !!input.shift)
    },
    pointer_up: (state) => {
      if (state.drag_state?.kind === "shape") commit_transaction_editor(state)
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
