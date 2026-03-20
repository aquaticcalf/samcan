import type { editor } from "@/editor/types"
import { element_type_text } from "@/document/element"
import { element_hit_at_point_editor } from "@/editor/hittest"
import { begin_text_edit_editor } from "@/editor/textedit"

export function handle_select_double_click_editor(state: editor): void {
  const hit = element_hit_at_point_editor(state.engine.document, state.pointer_world[0], state.pointer_world[1])
  if (hit !== null && hit.type === element_type_text) {
    begin_text_edit_editor(state, hit.id)
  }
}

export function handle_select_pointer_up_reset_editor(state: editor): void {
  state.drag_state = null
  state.marquee_state = null
  state.active_handle = null
  state.pointer_capture = false
}

export function cursor_select_editor(state: editor): string {
  if (state.drag_state?.kind === "move") return "grabbing"
  if (state.drag_state?.kind === "pending_move") return "grab"
  if (state.drag_state?.kind === "resize") return "nwse-resize"
  if (state.drag_state?.kind === "rotate") return "crosshair"
  if (state.active_handle === "rotate") return "crosshair"
  if (state.active_handle === "start" || state.active_handle === "end") return "crosshair"
  if (["nw", "se", "ne", "sw"].includes(state.active_handle ?? "")) return "nwse-resize"
  if (["n", "s"].includes(state.active_handle ?? "")) return "ns-resize"
  if (["e", "w"].includes(state.active_handle ?? "")) return "ew-resize"
  return "default"
}

