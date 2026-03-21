import type { editor_tool } from "@/editor/types"
import { clone_document } from "@/document/document"
import { hit_selection_handles_editor, selection_handles_for_elements_editor } from "@/editor/hit"
import { element_hit_at_point_editor } from "@/editor/hittest"
import {
  cancel_transaction_editor,
  begin_transaction_editor,
  commit_transaction_editor,
} from "@/editor/history"
import { selection_bounds_editor } from "@/editor/selection"
import { editor_tool_select } from "@/editor/types"
import {
  expand_ids_with_groups_editor,
  grouped_ids_for_element_editor,
  update_select_hover_editor,
} from "@/editor/shared"
import { snap_point_editor } from "@/editor/snap"
import {
  apply_marquee_selection_editor,
  apply_move_drag_editor,
  apply_resize_drag_editor,
  apply_rotate_drag_editor,
  exceeds_drag_threshold_editor,
  start_move_editor,
} from "@/editor/tools/selectops"
import {
  cursor_select_editor,
  handle_select_double_click_editor,
  handle_select_pointer_up_reset_editor,
} from "@/editor/tools/selectview"

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
            selection_bounds: [
              selected_bounds![0],
              selected_bounds![1],
              selected_bounds![2],
              selected_bounds![3],
            ],
            center,
            start_angle: Math.atan2(
              state.pointer_world[1] - center[1],
              state.pointer_world[0] - center[0],
            ),
            snap_angle: false,
          }
        } else {
          state.drag_state = {
            kind: "resize",
            origin_world: [state.pointer_world[0], state.pointer_world[1]],
            current_world: [state.pointer_world[0], state.pointer_world[1]],
            base_document: clone_document(state.engine.document),
            resized_element_ids: selected_ids,
            selection_bounds: [
              selected_bounds![0],
              selected_bounds![1],
              selected_bounds![2],
              selected_bounds![3],
            ],
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
        const hit_ids = grouped_ids_for_element_editor(state.engine.document, hit.id)
        if (is_shift) {
          const all_selected = hit_ids.every((id) => state.selected_element_ids.has(id))
          for (let i = 0; i < hit_ids.length; i = i + 1) {
            const id = hit_ids[i]
            if (id === undefined) continue
            if (all_selected) state.selected_element_ids.delete(id)
            else state.selected_element_ids.add(id)
          }
        } else if (
          !state.selected_element_ids.has(hit.id) ||
          state.selected_element_ids.size > hit_ids.length
        ) {
          state.selected_element_ids.clear()
          for (let i = 0; i < hit_ids.length; i = i + 1) {
            const id = hit_ids[i]
            if (id !== undefined) state.selected_element_ids.add(id)
          }
        }
        const selected = expand_ids_with_groups_editor(
          state.engine.document,
          Array.from(state.selected_element_ids.values()),
        )
        if (selected.length > 0) {
          state.drag_state = {
            kind: "pending_move",
            origin_world: [state.pointer_world[0], state.pointer_world[1]],
            origin_screen: [state.pointer_screen[0], state.pointer_screen[1]],
            selected_element_ids: selected,
          }
          state.pointer_capture = true
        }
        return
      }

      if (!is_shift) state.selected_element_ids.clear()
      state.drag_state = {
        kind: "pending_marquee",
        origin_world: [state.pointer_world[0], state.pointer_world[1]] as [number, number],
        origin_screen: [state.pointer_screen[0], state.pointer_screen[1]] as [number, number],
        add_mode: is_shift,
      }
      state.pointer_capture = true
    },
    pointer_move: (state, input) => {
      if (state.drag_state === null) return update_select_hover_editor(state)
      if (state.drag_state.kind === "pending_move") {
        const should_start = exceeds_drag_threshold_editor(
          state.drag_state.origin_screen,
          state.pointer_screen,
        )
        if (!should_start) {
          return
        }
        begin_transaction_editor(state, "move")
        start_move_editor(state, state.drag_state.selected_element_ids)
      }
      if (state.drag_state.kind === "pending_marquee") {
        const should_start = exceeds_drag_threshold_editor(
          state.drag_state.origin_screen,
          state.pointer_screen,
        )
        if (!should_start) {
          return
        }
        const marquee_state = {
          kind: "marquee" as const,
          origin_world: [state.drag_state.origin_world[0], state.drag_state.origin_world[1]] as [
            number,
            number,
          ],
          current_world: [state.pointer_world[0], state.pointer_world[1]] as [number, number],
          add_mode: state.drag_state.add_mode,
        }
        state.drag_state = marquee_state
        state.marquee_state = marquee_state
      }
      if (state.drag_state.kind === "move") {
        const raw: [number, number] = [state.pointer_world[0], state.pointer_world[1]]
        const dx = raw[0] - state.drag_state.origin_world[0]
        const dy = raw[1] - state.drag_state.origin_world[1]
        const b = state.drag_state.selection_bounds
        state.drag_state.current_world = snap_point_editor(state, raw, "move", {
          subject_bounds: [b[0] + dx, b[1] + dy, b[2], b[3]],
        })
        return apply_move_drag_editor(state)
      }
      if (state.drag_state.kind === "resize") {
        state.drag_state.current_world = snap_point_editor(
          state,
          [state.pointer_world[0], state.pointer_world[1]],
          "resize",
        )
        state.drag_state.keep_aspect = !!input.shift
        state.drag_state.centered = !!input.alt
        return apply_resize_drag_editor(state)
      }
      if (state.drag_state.kind === "rotate") {
        state.drag_state.current_world = [state.pointer_world[0], state.pointer_world[1]]
        state.drag_state.snap_angle = !!input.shift
        return apply_rotate_drag_editor(state)
      }
      if (state.drag_state.kind === "marquee") {
        state.drag_state.current_world = [state.pointer_world[0], state.pointer_world[1]]
        state.marquee_state = state.drag_state
      }
    },
    pointer_up: (state) => {
      if (
        state.drag_state !== null &&
        (state.drag_state.kind === "pending_move" || state.drag_state.kind === "pending_marquee")
      ) {
        handle_select_pointer_up_reset_editor(state)
        return
      }
      if (state.drag_state !== null && state.drag_state.kind !== "marquee")
        commit_transaction_editor(state)
      if (state.drag_state !== null && state.drag_state.kind === "marquee") {
        apply_marquee_selection_editor(state, state.drag_state)
      }
      handle_select_pointer_up_reset_editor(state)
    },
    double_click: (state) => handle_select_double_click_editor(state),
    key_down: () => {},
    cancel: (state) => {
      if (
        state.drag_state !== null &&
        (state.drag_state.kind === "move" ||
          state.drag_state.kind === "resize" ||
          state.drag_state.kind === "rotate")
      )
        cancel_transaction_editor(state)
      state.drag_state = null
      state.marquee_state = null
      state.active_handle = null
      state.pointer_capture = false
    },
    hover: (state) => update_select_hover_editor(state),
    cursor: (state) => cursor_select_editor(state),
    overlay: () => {},
  }
}
