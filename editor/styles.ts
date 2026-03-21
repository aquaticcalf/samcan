import type { draw_style } from "@/renderer/style"
import { line_cap_round, line_join_round } from "@/renderer/style"

export const overlay_selection_style: draw_style = {
  fill: [0.2, 0.5, 1, 0.15],
  stroke: [0.2, 0.5, 1, 0.95],
  stroke_width: 1,
  line_cap: line_cap_round,
  line_join: line_join_round,
  miter_limit: 10,
  alpha: 1,
}

export const overlay_marquee_style: draw_style = {
  fill: [0.2, 0.5, 1, 0.07],
  stroke: [0.2, 0.5, 1, 0.7],
  stroke_width: 1,
  line_cap: line_cap_round,
  line_join: line_join_round,
  miter_limit: 10,
  alpha: 1,
}

export const overlay_hover_style: draw_style = {
  fill: null,
  stroke: [0.2, 0.5, 1, 0.65],
  stroke_width: 1,
  line_cap: line_cap_round,
  line_join: line_join_round,
  miter_limit: 10,
  alpha: 1,
}

export const overlay_handle_style: draw_style = {
  fill: [1, 1, 1, 1],
  stroke: [0.2, 0.5, 1, 0.95],
  stroke_width: 1,
  line_cap: line_cap_round,
  line_join: line_join_round,
  miter_limit: 10,
  alpha: 1,
}

export const default_shape_fill: [number, number, number, number] = [0.95, 0.95, 0.95, 1]
export const default_shape_stroke: [number, number, number, number] = [0.15, 0.15, 0.15, 1]
export const default_text_color: [number, number, number, number] = [0.1, 0.1, 0.1, 1]
export const default_stroke_color: [number, number, number, number] = [0.1, 0.1, 0.1, 1]
