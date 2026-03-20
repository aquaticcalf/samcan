import type { draw_style } from "@/renderer/style"
import type { renderer } from "@/renderer/renderer"
import type {
  element,
  image_element,
  shape_element,
  stroke_element,
  text_element,
} from "@/document/element"
import {
  element_type_image,
  element_type_shape,
  element_type_stroke,
  element_type_text,
  shape_type_arrow,
  shape_type_ellipse,
  shape_type_line,
  shape_type_rectangle,
} from "@/document/element"
import { default_element_fill, default_element_stroke } from "@/engine/shared"

export function render_element_engine(drawer: renderer, el: element): void {
  if (el.type === element_type_stroke) {
    render_stroke_element_engine(drawer, el as stroke_element)
    return
  }

  if (el.type === element_type_shape) {
    render_shape_element_engine(drawer, el as shape_element)
    return
  }

  if (el.type === element_type_image) {
    render_image_element_engine(drawer, el as image_element)
    return
  }

  if (el.type === element_type_text) {
    render_text_element_engine(drawer, el as text_element)
  }
}

function render_stroke_element_engine(drawer: renderer, el: stroke_element): void {
  const style: draw_style = {
    fill: null,
    stroke: el.color,
    stroke_width: el.width,
    line_cap: 1,
    line_join: 1,
    miter_limit: 10,
    alpha: el.color[3],
  }

  const points =
    el.simplified_points && el.simplified_points.length > 1 ? el.simplified_points : el.points
  if (points.length === 1) {
    const p = points[0]
    if (p !== undefined) {
      drawer.draw_circle([p[0], p[1], Math.max(0.5, el.width * 0.5)], style)
    }
    return
  }

  if (points.length > 1) {
    drawer.draw_polyline(points, style)
  }
}

function render_shape_element_engine(drawer: renderer, el: shape_element): void {
  const style: draw_style = {
    fill: el.fill_color,
    stroke: el.stroke_color,
    stroke_width: el.stroke_width,
    line_cap: 1,
    line_join: 1,
    miter_limit: 10,
    alpha: 1,
  }

  if (el.shape_type === shape_type_rectangle) {
    drawer.draw_rectangle(el.bounds, style)
    return
  }

  if (el.shape_type === shape_type_ellipse) {
    const cx = el.bounds[0] + el.bounds[2] / 2
    const cy = el.bounds[1] + el.bounds[3] / 2
    const radius = Math.max(0.5, Math.min(el.bounds[2], el.bounds[3]) / 2)
    drawer.draw_circle([cx, cy, radius], style)
    return
  }

  if (el.shape_type === shape_type_line || el.shape_type === shape_type_arrow) {
    const from = el.start_point ?? [el.bounds[0], el.bounds[1]]
    const to = el.end_point ?? [el.bounds[0] + el.bounds[2], el.bounds[1] + el.bounds[3]]
    drawer.draw_line(from, to, style)
  }
}

function render_image_element_engine(drawer: renderer, el: image_element): void {
  const style: draw_style = {
    fill: default_element_fill,
    stroke: default_element_stroke,
    stroke_width: 1,
    line_cap: 1,
    line_join: 1,
    miter_limit: 10,
    alpha: Math.max(0, Math.min(1, el.opacity)),
  }
  drawer.draw_rectangle(el.bounds, style)
}

function render_text_element_engine(drawer: renderer, el: text_element): void {
  const style: draw_style = {
    fill: null,
    stroke: el.color,
    stroke_width: Math.max(1, Math.min(2, el.font_size / 16)),
    line_cap: 1,
    line_join: 1,
    miter_limit: 10,
    alpha: el.color[3],
  }
  drawer.draw_rectangle(el.bounds, style)
}
