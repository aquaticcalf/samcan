import type { editor } from "@/editor/types"
import type { vector2 } from "@/math/vector2"
import { clone_document } from "@/document/document"
import { elements_in_bounds_document } from "@/document/query"
import { marquee_rectangle_editor } from "@/editor/selection"
import {
  angle_to_center_editor,
  transform_elements_editor,
} from "@/editor/transform"

export function start_move_editor(state: editor, ids: string[]): void {
  state.drag_state = {
    kind: "move",
    origin_world: [state.pointer_world[0], state.pointer_world[1]],
    current_world: [state.pointer_world[0], state.pointer_world[1]],
    base_document: clone_document(state.engine.document),
    moved_element_ids: ids,
  }
  state.pointer_capture = true
}

export function apply_move_drag_editor(state: editor): void {
  if (state.drag_state === null || state.drag_state.kind !== "move") return
  const dx = state.drag_state.current_world[0] - state.drag_state.origin_world[0]
  const dy = state.drag_state.current_world[1] - state.drag_state.origin_world[1]
  state.engine.document = transform_elements_editor(
    state.drag_state.base_document,
    state.drag_state.moved_element_ids,
    (point) => [point[0] + dx, point[1] + dy],
  )
}

export function apply_marquee_selection_editor(
  state: editor,
  marquee_state: { origin_world: vector2; current_world: vector2; add_mode: boolean },
): void {
  const rect = marquee_rectangle_editor(
    marquee_state.origin_world[0],
    marquee_state.origin_world[1],
    marquee_state.current_world[0],
    marquee_state.current_world[1],
  )
  if (!marquee_state.add_mode) state.selected_element_ids.clear()
  const in_bounds = elements_in_bounds_document(state.engine.document, rect)
  for (let i = 0; i < in_bounds.length; i = i + 1) {
    const el = in_bounds[i]
    if (el !== undefined) state.selected_element_ids.add(el.id)
  }
}

export function apply_resize_drag_editor(state: editor): void {
  if (state.drag_state === null || state.drag_state.kind !== "resize") return
  const base = state.drag_state.selection_bounds
  const left = base[0]
  const right = base[0] + base[2]
  const top = base[1]
  const bottom = base[1] + base[3]
  const c = state.drag_state.current_world
  const x1 = state.drag_state.handle.includes("w") ? c[0] : left
  const x2 = state.drag_state.handle.includes("e") ? c[0] : right
  const y1 = state.drag_state.handle.includes("n") ? c[1] : top
  const y2 = state.drag_state.handle.includes("s") ? c[1] : bottom
  const nl = Math.min(x1, x2)
  const nr = Math.max(x1, x2)
  const nt = Math.min(y1, y2)
  const nb = Math.max(y1, y2)
  const sx = Math.max(1e-4, (nr - nl) / Math.max(1e-4, right - left))
  const sy = Math.max(1e-4, (nb - nt) / Math.max(1e-4, bottom - top))
  state.engine.document = transform_elements_editor(
    state.drag_state.base_document,
    state.drag_state.resized_element_ids,
    (point) => [nl + (point[0] - left) * sx, nt + (point[1] - top) * sy],
  )
}

export function apply_rotate_drag_editor(state: editor): void {
  if (state.drag_state === null || state.drag_state.kind !== "rotate") return
  const center = state.drag_state.center
  const current_angle = angle_to_center_editor(center, state.drag_state.current_world)
  const delta = current_angle - state.drag_state.start_angle
  const sin_angle = Math.sin(delta)
  const cos_angle = Math.cos(delta)
  state.engine.document = transform_elements_editor(
    state.drag_state.base_document,
    state.drag_state.rotated_element_ids,
    (point) => {
      const dx = point[0] - center[0]
      const dy = point[1] - center[1]
      return [center[0] + dx * cos_angle - dy * sin_angle, center[1] + dx * sin_angle + dy * cos_angle]
    },
  )
}

