import type { editor_tool } from "@/editor/types"
import { add_element_document } from "@/document/document"
import { create_image_element } from "@/document/element"
import {
  begin_transaction_editor,
  cancel_transaction_editor,
  commit_transaction_editor,
} from "@/editor/history"
import { update_box_resize_editor } from "@/editor/ops"
import { snap_point_editor } from "@/editor/snap"
import { next_id_editor, next_z_index_editor } from "@/editor/shared"
import { editor_tool_image_place } from "@/editor/types"

export function create_image_tool_editor(): editor_tool {
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
      state.drag_state = { kind: "image", origin_world: [x, y], current_world: [x, y], element_id }
      state.pointer_capture = true
    },
    pointer_move: (state) => {
      if (state.drag_state === null || state.drag_state.kind !== "image") return
      state.drag_state.current_world = snap_point_editor(
        state,
        [state.pointer_world[0], state.pointer_world[1]],
        "image",
      )
      update_box_resize_editor(
        state,
        state.drag_state.element_id,
        state.drag_state.origin_world,
        state.drag_state.current_world,
      )
    },
    pointer_up: (state) => {
      if (state.drag_state?.kind === "image") commit_transaction_editor(state)
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
