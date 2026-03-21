import type { draw_style } from "@/renderer/style"
import type { renderer } from "@/renderer/renderer"
import type { vector2 } from "@/math/vector2"
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
  text_align_center,
  text_align_right,
  shape_type_arrow,
  shape_type_ellipse,
  shape_type_frame,
  shape_type_line,
  shape_type_rectangle,
} from "@/document/element"
import { default_element_fill, default_element_stroke } from "@/engine/shared"
import { to_rgba_string_color } from "@/math/color"

type image_status = "empty" | "loading" | "loaded" | "error"

type loaded_image_entry = {
  image: HTMLImageElement
  status: image_status
}

const loaded_images_engine = new Map<string, loaded_image_entry>()
const text_bitmap_cache_engine = new Map<string, HTMLCanvasElement>()
const text_bitmap_cache_limit_engine = 128

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

  if (el.shape_type === shape_type_frame) {
    const header_height = Math.max(20, Math.min(36, el.bounds[3] * 0.18))
    const header_style: draw_style = {
      fill: style.stroke,
      stroke: style.stroke,
      stroke_width: Math.max(1, style.stroke_width),
      line_cap: style.line_cap,
      line_join: style.line_join,
      miter_limit: style.miter_limit,
      alpha: 0.12,
    }
    const outline_style: draw_style = {
      ...style,
      fill: null,
      alpha: 1,
    }
    drawer.draw_rectangle(el.bounds, outline_style)
    drawer.draw_rectangle([el.bounds[0], el.bounds[1], el.bounds[2], header_height], header_style)
    return
  }

  if (el.shape_type === shape_type_ellipse) {
    const cx = el.bounds[0] + el.bounds[2] / 2
    const cy = el.bounds[1] + el.bounds[3] / 2
    const rx = Math.max(0.5, Math.abs(el.bounds[2]) / 2)
    const ry = Math.max(0.5, Math.abs(el.bounds[3]) / 2)
    const segments = 40
    const points: vector2[] = []
    for (let i = 0; i <= segments; i = i + 1) {
      const t = (i / segments) * Math.PI * 2
      points.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry])
    }
    drawer.draw_polyline(points, style)
    return
  }

  if (el.shape_type === shape_type_line || el.shape_type === shape_type_arrow) {
    const from = el.start_point ?? [el.bounds[0], el.bounds[1]]
    const to = el.end_point ?? [el.bounds[0] + el.bounds[2], el.bounds[1] + el.bounds[3]]
    drawer.draw_line(from, to, style)
    if (el.shape_type === shape_type_arrow) {
      draw_arrowhead_engine(drawer, from, to, style)
    }
  }
}

function render_image_element_engine(drawer: renderer, el: image_element): void {
  const image = resolve_image_source_engine(el)
  const opacity = Math.max(0, Math.min(1, el.opacity))
  if (image.status === "loaded" && image.source !== null) {
    drawer.draw_image(image.source, fit_image_bounds_engine(el.bounds, image.source), opacity)
    return
  }

  const style: draw_style = {
    fill: default_element_fill,
    stroke: default_element_stroke,
    stroke_width: 1,
    line_cap: 1,
    line_join: 1,
    miter_limit: 10,
    alpha: opacity,
  }
  drawer.draw_rectangle(el.bounds, style)

  if (image.status === "error") {
    const mark_style: draw_style = {
      fill: null,
      stroke: default_element_stroke,
      stroke_width: 1.5,
      line_cap: 1,
      line_join: 1,
      miter_limit: 10,
      alpha: opacity,
    }
    const inset = Math.max(8, Math.min(el.bounds[2], el.bounds[3]) * 0.12)
    const x0 = el.bounds[0] + inset
    const y0 = el.bounds[1] + inset
    const x1 = el.bounds[0] + el.bounds[2] - inset
    const y1 = el.bounds[1] + el.bounds[3] - inset
    drawer.draw_line([x0, y0], [x1, y1], mark_style)
    drawer.draw_line([x1, y0], [x0, y1], mark_style)
  }
}

function render_text_element_engine(drawer: renderer, el: text_element): void {
  const key = [
    el.content,
    el.font_family,
    el.font_size,
    el.color.join(","),
    el.align,
    Math.max(1, Math.round(el.bounds[2])),
    Math.max(1, Math.round(el.bounds[3])),
    Math.max(1, Math.round(drawer.pixel_ratio)),
  ].join("|")
  let bitmap = text_bitmap_cache_engine.get(key)
  if (bitmap === undefined) {
    bitmap = rasterize_text_engine(el, Math.max(1, Math.round(drawer.pixel_ratio)))
    text_bitmap_cache_engine.set(key, bitmap)
    trim_text_bitmap_cache_engine()
  }
  drawer.draw_image(bitmap, el.bounds, 1)
}

