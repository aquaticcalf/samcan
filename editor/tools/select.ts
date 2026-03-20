import type { editor_tool } from "@/editor/types"
import { clone_document } from "@/document/document"
import { element_type_text } from "@/document/element"
import { hit_selection_handles_editor, selection_handles_for_elements_editor } from "@/editor/hit"
import { element_hit_at_point_editor } from "@/editor/hittest"
import { cancel_transaction_editor, begin_transaction_editor, commit_transaction_editor } from "@/editor/history"
import { selection_bounds_editor } from "@/editor/selection"
import { editor_tool_select } from "@/editor/types"
import { update_select_hover_editor } from "@/editor/shared"
import { begin_text_edit_editor } from "@/editor/textedit"
import {
  apply_marquee_selection_editor,
  apply_move_drag_editor,
  apply_resize_drag_editor,
  apply_rotate_drag_editor,
  start_move_editor,
} from "@/editor/tools/selectops"

export function create_select_tool_editor(): editor_tool {
  return {
    id: editor_tool_select,
    name: "select",
    pointer_down: (state, input) => {
      const selected_ids = Array.from(state.selected_element_ids.values())
      const selected_bounds = selection_bounds_editor(state.engine.document, selected_ids)
      const handles = selection_handles_for_elements_editor(state.engine.document, selected_ids)
      const handle_hit = hit_selection_handles_editor(handles, state.pointer_world)
      if (handle_hit !== null) {
        state.active_handle = handle_hit.id
        begin_transaction_editor(state, handle_hit.id === "rotate" ? "rotate" : "resize")
        if (handle_hit.id === "rotate") {
          const center: [number, number] = [
            selected_bounds![0] + selected_bounds![2] / 2,
            selected_bounds![1] + selected_bounds![3] / 2,
          ]
          state.drag_state = {
            kind: "rotate",
            origin_world: [state.pointer_world[0], state.pointer_world[1]],
            current_world: [state.pointer_world[0], state.pointer_world[1]],
            base_document: clone_document(state.engine.document),
            rotated_element_ids: selected_ids,
            selection_bounds: [selected_bounds![0], selected_bounds![1], selected_bounds![2], selected_bounds![3]],
            center,
            start_angle: Math.atan2(state.pointer_world[1] - center[1], state.pointer_world[0] - center[0]),
          }
        } else {
          state.drag_state = {
            kind: "resize",
            origin_world: [state.pointer_world[0], state.pointer_world[1]],
            current_world: [state.pointer_world[0], state.pointer_world[1]],
            base_document: clone_document(state.engine.document),
            resized_element_ids: selected_ids,
            selection_bounds: [selected_bounds![0], selected_bounds![1], selected_bounds![2], selected_bounds![3]],
            handle: handle_hit.id,
            keep_aspect: false,
            centered: false,
          }
        }
        state.pointer_capture = true
        return
      }

      const hit = element_hit_at_point_editor(
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
        } else if (!state.selected_element_ids.has(hit.id) || state.selected_element_ids.size > 1) {
          state.selected_element_ids.clear()
          state.selected_element_ids.add(hit.id)
        }
        const selected = Array.from(state.selected_element_ids.values())
        if (selected.length > 0) {
          begin_transaction_editor(state, "move")
          start_move_editor(state, selected)
        }
        return
      }

      if (!is_shift) state.selected_element_ids.clear()
      const marquee_state = {
        kind: "marquee" as const,
        origin_world: [state.pointer_world[0], state.pointer_world[1]] as [number, number],
        current_world: [state.pointer_world[0], state.pointer_world[1]] as [number, number],
        add_mode: is_shift,
      }
      state.drag_state = marquee_state
      state.marquee_state = marquee_state
      state.pointer_capture = true
    },
    pointer_move: (state, input) => {
      if (state.drag_state === null) return update_select_hover_editor(state)
      if (state.drag_state.kind === "move") {
        state.drag_state.current_world = [state.pointer_world[0], state.pointer_world[1]]
        return apply_move_drag_editor(state)
      }
      if (state.drag_state.kind === "resize") {
        state.drag_state.current_world = [state.pointer_world[0], state.pointer_world[1]]
        state.drag_state.keep_aspect = !!input.shift
        state.drag_state.centered = !!input.alt
        return apply_resize_drag_editor(state)
      }
      if (state.drag_state.kind === "rotate") {
        state.drag_state.current_world = [state.pointer_world[0], state.pointer_world[1]]
        return apply_rotate_drag_editor(state)
      }
      if (state.drag_state.kind === "marquee") {
        state.drag_state.current_world = [state.pointer_world[0], state.pointer_world[1]]
        state.marquee_state = state.drag_state
      }
    },
    pointer_up: (state) => {
      if (state.drag_state !== null && state.drag_state.kind !== "marquee") commit_transaction_editor(state)
      if (state.drag_state !== null && state.drag_state.kind === "marquee") {
        apply_marquee_selection_editor(state, state.drag_state)
      }
      state.drag_state = null
      state.marquee_state = null
      state.active_handle = null
      state.pointer_capture = false
    },
    double_click: (state) => {
      const hit = element_hit_at_point_editor(
        state.engine.document,
        state.pointer_world[0],
        state.pointer_world[1],
      )
      if (hit !== null && hit.type === element_type_text) {
        begin_text_edit_editor(state, hit.id)
      }
    },
    key_down: () => {},
    cancel: (state) => {
      if (
        state.drag_state !== null &&
        (state.drag_state.kind === "move" || state.drag_state.kind === "resize" || state.drag_state.kind === "rotate")
      ) cancel_transaction_editor(state)
      state.drag_state = null
      state.marquee_state = null
      state.active_handle = null
      state.pointer_capture = false
    },
    hover: (state) => update_select_hover_editor(state),
    cursor: (state) => {
      if (state.drag_state?.kind === "move") return "grabbing"
      if (state.drag_state?.kind === "resize") return "nwse-resize"
      if (state.drag_state?.kind === "rotate") return "crosshair"
      if (state.active_handle === "rotate") return "crosshair"
      if (state.active_handle === "start" || state.active_handle === "end") return "crosshair"
      if (["nw", "se", "ne", "sw"].includes(state.active_handle ?? "")) return "nwse-resize"
      if (["n", "s"].includes(state.active_handle ?? "")) return "ns-resize"
      if (["e", "w"].includes(state.active_handle ?? "")) return "ew-resize"
      return "default"
    },
    overlay: () => {},
  }
}
