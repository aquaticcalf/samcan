import type { document } from "@/document/document"
import type { element, shape_element } from "@/document/element"
import type { rectangle } from "@/math/rectangle"
import type { vector2 } from "@/math/vector2"
import { get_element_by_id_document } from "@/document/document"
import {
  element_type_image,
  element_type_shape,
  element_type_text,
  shape_type_arrow,
  shape_type_line,
} from "@/document/element"
import { selection_bounds_editor } from "@/editor/selection"

export type selection_handle = {
  id: string
  bounds: rectangle
}

const handle_size = 10
const rotate_offset = 28

export function selection_handles_editor(bounds: rectangle): selection_handle[] {
  return box_handles_editor(bounds, true)
}

export function selection_handles_for_elements_editor(
  doc: document,
  selected_ids: readonly string[],
): selection_handle[] {
  const bounds = selection_bounds_editor(doc, selected_ids)
  if (bounds === null) {
    return []
  }
  if (selected_ids.length !== 1) {
    return box_handles_editor(bounds, true)
  }
  const id = selected_ids[0]
  if (id === undefined) {
    return box_handles_editor(bounds, true)
  }
  const element = get_element_by_id_document(doc, id)
  if (element === null) {
    return box_handles_editor(bounds, true)
  }
  return element_specific_handles_editor(element, bounds)
}

function element_specific_handles_editor(element: element, bounds: rectangle): selection_handle[] {
  if (element.type === element_type_shape) {
    const shape = element as shape_element
    if (shape.shape_type === shape_type_line || shape.shape_type === shape_type_arrow) {
      const start = shape.start_point ?? [bounds[0], bounds[1]]
      const end = shape.end_point ?? [bounds[0] + bounds[2], bounds[1] + bounds[3]]
      return [
        point_handle_editor("start", start[0], start[1]),
        point_handle_editor("end", end[0], end[1]),
      ]
    }
    return box_handles_editor(bounds, true)
  }
  if (element.type === element_type_image) {
    return box_handles_editor(bounds, false, ["nw", "ne", "se", "sw"])
  }
  if (element.type === element_type_text) {
    return box_handles_editor(bounds, false, ["w", "e"])
  }
  return box_handles_editor(bounds, true)
}

function box_handles_editor(
  bounds: rectangle,
  include_rotate: boolean,
  ids?: string[],
): selection_handle[] {
  const x = bounds[0]
  const y = bounds[1]
  const w = bounds[2]
  const h = bounds[3]
  const cx = x + w / 2
  const cy = y + h / 2
  const hs = handle_size / 2
  const all: selection_handle[] = [
    { id: "nw", bounds: [x - hs, y - hs, handle_size, handle_size] },
    { id: "n", bounds: [cx - hs, y - hs, handle_size, handle_size] },
    { id: "ne", bounds: [x + w - hs, y - hs, handle_size, handle_size] },
    { id: "e", bounds: [x + w - hs, cy - hs, handle_size, handle_size] },
    { id: "se", bounds: [x + w - hs, y + h - hs, handle_size, handle_size] },
    { id: "s", bounds: [cx - hs, y + h - hs, handle_size, handle_size] },
    { id: "sw", bounds: [x - hs, y + h - hs, handle_size, handle_size] },
    { id: "w", bounds: [x - hs, cy - hs, handle_size, handle_size] },
  ]
  if (include_rotate) {
    all.push({ id: "rotate", bounds: [cx - hs, y - rotate_offset - hs, handle_size, handle_size] })
  }
  if (ids === undefined) {
    return all
  }
  return all.filter((handle) => ids.includes(handle.id))
}

export function hit_selection_handle_editor(
  bounds: rectangle,
  point: vector2,
): selection_handle | null {
  const handles = selection_handles_editor(bounds)
  for (let i = 0; i < handles.length; i = i + 1) {
    const handle = handles[i]
    if (handle === undefined) {
      continue
    }
    if (contains_point_editor(handle.bounds, point)) {
      return handle
    }
  }
  return null
}

export function hit_selection_handles_editor(
  handles: readonly selection_handle[],
  point: vector2,
): selection_handle | null {
  for (let i = 0; i < handles.length; i = i + 1) {
    const handle = handles[i]
    if (handle !== undefined && contains_point_editor(handle.bounds, point)) {
      return handle
    }
  }
  return null
}

function point_handle_editor(id: string, x: number, y: number): selection_handle {
  const hs = handle_size / 2
  return { id, bounds: [x - hs, y - hs, handle_size, handle_size] }
}

export function contains_point_editor(bounds: rectangle, point: vector2): boolean {
  return (
    point[0] >= bounds[0] &&
    point[0] <= bounds[0] + bounds[2] &&
    point[1] >= bounds[1] &&
    point[1] <= bounds[1] + bounds[3]
  )
}