function resolve_image_source_engine(
  el: image_element,
): { status: image_status; source: HTMLImageElement | ImageBitmap | null } {
  if (el.bitmap !== null) {
    return { status: "loaded", source: el.bitmap }
  }
  const src = el.src.trim()
  if (src.length === 0 || typeof Image === "undefined") {
    return { status: "empty", source: null }
  }

  let cached = loaded_images_engine.get(src)
  if (cached === undefined) {
    const image = new Image()
    cached = { image, status: "loading" }
    loaded_images_engine.set(src, cached)
    image.onload = () => {
      const current = loaded_images_engine.get(src)
      if (current !== undefined) current.status = "loaded"
    }
    image.onerror = () => {
      const current = loaded_images_engine.get(src)
      if (current !== undefined) current.status = "error"
    }
    image.src = src
    return { status: "loading", source: null }
  }

  if (cached.status === "loaded") {
    return { status: "loaded", source: cached.image }
  }
  return { status: cached.status, source: null }
}

function fit_image_bounds_engine(
  bounds: [number, number, number, number],
  source: HTMLImageElement | ImageBitmap,
): [number, number, number, number] {
  const source_w = source instanceof HTMLImageElement ? source.naturalWidth : source.width
  const source_h = source instanceof HTMLImageElement ? source.naturalHeight : source.height
  const x = bounds[0]
  const y = bounds[1]
  const w = Math.max(1, bounds[2])
  const h = Math.max(1, bounds[3])

  if (source_w <= 0 || source_h <= 0) {
    return [x, y, w, h]
  }

  const scale = Math.min(w / source_w, h / source_h)
  const draw_w = source_w * scale
  const draw_h = source_h * scale
  const draw_x = x + (w - draw_w) * 0.5
  const draw_y = y + (h - draw_h) * 0.5
  return [draw_x, draw_y, draw_w, draw_h]
}

function draw_arrowhead_engine(
  drawer: renderer,
  from: vector2,
  to: vector2,
  style: draw_style,
): void {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const len = Math.hypot(dx, dy)
  if (len < 0.0001) return

  const ux = dx / len
  const uy = dy / len
  const size = Math.max(8, style.stroke_width * 5)
  const wing_angle = Math.PI / 7
  const cos = Math.cos(wing_angle)
  const sin = Math.sin(wing_angle)

  const lx = to[0] - (ux * cos - uy * sin) * size
  const ly = to[1] - (uy * cos + ux * sin) * size
  const rx = to[0] - (ux * cos + uy * sin) * size
  const ry = to[1] - (uy * cos - ux * sin) * size

  drawer.draw_line(to, [lx, ly], style)
  drawer.draw_line(to, [rx, ry], style)
}

function rasterize_text_engine(el: text_element, scale: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  const width = Math.max(1, Math.ceil(el.bounds[2] * scale))
  const height = Math.max(1, Math.ceil(el.bounds[3] * scale))
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (ctx === null) return canvas

  const font_size = Math.max(1, el.font_size)
  const line_height = font_size * 1.3
  const padding = Math.max(4, Math.round(font_size * 0.35))
  const max_text_width = Math.max(1, el.bounds[2] - padding * 2)
  ctx.scale(scale, scale)
  ctx.font = `${font_size}px ${el.font_family}`
  ctx.textBaseline = "top"
  ctx.fillStyle = to_rgba_string_color(el.color)

  const lines = wrap_text_lines_engine(ctx, el.content, max_text_width)
  const base_x = el.bounds[0]
  const base_y = el.bounds[1]
  const text_top = base_y + padding
  const text_bottom = base_y + el.bounds[3] - padding
  let y = text_top

  for (let i = 0; i < lines.length; i = i + 1) {
    const line = lines[i]
    if (line === undefined) continue
    if (y + line_height > text_bottom + 0.5) break
    const line_width = ctx.measureText(line).width
    let x = base_x + padding
    if (el.align === text_align_center) {
      x = base_x + el.bounds[2] * 0.5 - line_width * 0.5
    } else if (el.align === text_align_right) {
      x = base_x + el.bounds[2] - padding - line_width
    }
    ctx.fillText(line, x - base_x, y - base_y)
    y = y + line_height
  }

  return canvas
}

function wrap_text_lines_engine(
  ctx: CanvasRenderingContext2D,
  content: string,
  max_width: number,
): string[] {
  const normalized = content.length > 0 ? content : ""
  const paragraphs = normalized.split(/\r?\n/)
  const lines: string[] = []

  for (let i = 0; i < paragraphs.length; i = i + 1) {
    const paragraph = paragraphs[i]
    if (paragraph === undefined) continue
    if (paragraph.length === 0) {
      lines.push("")
      continue
    }
    const words = paragraph.split(/(\s+)/).filter((word) => word.length > 0)
    let current = ""
    for (let j = 0; j < words.length; j = j + 1) {
      const word = words[j]
      if (word === undefined) continue
      const candidate = current.length === 0 ? word : `${current}${word}`
      if (ctx.measureText(candidate).width <= max_width || current.length === 0) {
        current = candidate
      } else {
        lines.push(current.trimEnd())
        current = word.trimStart()
      }
    }
    lines.push(current.length > 0 ? current : "")
  }

  return lines
}

function trim_text_bitmap_cache_engine(): void {
  if (text_bitmap_cache_engine.size <= text_bitmap_cache_limit_engine) {
    return
  }
  const remove_count = Math.ceil(text_bitmap_cache_engine.size / 3)
  let removed = 0
  for (const key of text_bitmap_cache_engine.keys()) {
    text_bitmap_cache_engine.delete(key)
    removed = removed + 1
    if (removed >= remove_count) return
  }
}
