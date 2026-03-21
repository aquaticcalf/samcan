import type { editor_tool } from "@/editor/types"
import {
  begin_transaction_editor,
  cancel_transaction_editor,
  commit_transaction_editor,
} from "@/editor/history"
import { insert_drawn_stroke_editor } from "@/editor/ops"
import { overlay_hover_style } from "@/editor/styles"
import { editor_tool_draw } from "@/editor/types"

export function create_draw_tool_editor(): editor_tool {
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
      if (state.drag_state === null || state.drag_state.kind !== "draw") return
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
      if (state.drag_state?.kind === "draw" && state.drag_state.points.length > 1) {
        drawer.draw_polyline(state.drag_state.points, overlay_hover_style)
      }
    },
  }
}
