import type { editor } from "@/editor/types"
import { get_element_by_id_document, update_element_document } from "@/document/document"
import { element_type_shape, shape_type_arrow, shape_type_line } from "@/document/element"
import { clone_element_editor } from "@/editor/clone"

export function apply_line_endpoint_resize_editor(state: editor): boolean {
  if (state.drag_state === null || state.drag_state.kind !== "resize") {
    return false
  }
  if (state.drag_state.handle !== "start" && state.drag_state.handle !== "end") {
    return false
  }
  if (state.drag_state.resized_element_ids.length !== 1) {
    return false
  }

  const element_id = state.drag_state.resized_element_ids[0]
  if (element_id === undefined) {
    return false
  }
  const base = get_element_by_id_document(state.drag_state.base_document, element_id)
  if (base === null || base.type !== element_type_shape) {
    return false
  }
  if (base.shape_type !== shape_type_line && base.shape_type !== shape_type_arrow) {
    return false
  }

  const updated = clone_element_editor(base)
  const shape = updated.type === element_type_shape ? updated : null
  if (shape === null) {
    return false
  }
  if (shape.start_point === null) {
    shape.start_point = [shape.bounds[0], shape.bounds[1]]
  }
  if (shape.end_point === null) {
    shape.end_point = [shape.bounds[0] + shape.bounds[2], shape.bounds[1] + shape.bounds[3]]
  }
  if (state.drag_state.handle === "start") {
    shape.start_point = [state.drag_state.current_world[0], state.drag_state.current_world[1]]
  } else {
    shape.end_point = [state.drag_state.current_world[0], state.drag_state.current_world[1]]
  }
  shape.bounds = [
    Math.min(shape.start_point[0], shape.end_point[0]),
    Math.min(shape.start_point[1], shape.end_point[1]),
    Math.max(1, Math.abs(shape.end_point[0] - shape.start_point[0])),
    Math.max(1, Math.abs(shape.end_point[1] - shape.start_point[1])),
  ]
  state.engine.document = update_element_document(state.drag_state.base_document, element_id, shape)
  return true
}
