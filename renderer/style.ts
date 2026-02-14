import type { color } from "@/math/color"
import { equals_color } from "@/math/color"

export type draw_style = {
  readonly fill: color | null
  readonly stroke: color | null
  readonly stroke_width: number
  readonly line_cap: number
  readonly line_join: number
  readonly miter_limit: number
  readonly alpha: number
}

type mutable_draw_style = {
  fill: color | null
  stroke: color | null
  stroke_width: number
  line_cap: number
  line_join: number
  miter_limit: number
  alpha: number
}

export const line_cap_butt = 0
export const line_cap_round = 1
export const line_cap_square = 2
export const line_join_miter = 0
export const line_join_round = 1
export const line_join_bevel = 2

export function create_draw_style(): draw_style {
  return {
    fill: null,
    stroke: null,
    stroke_width: 1,
    line_cap: line_cap_round,
    line_join: line_join_round,
    miter_limit: 10,
    alpha: 1,
  }
}

export function clone_draw_style(s: draw_style): draw_style {
  return {
    fill: s.fill,
    stroke: s.stroke,
    stroke_width: s.stroke_width,
    line_cap: s.line_cap,
    line_join: s.line_join,
    miter_limit: s.miter_limit,
    alpha: s.alpha,
  }
}

export function copy_draw_style(s: draw_style, out: draw_style): draw_style {
  const mutable_out = out as mutable_draw_style
  mutable_out.fill = s.fill
  mutable_out.stroke = s.stroke
  mutable_out.stroke_width = s.stroke_width
  mutable_out.line_cap = s.line_cap
  mutable_out.line_join = s.line_join
  mutable_out.miter_limit = s.miter_limit
  mutable_out.alpha = s.alpha
  return out
}

export function set_draw_style(
  fill: color | null,
  stroke: color | null,
  stroke_width: number,
  line_cap: number,
  line_join: number,
  miter_limit: number,
  alpha: number,
  out: draw_style,
): draw_style {
  const mutable_out = out as mutable_draw_style
  mutable_out.fill = fill
  mutable_out.stroke = stroke
  mutable_out.stroke_width = stroke_width
  mutable_out.line_cap = line_cap
  mutable_out.line_join = line_join
  mutable_out.miter_limit = miter_limit
  mutable_out.alpha = alpha
  return out
}

export function with_fill_draw_style(
  s: draw_style,
  fill: color | null,
  out: draw_style,
): draw_style {
  const mutable_out = out as mutable_draw_style
  mutable_out.fill = fill
  mutable_out.stroke = s.stroke
  mutable_out.stroke_width = s.stroke_width
  mutable_out.line_cap = s.line_cap
  mutable_out.line_join = s.line_join
  mutable_out.miter_limit = s.miter_limit
  mutable_out.alpha = s.alpha
  return out
}

export function with_stroke_draw_style(
  s: draw_style,
  stroke: color | null,
  stroke_width: number,
  out: draw_style,
): draw_style {
  const mutable_out = out as mutable_draw_style
  mutable_out.fill = s.fill
  mutable_out.stroke = stroke
  mutable_out.stroke_width = stroke_width
  mutable_out.line_cap = s.line_cap
  mutable_out.line_join = s.line_join
  mutable_out.miter_limit = s.miter_limit
  mutable_out.alpha = s.alpha
  return out
}

export function with_alpha_draw_style(s: draw_style, alpha: number, out: draw_style): draw_style {
  const mutable_out = out as mutable_draw_style
  mutable_out.fill = s.fill
  mutable_out.stroke = s.stroke
  mutable_out.stroke_width = s.stroke_width
  mutable_out.line_cap = s.line_cap
  mutable_out.line_join = s.line_join
  mutable_out.miter_limit = s.miter_limit
  mutable_out.alpha = alpha
  return out
}

export function with_line_cap_draw_style(
  s: draw_style,
  line_cap: number,
  out: draw_style,
): draw_style {
  const mutable_out = out as mutable_draw_style
  mutable_out.fill = s.fill
  mutable_out.stroke = s.stroke
  mutable_out.stroke_width = s.stroke_width
  mutable_out.line_cap = line_cap
  mutable_out.line_join = s.line_join
  mutable_out.miter_limit = s.miter_limit
  mutable_out.alpha = s.alpha
  return out
}

export function with_line_join_draw_style(
  s: draw_style,
  line_join: number,
  miter_limit: number,
  out: draw_style,
): draw_style {
  const mutable_out = out as mutable_draw_style
  mutable_out.fill = s.fill
  mutable_out.stroke = s.stroke
  mutable_out.stroke_width = s.stroke_width
  mutable_out.line_cap = s.line_cap
  mutable_out.line_join = line_join
  mutable_out.miter_limit = miter_limit
  mutable_out.alpha = s.alpha
  return out
}

export function equals_draw_style(a: draw_style, b: draw_style): boolean {
  const fill_equal =
    (a.fill === null && b.fill === null) ||
    (a.fill !== null && b.fill !== null && equals_color(a.fill, b.fill))
  const stroke_equal =
    (a.stroke === null && b.stroke === null) ||
    (a.stroke !== null && b.stroke !== null && equals_color(a.stroke, b.stroke))

  return (
    fill_equal &&
    stroke_equal &&
    a.stroke_width === b.stroke_width &&
    a.line_cap === b.line_cap &&
    a.line_join === b.line_join &&
    a.miter_limit === b.miter_limit &&
    a.alpha === b.alpha
  )
}
