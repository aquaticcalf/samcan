import type { document } from "@/document/document"
import type { element, shape_element, stroke_element, text_element } from "@/document/element"
import {
  element_type_shape,
  element_type_stroke,
  element_type_text,
  text_align_center,
  text_align_right,
  shape_type_arrow,
  shape_type_ellipse,
  shape_type_frame,
  shape_type_line,
} from "@/document/element"
import {
  contains_ellipse_editor,
  contains_polyline_editor,
  contains_with_padding_editor,
  distance_point_to_segment_editor,
} from "@/editor/hitmath"
import { build_text_layout_editor } from "@/editor/textlayout"

export function element_hit_at_point_editor(
  doc: document,
  x: number,
  y: number,
  padding: number = 4,
): element | null {
  let topmost: element | null = null
  let top_z = -Infinity
  for (const el of doc.elements.values()) {
    if (!element_contains_point_editor(el, x, y, padding)) {
      continue
    }
    if (el.z_index >= top_z) {
      top_z = el.z_index
      topmost = el
    }
  }
  return topmost
}

function element_contains_point_editor(el: element, x: number, y: number, padding: number): boolean {
  if (el.type === element_type_stroke) {
    return stroke_contains_point_editor(el as stroke_element, x, y, padding)
  }
  if (el.type === element_type_shape) {
    return shape_contains_point_editor(el as shape_element, x, y, padding)
  }
  if (el.type === element_type_text) {
    return text_contains_point_editor(el as text_element, x, y, padding)
  }
  return contains_with_padding_editor(el.bounds, x, y, padding)
}

function stroke_contains_point_editor(
  stroke: stroke_element,
  x: number,
  y: number,
  padding: number,
): boolean {
  const radius = Math.max(1, stroke.width / 2 + padding)
  const points =
    stroke.simplified_points !== null && stroke.simplified_points.length > 0
      ? stroke.simplified_points
      : stroke.points
  return contains_polyline_editor(points, x, y, radius)
}

function shape_contains_point_editor(
  shape: shape_element,
  x: number,
  y: number,
  padding: number,
): boolean {
  if (shape.shape_type === shape_type_ellipse) {
    return contains_ellipse_editor(shape.bounds, x, y, padding)
  }
  if (shape.shape_type === shape_type_line || shape.shape_type === shape_type_arrow) {
    const a = shape.start_point ?? [shape.bounds[0], shape.bounds[1]]
    const b = shape.end_point ?? [shape.bounds[0] + shape.bounds[2], shape.bounds[1] + shape.bounds[3]]
    const radius = Math.max(1, shape.stroke_width / 2 + padding)
    if (distance_point_to_segment_editor(x, y, a[0], a[1], b[0], b[1]) <= radius) {
      return true
    }
    if (shape.shape_type === shape_type_arrow) {
      const hit_head = arrowhead_contains_point_editor(a, b, x, y, radius)
      if (hit_head) return true
    }
    return false
  }
  if (shape.shape_type === shape_type_frame) {
    return frame_contains_point_editor(shape, x, y, padding)
  }
  return contains_with_padding_editor(shape.bounds, x, y, padding)
}

function arrowhead_contains_point_editor(
  from: [number, number],
  to: [number, number],
  x: number,
  y: number,
  radius: number,
): boolean {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const len = Math.hypot(dx, dy)
  if (len < 0.0001) return false
  const ux = dx / len
  const uy = dy / len
  const size = Math.max(8, radius * 4)
  const wing_angle = Math.PI / 7
  const cos = Math.cos(wing_angle)
  const sin = Math.sin(wing_angle)
  const lx = to[0] - (ux * cos - uy * sin) * size
  const ly = to[1] - (uy * cos + ux * sin) * size
  const rx = to[0] - (ux * cos + uy * sin) * size
  const ry = to[1] - (uy * cos - ux * sin) * size
  return (
    distance_point_to_segment_editor(x, y, to[0], to[1], lx, ly) <= radius ||
    distance_point_to_segment_editor(x, y, to[0], to[1], rx, ry) <= radius
  )
}

function frame_contains_point_editor(
  shape: shape_element,
  x: number,
  y: number,
  padding: number,
): boolean {
  const bx = shape.bounds[0]
  const by = shape.bounds[1]
  const bw = Math.max(1, shape.bounds[2])
  const bh = Math.max(1, shape.bounds[3])
  const stroke = Math.max(1, shape.stroke_width + padding)
  const header_height = Math.max(20, Math.min(36, bh * 0.18))
  const in_outer = contains_with_padding_editor([bx, by, bw, bh], x, y, padding)
  if (!in_outer) return false

  const in_inner =
    x >= bx + stroke &&
    x <= bx + bw - stroke &&
    y >= by + stroke &&
    y <= by + bh - stroke
  const in_header_band =
    x >= bx - padding &&
    x <= bx + bw + padding &&
    y >= by - padding &&
    y <= by + header_height + padding
  return !in_inner || in_header_band
}

function text_contains_point_editor(
  text: text_element,
  x: number,
  y: number,
  padding: number,
): boolean {
  if (!contains_with_padding_editor(text.bounds, x, y, padding)) return false
  if (text.content.length === 0) return true

  const layout = build_text_layout_editor(text, text.content)
  const local_x = x - text.bounds[0]
  const local_y = y - text.bounds[1]
  const top = layout.padding
  const bottom = text.bounds[3] - layout.padding
  if (local_y < top - padding || local_y > bottom + padding) return false

  for (let i = 0; i < layout.lines.length; i = i + 1) {
    const line = layout.lines[i]
    if (line === undefined) continue
    const y0 = layout.padding + i * layout.line_height
    const y1 = y0 + layout.line_height
    if (local_y < y0 - padding || local_y > y1 + padding) continue
    let x0 = layout.padding
    if (text.align === text_align_center) {
      x0 = text.bounds[2] * 0.5 - line.width * 0.5
    } else if (text.align === text_align_right) {
      x0 = text.bounds[2] - layout.padding - line.width
    }
    const x1 = x0 + line.width
    if (local_x >= x0 - padding && local_x <= x1 + padding) return true
  }

  return false
}
