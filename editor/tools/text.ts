import type { editor_tool } from "@/editor/types"
import { add_element_document } from "@/document/document"
import { create_text_element } from "@/document/element"
import {
  begin_transaction_editor,
  cancel_transaction_editor,
  commit_transaction_editor,
} from "@/editor/history"
import { update_box_resize_editor } from "@/editor/ops"
import { snap_point_editor } from "@/editor/snap"
import { next_id_editor, next_z_index_editor } from "@/editor/shared"
import { default_text_color } from "@/editor/styles"
import { begin_text_edit_editor } from "@/editor/textedit"
import { editor_tool_text } from "@/editor/types"

export function create_text_tool_editor(): editor_tool {
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
      state.drag_state = { kind: "text", origin_world: [x, y], current_world: [x, y], element_id }
      state.pointer_capture = true
    },
    pointer_move: (state) => {
      if (state.drag_state === null || state.drag_state.kind !== "text") return
      state.drag_state.current_world = snap_point_editor(
        state,
        [state.pointer_world[0], state.pointer_world[1]],
        "text",
      )
      update_box_resize_editor(
        state,
        state.drag_state.element_id,
        state.drag_state.origin_world,
        state.drag_state.current_world,
      )
    },
    pointer_up: (state) => {
      if (state.drag_state?.kind === "text") {
        const element_id = state.drag_state.element_id
        commit_transaction_editor(state)
        begin_text_edit_editor(state, element_id)
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
