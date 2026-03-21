import type { editor } from "@/editor/types"
import type { vector2 } from "@/math/vector2"
import type { element } from "@/document/element"
import { clone_document } from "@/document/document"
import { elements_in_bounds_document } from "@/document/query"
import { element_type_shape, shape_type_frame } from "@/document/element"
import { marquee_rectangle_editor, selection_bounds_editor } from "@/editor/selection"
import { expand_ids_with_groups_editor } from "@/editor/shared"
import { angle_to_center_editor, transform_elements_editor } from "@/editor/transform"
import { apply_line_endpoint_resize_editor } from "@/editor/tools/lineresize"

const drag_threshold_screen_editor = 4

export function start_move_editor(state: editor, ids: string[]): void {
  const expanded_ids = expand_move_ids_for_frames_editor(state.engine.document.elements, ids)
  const selection_bounds = selection_bounds_editor(state.engine.document, expanded_ids) ?? [
    0, 0, 1, 1,
  ]
  state.drag_state = {
    kind: "move",
    origin_world: [state.pointer_world[0], state.pointer_world[1]],
    current_world: [state.pointer_world[0], state.pointer_world[1]],
    base_document: clone_document(state.engine.document),
    moved_element_ids: expanded_ids,
    selection_bounds,
  }
  state.pointer_capture = true
}

export function exceeds_drag_threshold_editor(origin: vector2, current: vector2): boolean {
  const dx = current[0] - origin[0]
  const dy = current[1] - origin[1]
  return dx * dx + dy * dy >= drag_threshold_screen_editor * drag_threshold_screen_editor
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
  const hit_ids: string[] = []
  for (let i = 0; i < in_bounds.length; i = i + 1) {
    const el = in_bounds[i]
    if (el !== undefined) hit_ids.push(el.id)
  }
  const expanded = expand_ids_with_groups_editor(state.engine.document, hit_ids)
  for (let i = 0; i < expanded.length; i = i + 1) {
    const id = expanded[i]
    if (id !== undefined) state.selected_element_ids.add(id)
  }
}

export function apply_resize_drag_editor(state: editor): void {
  if (state.drag_state === null || state.drag_state.kind !== "resize") return
  if (apply_line_endpoint_resize_editor(state)) return
  const base = state.drag_state.selection_bounds
  const left = base[0]
  const right = base[0] + base[2]
  const top = base[1]
  const bottom = base[1] + base[3]
  const width = Math.max(1e-4, right - left)
  const height = Math.max(1e-4, bottom - top)
  const c = state.drag_state.current_world
  const handle = state.drag_state.handle
  const centered = state.drag_state.centered
  const keep_aspect = state.drag_state.keep_aspect
  const anchor_x = centered
    ? left + width / 2
    : handle.includes("w")
      ? right
      : handle.includes("e")
        ? left
        : left + width / 2
  const anchor_y = centered
    ? top + height / 2
    : handle.includes("n")
      ? bottom
      : handle.includes("s")
        ? top
        : top + height / 2

  let sx = 1
  let sy = 1
  if (handle.includes("w"))
    sx = centered ? (Math.abs(c[0] - anchor_x) * 2) / width : (right - c[0]) / width
  if (handle.includes("e"))
    sx = centered ? (Math.abs(c[0] - anchor_x) * 2) / width : (c[0] - left) / width
  if (handle.includes("n"))
    sy = centered ? (Math.abs(c[1] - anchor_y) * 2) / height : (bottom - c[1]) / height
  if (handle.includes("s"))
    sy = centered ? (Math.abs(c[1] - anchor_y) * 2) / height : (c[1] - top) / height
  sx = Math.max(1e-4, sx)
  sy = Math.max(1e-4, sy)

  if (keep_aspect) {
    const has_x = handle.includes("w") || handle.includes("e")
    const has_y = handle.includes("n") || handle.includes("s")
    const scale = !has_y ? sx : !has_x ? sy : Math.max(sx, sy)
    sx = scale
    sy = scale
  }

  const nl = anchor_x - (anchor_x - left) * sx
  const nt = anchor_y - (anchor_y - top) * sy
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
  let delta = current_angle - state.drag_state.start_angle
  if (state.drag_state.snap_angle) {
    const snap = Math.PI / 12
    delta = Math.round(delta / snap) * snap
  }
  const sin_angle = Math.sin(delta)
  const cos_angle = Math.cos(delta)
  state.engine.document = transform_elements_editor(
    state.drag_state.base_document,
    state.drag_state.rotated_element_ids,
    (point) => {
      const dx = point[0] - center[0]
      const dy = point[1] - center[1]
      return [
        center[0] + dx * cos_angle - dy * sin_angle,
        center[1] + dx * sin_angle + dy * cos_angle,
      ]
    },
  )
}

function expand_move_ids_for_frames_editor(
  elements: Map<string, element>,
  selected_ids: readonly string[],
): string[] {
  const out = new Set<string>()
  const selected_frames: element[] = []

  for (let i = 0; i < selected_ids.length; i = i + 1) {
    const id = selected_ids[i]
    if (id === undefined) continue
    const element = elements.get(id)
    if (element === undefined) continue
    out.add(id)
    if (element.type === element_type_shape && element.shape_type === shape_type_frame) {
      selected_frames.push(element)
    }
  }
  if (selected_frames.length === 0) {
    return Array.from(out)
  }

  for (const element of elements.values()) {
    if (out.has(element.id)) continue
    const cx = element.bounds[0] + element.bounds[2] / 2
    const cy = element.bounds[1] + element.bounds[3] / 2
    for (let i = 0; i < selected_frames.length; i = i + 1) {
      const frame = selected_frames[i]
      if (frame === undefined) continue
      if (contains_point_in_bounds_editor(frame.bounds, cx, cy)) {
        out.add(element.id)
        break
      }
    }
  }

  return Array.from(out)
}

function contains_point_in_bounds_editor(
  bounds: [number, number, number, number],
  x: number,
  y: number,
): boolean {
  return (
    x >= bounds[0] && x <= bounds[0] + bounds[2] && y >= bounds[1] && y <= bounds[1] + bounds[3]
  )
}
