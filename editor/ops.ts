import type { document } from "@/document/document"
import type { element, shape_element } from "@/document/element"
import type { editor } from "@/editor/types"
import type { rectangle } from "@/math/rectangle"
import type { vector2 } from "@/math/vector2"
import {
  add_element_document,
  get_element_by_id_document,
  update_element_document,
} from "@/document/document"
import {
  create_stroke_element,
  element_type_shape,
  shape_type_arrow,
  shape_type_line,
} from "@/document/element"
import { clone_element_editor } from "@/editor/clone"
import { move_element_editor } from "@/editor/transform"
import { default_stroke_color } from "@/editor/styles"
import { create_spline } from "@/math/spline"
import { compute_stroke_bounds, process_stroke } from "@/stroke/process"
import { next_id_editor, next_z_index_editor, rectangle_from_points_editor } from "@/editor/shared"

export function update_shape_preview_editor(
  state: editor,
  drag_state: { origin_world: vector2; current_world: vector2; element_id: string },
  keep_square: boolean,
): void {
  const el = get_element_by_id_document(state.engine.document, drag_state.element_id)
  if (el === null || el.type !== element_type_shape) return
  const rect = rectangle_from_points_editor(drag_state.origin_world, drag_state.current_world, keep_square)
  const shape = clone_element_editor(el) as shape_element
  shape.bounds = rect
  if (shape.shape_type === shape_type_line || shape.shape_type === shape_type_arrow) {
    const constrained = keep_square
      ? constrain_line_angle_editor(drag_state.origin_world, drag_state.current_world)
      : [drag_state.current_world[0], drag_state.current_world[1]] as vector2
    const end_x = constrained[0]
    const end_y = constrained[1]
    if (end_x === undefined || end_y === undefined) {
      return
    }
    shape.start_point = [drag_state.origin_world[0], drag_state.origin_world[1]]
    shape.end_point = [end_x, end_y]
    const end_point = shape.end_point
    shape.bounds = [
      Math.min(shape.start_point[0], end_point[0]),
      Math.min(shape.start_point[1], end_point[1]),
      Math.max(1, Math.abs(end_point[0] - shape.start_point[0])),
      Math.max(1, Math.abs(end_point[1] - shape.start_point[1])),
    ]
  }
  state.engine.document = update_element_document(state.engine.document, el.id, shape)
}

function constrain_line_angle_editor(origin: vector2, target: vector2): vector2 {
  const dx = target[0] - origin[0]
  const dy = target[1] - origin[1]
  const length = Math.hypot(dx, dy)
  if (length === 0) {
    return [target[0], target[1]]
  }
  const angle = Math.atan2(dy, dx)
  const snap = Math.PI / 4
  const snapped = Math.round(angle / snap) * snap
  return [origin[0] + Math.cos(snapped) * length, origin[1] + Math.sin(snapped) * length]
}

export function update_box_resize_editor(
  state: editor,
  element_id: string,
  origin_world: vector2,
  current_world: vector2,
): void {
  const el = get_element_by_id_document(state.engine.document, element_id)
  if (el === null) return
  const rect = rectangle_from_points_editor(origin_world, current_world, false)
  const updated = clone_element_editor(el)
  updated.bounds = [rect[0], rect[1], Math.max(rect[2], 2), Math.max(rect[3], 2)]
  state.engine.document = update_element_document(state.engine.document, element_id, updated)
}

export function insert_drawn_stroke_editor(state: editor, points: vector2[], pressure: number[]): void {
  if (points.length === 0) return
  const simplified_out: vector2[] = Array.from({ length: points.length }, () => [0, 0] as vector2)
  const spline = create_spline()
  const processed = process_stroke(points, pressure, {
    color: default_stroke_color,
    width: 2,
    opacity: 1,
    pressure_sensitivity: 0.5,
  }, simplified_out, spline)
  const stroke_bounds: rectangle = [0, 0, 0, 0]
  compute_stroke_bounds(points, 2, stroke_bounds)
  const element_id = next_id_editor(state, "stroke")
  const stroke = create_stroke_element(
    element_id,
    stroke_bounds,
    next_z_index_editor(state.engine.document),
    state.engine.document.active_layer_id,
    points,
    pressure,
    default_stroke_color,
    2,
  )
  stroke.simplified_points = processed.simplified
  stroke.spline = processed.spline
  state.engine.document = add_element_document(state.engine.document, stroke)
  state.selected_element_ids.clear()
  state.selected_element_ids.add(element_id)
}

export function insert_elements_with_offset_editor(
  state: editor,
  elements: readonly element[],
  dx: number,
  dy: number,
): boolean {
  if (elements.length === 0) return false
  const id_map = new Map<string, string>()
  for (let i = 0; i < elements.length; i = i + 1) {
    const item = elements[i]
    if (item !== undefined) id_map.set(item.id, next_id_editor(state, "el"))
  }
  let doc: document = state.engine.document
  state.selected_element_ids.clear()
  for (let i = 0; i < elements.length; i = i + 1) {
    const item = elements[i]
    if (item === undefined) continue
    const clone = move_element_editor(item, dx, dy)
    const new_id = id_map.get(item.id)
    if (new_id === undefined) continue
    clone.id = new_id
    clone.z_index = next_z_index_editor(doc)
    doc = add_element_document(doc, clone)
    state.selected_element_ids.add(new_id)
  }
  state.engine.document = doc
  return true
}
