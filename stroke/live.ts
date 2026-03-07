import type { vector2 } from "@/math/vector2"
import type { renderer } from "@/renderer/renderer"
import type { draw_style } from "@/renderer/style"
import type { stroke_style, stroke_point, live_stroke } from "./stroke"
import { clone_stroke_style } from "./stroke"
import { create_stabilizer, stabilize_point, reset_stabilizer } from "./stabilizer"
import { line_cap_round, line_join_round } from "@/renderer/style"

let live_stroke_counter = 0

export function generate_stroke_id(): string {
  live_stroke_counter = live_stroke_counter + 1
  return `stroke_${Date.now()}_${live_stroke_counter}`
}

export function create_live_stroke(style: stroke_style, id?: string): live_stroke {
  return {
    id: id ?? generate_stroke_id(),
    points: [],
    style: clone_stroke_style(style),
    stabilizer_state: create_stabilizer(),
  }
}

export function add_point_live_stroke(
  live: live_stroke,
  position: vector2,
  pressure: number = 0.5,
  timestamp: number = Date.now(),
): live_stroke {
  const stabilized: vector2 = [0, 0]
  stabilize_point(live.stabilizer_state, position, stabilized)

  return add_point_to_live_stroke_internal(live, stabilized, pressure, timestamp)
}

export function add_raw_point_live_stroke(
  live: live_stroke,
  raw_position: vector2,
  pressure: number = 0.5,
  timestamp: number = Date.now(),
): live_stroke {
  return add_point_to_live_stroke_internal(live, raw_position, pressure, timestamp)
}

function add_point_to_live_stroke_internal(
  live: live_stroke,
  position: vector2,
  pressure: number,
  timestamp: number,
): live_stroke {
  const point: stroke_point = {
    position: [position[0], position[1]],
    pressure,
    timestamp,
  }

  return {
    ...live,
    points: [...live.points, point],
  }
}

export function get_points_from_live_stroke(live: live_stroke): vector2[] {
  return live.points.map((p) => p.position)
}

export function get_pressure_from_live_stroke(live: live_stroke): number[] | null {
  if (live.points.length === 0) return null
  return live.points.map((p) => p.pressure)
}

export function render_live_stroke(live: live_stroke, renderer: renderer): void {
  if (live.points.length < 2) {
    if (live.points.length === 1) {
      const point = live.points[0]!
      const radius =
        live.style.width * (0.5 + point.pressure * live.style.pressure_sensitivity * 0.5)
      renderer.draw_circle(
        [point.position[0], point.position[1], radius],
        create_live_style(live.style, true),
      )
    }
    return
  }

  const points = get_points_from_live_stroke(live)
  const style = create_live_style(live.style, false)
  renderer.draw_polyline(points, style)
}

function create_live_style(style: stroke_style, is_dot: boolean): draw_style {
  return {
    fill: is_dot ? style.color : null,
    stroke: style.color,
    stroke_width: style.width,
    line_cap: line_cap_round,
    line_join: line_join_round,
    miter_limit: 10,
    alpha: style.opacity,
  }
}

export function finalize_live_stroke(
  live: live_stroke,
  z_index: number,
  layer_id: string,
): {
  points: vector2[]
  pressure: number[] | null
  style: stroke_style
  id: string
  z_index: number
  layer_id: string
} {
  reset_stabilizer(live.stabilizer_state)

  const points = get_points_from_live_stroke(live)
  const pressure = get_pressure_from_live_stroke(live)

  return {
    id: live.id,
    points,
    pressure,
    style: live.style,
    z_index,
    layer_id,
  }
}
