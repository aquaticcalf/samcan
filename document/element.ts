import type { vector2 } from "@/math/vector2"
import type { rectangle } from "@/math/rectangle"
import type { color } from "@/math/color"
import type { spline } from "@/math/spline"

export const element_type_stroke = 0
export const element_type_shape = 1
export const element_type_image = 2
export const element_type_text = 3

export type stroke_element = {
  type: typeof element_type_stroke
  id: string
  bounds: rectangle
  z_index: number
  layer_id: string
  points: vector2[]
  pressure: number[] | null
  color: color
  width: number
  simplified_points: vector2[] | null
  spline: spline | null
}

export const shape_type_rectangle = 0
export const shape_type_ellipse = 1
export const shape_type_line = 2
export const shape_type_arrow = 3

export type shape_element = {
  type: typeof element_type_shape
  id: string
  bounds: rectangle
  z_index: number
  layer_id: string
  shape_type: number
  fill_color: color | null
  stroke_color: color | null
  stroke_width: number
  start_point: vector2 | null
  end_point: vector2 | null
}

export type image_element = {
  type: typeof element_type_image
  id: string
  bounds: rectangle
  z_index: number
  layer_id: string
  src: string
  original_width: number
  original_height: number
  opacity: number
  loaded: boolean
  load_error: boolean
  bitmap: ImageBitmap | HTMLImageElement | null
}

export const text_align_left = 0
export const text_align_center = 1
export const text_align_right = 2

export type text_element = {
  type: typeof element_type_text
  id: string
  bounds: rectangle
  z_index: number
  layer_id: string
  content: string
  font_family: string
  font_size: number
  color: color
  align: number
}

export type element = stroke_element | shape_element | image_element | text_element

export function create_stroke_element(
  id: string,
  bounds: rectangle,
  z_index: number,
  layer_id: string,
  points: vector2[],
  pressure: number[] | null,
  color: color,
  width: number,
): stroke_element {
  return {
    type: element_type_stroke,
    id,
    bounds: [bounds[0], bounds[1], bounds[2], bounds[3]],
    z_index,
    layer_id,
    points: points.map((p) => [p[0], p[1]]),
    pressure: pressure === null ? null : [...pressure],
    color: [color[0], color[1], color[2], color[3]],
    width,
    simplified_points: null,
    spline: null,
  }
}

export function create_shape_element(
  id: string,
  bounds: rectangle,
  z_index: number,
  layer_id: string,
  shape_type: number,
  fill_color: color | null,
  stroke_color: color | null,
  stroke_width: number,
  start_point: vector2 | null,
  end_point: vector2 | null,
): shape_element {
  return {
    type: element_type_shape,
    id,
    bounds: [bounds[0], bounds[1], bounds[2], bounds[3]],
    z_index,
    layer_id,
    shape_type,
    fill_color:
      fill_color === null ? null : [fill_color[0], fill_color[1], fill_color[2], fill_color[3]],
    stroke_color:
      stroke_color === null
        ? null
        : [stroke_color[0], stroke_color[1], stroke_color[2], stroke_color[3]],
    stroke_width,
    start_point: start_point === null ? null : [start_point[0], start_point[1]],
    end_point: end_point === null ? null : [end_point[0], end_point[1]],
  }
}

export function create_image_element(
  id: string,
  bounds: rectangle,
  z_index: number,
  layer_id: string,
  src: string,
  original_width: number,
  original_height: number,
  opacity: number,
): image_element {
  return {
    type: element_type_image,
    id,
    bounds: [bounds[0], bounds[1], bounds[2], bounds[3]],
    z_index,
    layer_id,
    src,
    original_width,
    original_height,
    opacity,
    loaded: false,
    load_error: false,
    bitmap: null,
  }
}

export function create_text_element(
  id: string,
  bounds: rectangle,
  z_index: number,
  layer_id: string,
  content: string,
  font_family: string,
  font_size: number,
  color: color,
  align: number,
): text_element {
  return {
    type: element_type_text,
    id,
    bounds: [bounds[0], bounds[1], bounds[2], bounds[3]],
    z_index,
    layer_id,
    content,
    font_family,
    font_size,
    color: [color[0], color[1], color[2], color[3]],
    align,
  }
}

