import type { vector2 } from "@/math/vector2"
import type { rectangle } from "@/math/rectangle"
import type { color } from "@/math/color"
import type { spline } from "@/math/spline"
import type { path_command } from "@/renderer/path"

export type stroke_style = {
  color: color
  width: number
  opacity: number
  pressure_sensitivity: number
}

export type stroke_point = {
  position: vector2
  pressure: number
  timestamp: number
}

export type live_stroke = {
  id: string
  points: stroke_point[]
  style: stroke_style
  stabilizer_state: stabilizer_state
}

export type stroke = {
  id: string
  bounds: rectangle
  z_index: number
  layer_id: string

  points: vector2[]
  pressure: number[] | null
  style: stroke_style

  simplified_points: vector2[]
  spline: spline | null
  path_cache: path_command[] | null
}

export type stabilizer_state = {
  history: vector2[]
  smoothing_factor: number
}

export const default_stroke_style: stroke_style = {
  color: [0, 0, 0, 1],
  width: 3,
  opacity: 1,
  pressure_sensitivity: 0.5,
}

export function create_stroke_style(
  color: color,
  width: number,
  opacity: number = 1,
  pressure_sensitivity: number = 0.5,
): stroke_style {
  return {
    color: [color[0], color[1], color[2], color[3]],
    width,
    opacity,
    pressure_sensitivity,
  }
}

export function clone_stroke_style(s: stroke_style): stroke_style {
  return {
    color: [s.color[0], s.color[1], s.color[2], s.color[3]],
    width: s.width,
    opacity: s.opacity,
    pressure_sensitivity: s.pressure_sensitivity,
  }
}
