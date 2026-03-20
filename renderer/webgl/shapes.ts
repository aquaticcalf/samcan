import type { draw_style } from "@/renderer/style"
import type { rectangle } from "@/math/rectangle"
import type { circle } from "@/math/circle"
import type { vector2 } from "@/math/vector2"
import type { color } from "@/math/color"
import type { webgl_state } from "@/renderer/webgl/types"
import { flush_webgl } from "@/renderer/webgl/lifecycle"

export function draw_rectangle_webgl(state: webgl_state, r: rectangle, s: draw_style): void {
  const x = r[0]
  const y = r[1]
  const w = r[2]
  const h = r[3]

  if (s.fill !== null) {
    add_quad_webgl(state, x, y, x + w, y, x + w, y + h, x, y + h, s.fill, s.alpha)
  }

  if (s.stroke !== null && s.stroke_width > 0) {
    const sw = s.stroke_width
    add_quad_webgl(
      state,
      x - sw,
      y - sw,
      x + w + sw,
      y - sw,
      x + w + sw,
      y,
      x - sw,
      y,
      s.stroke,
      s.alpha,
    )
    add_quad_webgl(
      state,
      x + w,
      y,
      x + w + sw,
      y,
      x + w + sw,
      y + h,
      x + w,
      y + h,
      s.stroke,
      s.alpha,
    )
    add_quad_webgl(
      state,
      x - sw,
      y + h,
      x + w + sw,
      y + h,
      x + w + sw,
      y + h + sw,
      x - sw,
      y + h + sw,
      s.stroke,
      s.alpha,
    )
    add_quad_webgl(state, x - sw, y, x, y, x, y + h, x - sw, y + h, s.stroke, s.alpha)
  }
}

export function draw_circle_webgl(state: webgl_state, c: circle, s: draw_style): void {
  const cx = c[0]
  const cy = c[1]
  const r = c[2]
  const segments = 32

  if (s.fill !== null) {
    const base_vertex = state.vertex_count
    write_vertex_webgl(state, cx, cy, s.fill, s.alpha)

    for (let i = 0; i <= segments; i = i + 1) {
      const angle = (i / segments) * Math.PI * 2
      write_vertex_webgl(state, cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, s.fill, s.alpha)
    }

    for (let i = 0; i < segments; i = i + 1) {
      state.indices[state.index_count] = base_vertex
      state.indices[state.index_count + 1] = base_vertex + i + 1
      state.indices[state.index_count + 2] = base_vertex + i + 2
      state.index_count = state.index_count + 3
    }
  }

  if (s.stroke !== null && s.stroke_width > 0 && r > 0) {
    const outer_r = r + s.stroke_width
    const base_vertex = state.vertex_count

    for (let i = 0; i <= segments; i = i + 1) {
      const angle = (i / segments) * Math.PI * 2
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      write_vertex_webgl(state, cx + cos * r, cy + sin * r, s.stroke, s.alpha)
      write_vertex_webgl(state, cx + cos * outer_r, cy + sin * outer_r, s.stroke, s.alpha)
    }

    for (let i = 0; i < segments; i = i + 1) {
      const base = base_vertex + i * 2
      state.indices[state.index_count] = base
      state.indices[state.index_count + 1] = base + 1
      state.indices[state.index_count + 2] = base + 2
      state.indices[state.index_count + 3] = base + 1
      state.indices[state.index_count + 4] = base + 3
      state.indices[state.index_count + 5] = base + 2
      state.index_count = state.index_count + 6
    }
  }
}

export function draw_line_webgl(state: webgl_state, a: vector2, b: vector2, s: draw_style): void {
  if (s.stroke === null || s.stroke_width <= 0) {
    return
  }

  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.sqrt(dx * dx + dy * dy)

  if (len === 0) {
    return
  }

  const width = s.stroke_width / 2
  const nx = (-dy / len) * width
  const ny = (dx / len) * width

  add_quad_webgl(
    state,
    a[0] + nx,
    a[1] + ny,
    b[0] + nx,
    b[1] + ny,
    b[0] - nx,
    b[1] - ny,
    a[0] - nx,
    a[1] - ny,
    s.stroke,
    s.alpha,
  )
}

export function draw_polyline_webgl(
  state: webgl_state,
  points: readonly vector2[],
  s: draw_style,
): void {
  if (points.length < 2 || s.stroke === null || s.stroke_width <= 0) {
    return
  }

  for (let i = 0; i < points.length - 1; i = i + 1) {
    const p1 = points[i]
    const p2 = points[i + 1]
    if (p1 !== undefined && p2 !== undefined) {
      draw_line_webgl(state, p1, p2, s)
    }
  }
}

function add_quad_webgl(
  state: webgl_state,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
  color: color,
  alpha: number,
): void {
  if (state.vertex_count + 4 > state.max_vertices || state.index_count + 6 > state.max_indices) {
    flush_webgl(state)
  }

  const base = state.vertex_count
  write_vertex_webgl(state, x1, y1, color, alpha)
  write_vertex_webgl(state, x2, y2, color, alpha)
  write_vertex_webgl(state, x3, y3, color, alpha)
  write_vertex_webgl(state, x4, y4, color, alpha)

  state.indices[state.index_count] = base
  state.indices[state.index_count + 1] = base + 1
  state.indices[state.index_count + 2] = base + 2
  state.indices[state.index_count + 3] = base + 1
  state.indices[state.index_count + 4] = base + 3
  state.indices[state.index_count + 5] = base + 2
  state.index_count = state.index_count + 6
}

function write_vertex_webgl(
  state: webgl_state,
  x: number,
  y: number,
  color: color,
  alpha: number,
): void {
  state.vertices[state.vertex_count * 2] = x
  state.vertices[state.vertex_count * 2 + 1] = y
  state.colors[state.vertex_count * 4] = color[0]
  state.colors[state.vertex_count * 4 + 1] = color[1]
  state.colors[state.vertex_count * 4 + 2] = color[2]
  state.colors[state.vertex_count * 4 + 3] = color[3] * alpha
  state.vertex_count = state.vertex_count + 1
}