export function clone_element(el: element): element {
  if (el.type === element_type_stroke) {
    const stroke = el as stroke_element
    return create_stroke_element(
      stroke.id,
      stroke.bounds,
      stroke.z_index,
      stroke.layer_id,
      stroke.points,
      stroke.pressure,
      stroke.color,
      stroke.width,
    )
  } else if (el.type === element_type_shape) {
    const shape = el as shape_element
    return create_shape_element(
      shape.id,
      shape.bounds,
      shape.z_index,
      shape.layer_id,
      shape.shape_type,
      shape.fill_color,
      shape.stroke_color,
      shape.stroke_width,
      shape.start_point,
      shape.end_point,
    )
  } else if (el.type === element_type_image) {
    const image = el as image_element
    const cloned = create_image_element(
      image.id,
      image.bounds,
      image.z_index,
      image.layer_id,
      image.src,
      image.original_width,
      image.original_height,
      image.opacity,
    )
    cloned.loaded = image.loaded
    cloned.load_error = image.load_error
    cloned.bitmap = image.bitmap
    return cloned
  } else {
    const text = el as text_element
    return create_text_element(
      text.id,
      text.bounds,
      text.z_index,
      text.layer_id,
      text.content,
      text.font_family,
      text.font_size,
      text.color,
      text.align,
    )
  }
}

export function id_of_element(el: element): string {
  return el.id
}

export function bounds_of_element(el: element): rectangle {
  return [el.bounds[0], el.bounds[1], el.bounds[2], el.bounds[3]]
}

export function z_index_of_element(el: element): number {
  return el.z_index
}

export function layer_id_of_element(el: element): string {
  return el.layer_id
}

export function type_of_element(el: element): number {
  return el.type
}

export function update_element_bounds(el: element, bounds: rectangle): element {
  const cloned = clone_element(el)
  const mutable = cloned as { bounds: rectangle }
  mutable.bounds = [bounds[0], bounds[1], bounds[2], bounds[3]]
  return cloned
}

export function update_element_z_index(el: element, z_index: number): element {
  const cloned = clone_element(el)
  const mutable = cloned as { z_index: number }
  mutable.z_index = z_index
  return cloned
}

export function update_element_layer_id(el: element, layer_id: string): element {
  const cloned = clone_element(el)
  const mutable = cloned as { layer_id: string }
  mutable.layer_id = layer_id
  return cloned
}

export function update_stroke_points(el: stroke_element, points: vector2[]): stroke_element {
  return {
    ...el,
    points: points.map((p) => [p[0], p[1]]),
    simplified_points: null,
    spline: null,
  }
}

export function update_stroke_simplified_points(
  el: stroke_element,
  simplified: vector2[] | null,
): stroke_element {
  return {
    ...el,
    simplified_points: simplified === null ? null : simplified.map((p) => [p[0], p[1]]),
  }
}

export function update_stroke_spline(
  el: stroke_element,
  spline_data: spline | null,
): stroke_element {
  return {
    ...el,
    spline: spline_data,
  }
}

export function update_image_loaded(
  el: image_element,
  loaded: boolean,
  bitmap: ImageBitmap | HTMLImageElement | null,
  load_error: boolean = false,
): image_element {
  return {
    ...el,
    loaded,
    load_error,
    bitmap,
  }
}

export function update_text_content(el: text_element, content: string): text_element {
  return {
    ...el,
    content,
  }
}

export function equals_element_identity(a: element, b: element): boolean {
  if (a.type !== b.type || a.id !== b.id) {
    return false
  }

  if (a.z_index !== b.z_index || a.layer_id !== b.layer_id) {
    return false
  }

  if (
    a.bounds[0] !== b.bounds[0] ||
    a.bounds[1] !== b.bounds[1] ||
    a.bounds[2] !== b.bounds[2] ||
    a.bounds[3] !== b.bounds[3]
  ) {
    return false
  }

  return true
}
