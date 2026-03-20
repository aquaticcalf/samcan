import type { image_source } from "@/renderer/renderer"
import type { path } from "@/renderer/path"
import type { draw_style } from "@/renderer/style"
import type { rectangle } from "@/math/rectangle"
import type { circle } from "@/math/circle"
import type { vector2 } from "@/math/vector2"
import type { renderer_state } from "@/renderer/canvas/types"
import { get_or_create_path2d_canvas } from "@/renderer/canvas/paths"
import { to_rgba_string_color } from "@/math/color"
import { line_cap_round, line_cap_square, line_join_bevel, line_join_round } from "@/renderer/style"

export function draw_path_canvas(state: renderer_state, p: path, s: draw_style): void {
  const path2d = get_or_create_path2d_canvas(state, p)
  apply_style_canvas(state.ctx, s)

  if (s.fill !== null) {
    state.ctx.fill(path2d)
  }

  if (s.stroke !== null && s.stroke_width > 0) {
    state.ctx.stroke(path2d)
  }
}

export function draw_rectangle_canvas(state: renderer_state, r: rectangle, s: draw_style): void {
  apply_style_canvas(state.ctx, s)

  if (s.fill !== null) {
    state.ctx.fillRect(r[0], r[1], r[2], r[3])
  }

  if (s.stroke !== null && s.stroke_width > 0) {
    state.ctx.strokeRect(r[0], r[1], r[2], r[3])
  }
}

export function draw_circle_canvas(state: renderer_state, c: circle, s: draw_style): void {
  state.ctx.beginPath()
  state.ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2)
  apply_style_canvas(state.ctx, s)

  if (s.fill !== null) {
    state.ctx.fill()
  }

  if (s.stroke !== null && s.stroke_width > 0) {
    state.ctx.stroke()
  }
}

export function draw_line_canvas(
  state: renderer_state,
  a: vector2,
  b: vector2,
  s: draw_style,
): void {
  state.ctx.beginPath()
  state.ctx.moveTo(a[0], a[1])
  state.ctx.lineTo(b[0], b[1])
  apply_style_canvas(state.ctx, s)
  state.ctx.stroke()
}

export function draw_polyline_canvas(
  state: renderer_state,
  points: readonly vector2[],
  s: draw_style,
): void {
  if (points.length < 2) {
    return
  }

  state.ctx.beginPath()
  const first = points[0]
  if (first !== undefined) {
    state.ctx.moveTo(first[0], first[1])
  }

  for (let i = 1; i < points.length; i = i + 1) {
    const point = points[i]
    if (point !== undefined) {
      state.ctx.lineTo(point[0], point[1])
    }
  }

  apply_style_canvas(state.ctx, s)
  state.ctx.stroke()
}

export function draw_image_canvas(
  state: renderer_state,
  image: image_source,
  r: rectangle,
  opacity: number,
  _version?: number,
): void {
  const old_alpha = state.ctx.globalAlpha
  state.ctx.globalAlpha = opacity
  state.ctx.drawImage(image, r[0], r[1], r[2], r[3])
  state.ctx.globalAlpha = old_alpha
}

function apply_style_canvas(ctx: CanvasRenderingContext2D, s: draw_style): void {
  ctx.globalAlpha = s.alpha

  if (s.fill !== null) {
    ctx.fillStyle = to_rgba_string_color(s.fill)
  }

  if (s.stroke !== null) {
    ctx.strokeStyle = to_rgba_string_color(s.stroke)
  }

  ctx.lineWidth = s.stroke_width
  ctx.lineCap = line_cap_to_string_canvas(s.line_cap)
  ctx.lineJoin = line_join_to_string_canvas(s.line_join)
  ctx.miterLimit = s.miter_limit
}

function line_cap_to_string_canvas(cap: number): CanvasLineCap {
  if (cap === line_cap_round) {
    return "round"
  } else if (cap === line_cap_square) {
    return "square"
  } else {
    return "butt"
  }
}

function line_join_to_string_canvas(join: number): CanvasLineJoin {
  if (join === line_join_round) {
    return "round"
  } else if (join === line_join_bevel) {
    return "bevel"
  } else {
    return "miter"
  }
}
