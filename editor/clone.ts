import type {
  element,
  image_element,
  shape_element,
  stroke_element,
  text_element,
} from "@/document/element"
import { element_type_image, element_type_shape, element_type_stroke } from "@/document/element"

export function clone_element_editor(el: element): element {
  if (el.type === element_type_stroke) {
    const stroke = el as stroke_element
    return {
      ...stroke,
      bounds: [stroke.bounds[0], stroke.bounds[1], stroke.bounds[2], stroke.bounds[3]],
      points: stroke.points.map((point) => [point[0], point[1]]),
      pressure: stroke.pressure === null ? null : [...stroke.pressure],
      color: [stroke.color[0], stroke.color[1], stroke.color[2], stroke.color[3]],
      simplified_points:
        stroke.simplified_points === null
          ? null
          : stroke.simplified_points.map((point) => [point[0], point[1]]),
      spline: stroke.spline,
    }
  }

  if (el.type === element_type_shape) {
    const shape = el as shape_element
    return {
      ...shape,
      bounds: [shape.bounds[0], shape.bounds[1], shape.bounds[2], shape.bounds[3]],
      fill_color:
        shape.fill_color === null
          ? null
          : [shape.fill_color[0], shape.fill_color[1], shape.fill_color[2], shape.fill_color[3]],
      stroke_color:
        shape.stroke_color === null
          ? null
          : [
              shape.stroke_color[0],
              shape.stroke_color[1],
              shape.stroke_color[2],
              shape.stroke_color[3],
            ],
      start_point: shape.start_point === null ? null : [shape.start_point[0], shape.start_point[1]],
      end_point: shape.end_point === null ? null : [shape.end_point[0], shape.end_point[1]],
    }
  }

  if (el.type === element_type_image) {
    const image = el as image_element
    return {
      ...image,
      bounds: [image.bounds[0], image.bounds[1], image.bounds[2], image.bounds[3]],
    }
  }

  const text = el as text_element
  return {
    ...text,
    bounds: [text.bounds[0], text.bounds[1], text.bounds[2], text.bounds[3]],
    color: [text.color[0], text.color[1], text.color[2], text.color[3]],
  }
}
