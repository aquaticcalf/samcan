import type { document } from "@/document/document"
import type {
  element,
  image_element,
  shape_element,
  stroke_element,
  text_element,
} from "@/document/element"
import type { rectangle } from "@/math/rectangle"
import type { vector2 } from "@/math/vector2"
import { get_element_by_id_document, update_element_document } from "@/document/document"
import {
  element_type_image,
  element_type_shape,
  element_type_stroke,
  element_type_text,
  shape_type_arrow,
  shape_type_line,
} from "@/document/element"
import { clone_element_editor } from "@/editor/clone"
import { compute_stroke_bounds } from "@/stroke/process"

export function move_element_editor(el: element, dx: number, dy: number): element {
  return apply_transform_element_editor(el, (point) => [point[0] + dx, point[1] + dy])
}

export function transform_elements_editor(
  base_document: document,
  ids: readonly string[],
  transform_point: (point: vector2) => vector2,
): document {
  let doc = base_document
  for (let i = 0; i < ids.length; i = i + 1) {
    const id = ids[i]
    if (id === undefined) continue
    const base_element = get_element_by_id_document(base_document, id)
    if (base_element === null) continue
    doc = update_element_document(
      doc,
      id,
      apply_transform_element_editor(base_element, transform_point),
    )
  }
  return doc
}

export function angle_to_center_editor(center: vector2, point: vector2): number {
  return Math.atan2(point[1] - center[1], point[0] - center[0])
}

function apply_transform_element_editor(
  el: element,
  map_point: (point: vector2) => vector2,
): element {
  if (el.type === element_type_stroke)
    return transform_stroke_editor(el as stroke_element, map_point)
  if (el.type === element_type_shape) return transform_shape_editor(el as shape_element, map_point)
  if (el.type === element_type_image) return transform_image_editor(el as image_element, map_point)
  if (el.type === element_type_text) return transform_text_editor(el as text_element, map_point)
  return clone_element_editor(el)
}

function transform_stroke_editor(
  stroke: stroke_element,
  map_point: (point: vector2) => vector2,
): stroke_element {
  const out = clone_element_editor(stroke) as stroke_element
  out.points = out.points.map((point) => map_point(point))
  out.simplified_points =
    out.simplified_points === null ? null : out.simplified_points.map((point) => map_point(point))
  const bounds: rectangle = [0, 0, 0, 0]
  compute_stroke_bounds(out.points, out.width, bounds)
  out.bounds = bounds
  out.spline = null
  return out
}

function transform_shape_editor(
  shape: shape_element,
  map_point: (point: vector2) => vector2,
): shape_element {
  const out = clone_element_editor(shape) as shape_element
  if (
    (out.shape_type === shape_type_line || out.shape_type === shape_type_arrow) &&
    out.start_point !== null &&
    out.end_point !== null
  ) {
    out.start_point = map_point(out.start_point)
    out.end_point = map_point(out.end_point)
    out.bounds = bounds_from_points_editor([out.start_point, out.end_point])
    return out
  }
  out.bounds = transform_bounds_editor(out.bounds, map_point)
  return out
}

function transform_image_editor(
  image: image_element,
  map_point: (point: vector2) => vector2,
): image_element {
  const out = clone_element_editor(image) as image_element
  out.bounds = transform_bounds_editor(out.bounds, map_point)
  return out
}

function transform_text_editor(
  text: text_element,
  map_point: (point: vector2) => vector2,
): text_element {
  const out = clone_element_editor(text) as text_element
  out.bounds = transform_bounds_editor(out.bounds, map_point)
  return out
}

function transform_bounds_editor(
  bounds: rectangle,
  map_point: (point: vector2) => vector2,
): rectangle {
  const p1 = map_point([bounds[0], bounds[1]])
  const p2 = map_point([bounds[0] + bounds[2], bounds[1]])
  const p3 = map_point([bounds[0], bounds[1] + bounds[3]])
  const p4 = map_point([bounds[0] + bounds[2], bounds[1] + bounds[3]])
  return bounds_from_points_editor([p1, p2, p3, p4])
}

function bounds_from_points_editor(points: vector2[]): rectangle {
  let min_x = Infinity
  let min_y = Infinity
  let max_x = -Infinity
  let max_y = -Infinity
  for (let i = 0; i < points.length; i = i + 1) {
    const point = points[i]
    if (point === undefined) continue
    min_x = Math.min(min_x, point[0])
    min_y = Math.min(min_y, point[1])
    max_x = Math.max(max_x, point[0])
    max_y = Math.max(max_y, point[1])
  }
  if (min_x === Infinity) return [0, 0, 1, 1]
  return [min_x, min_y, Math.max(1, max_x - min_x), Math.max(1, max_y - min_y)]
}
