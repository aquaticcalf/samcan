import type { vector2 } from "@/math/vector2"
import type { renderer } from "@/renderer/renderer"
import type { draw_style } from "@/renderer/style"
import type { stroke, stroke_style } from "./stroke"
import { evaluate_spline_at_t, get_spline_length } from "@/math/spline"
import { get_simplified_for_lod } from "./process"
import { line_cap_round, line_join_round } from "@/renderer/style"

const lod_scratch_buffer: vector2[] = []

function ensure_lod_scratch(size: number): vector2[] {
  while (lod_scratch_buffer.length < size) {
    lod_scratch_buffer.push([0, 0])
  }
  return lod_scratch_buffer
}

export const lod_high = 1.0
export const lod_medium = 0.5
export const lod_low = 0.25

export const spline_evaluation_interval_high = 2.0
export const spline_evaluation_interval_medium = 4.0
export const spline_evaluation_interval_low = 8.0

export function select_lod_from_zoom(zoom: number): number {
  if (zoom >= 1.5) return lod_high
  if (zoom >= 0.5) return lod_medium
  return lod_low
}

export function get_spline_evaluation_interval(lod: number): number {
  if (lod >= lod_medium) return spline_evaluation_interval_high
  if (lod >= lod_low) return spline_evaluation_interval_medium
  return spline_evaluation_interval_low
}

export function stroke_to_path_commands(
  stroke: stroke,
  lod: number,
  out_commands: number[],
): number {
  let command_count = 0

  if (stroke.points.length === 0) return 0
  if (stroke.points.length === 1) {
    out_commands[command_count++] = 0
    out_commands[command_count++] = stroke.points[0]![0]
    out_commands[command_count++] = stroke.points[0]![1]
    return command_count
  }

  const use_spline = stroke.spline !== null && stroke.spline.point_count >= 2
  const use_lod = lod < lod_high

  if (use_spline && !use_lod) {
    const interval = get_spline_evaluation_interval(lod)
    const spline_length = get_spline_length(stroke.spline!)
    const first_segment = stroke.spline!.segments_x[0]!
    const last_segment = stroke.spline!.segments_x[stroke.spline!.segments_x.length - 1]!
    const t_start = first_segment.x_start
    const t_end = last_segment.x_end
    const steps = Math.max(2, Math.floor(spline_length / interval))
    const dt = (t_end - t_start) / steps
    const temp_point: vector2 = [0, 0]

    for (let i = 0; i <= steps; i++) {
      const t = t_start + i * dt
      evaluate_spline_at_t(stroke.spline!, t, temp_point)

      if (i === 0) {
        out_commands[command_count++] = 0
      } else {
        out_commands[command_count++] = 1
      }
      out_commands[command_count++] = temp_point[0]
      out_commands[command_count++] = temp_point[1]
    }
  } else {
    const points_to_use = use_lod
      ? get_simplified_for_lod(stroke.points, 1 / lod, ensure_lod_scratch(stroke.points.length))
      : stroke.points

    for (let i = 0; i < points_to_use.length; i++) {
      const point = points_to_use[i]
      if (point === undefined) continue

      if (i === 0) {
        out_commands[command_count++] = 0
      } else {
        out_commands[command_count++] = 1
      }
      out_commands[command_count++] = point[0]
      out_commands[command_count++] = point[1]
    }
  }

  return command_count
}

export function render_stroke(stroke: stroke, renderer: renderer, zoom: number = 1.0): void {
  if (stroke.points.length === 0) return

  const lod = select_lod_from_zoom(zoom)
  const style = create_stroke_draw_style(stroke.style)

  if (stroke.points.length === 1) {
    const point = stroke.points[0]!
    const radius = stroke.style.width / 2
    renderer.draw_circle([point[0], point[1], radius], style)
    return
  }

  const use_spline = stroke.spline !== null && stroke.spline.point_count >= 2
  const use_lod = lod < lod_high

  if (use_spline && !use_lod) {
    const interval = get_spline_evaluation_interval(lod)
    const spline_length = get_spline_length(stroke.spline!)
    const first_segment = stroke.spline!.segments_x[0]!
    const last_segment = stroke.spline!.segments_x[stroke.spline!.segments_x.length - 1]!
    const t_start = first_segment.x_start
    const t_end = last_segment.x_end
    const steps = Math.max(2, Math.floor(spline_length / interval))
    const dt = (t_end - t_start) / steps
    const temp_point: vector2 = [0, 0]
    const points = ensure_lod_scratch(steps + 1)

    for (let i = 0; i <= steps; i++) {
      const t = t_start + i * dt
      evaluate_spline_at_t(stroke.spline!, t, temp_point)
      const p = points[i]!
      p[0] = temp_point[0]
      p[1] = temp_point[1]
    }

    renderer.draw_polyline(points.slice(0, steps + 1), style)
  } else {
    const points_to_use = use_lod
      ? get_simplified_for_lod(stroke.points, 1 / lod, ensure_lod_scratch(stroke.points.length))
      : stroke.points

    renderer.draw_polyline(points_to_use, style)
  }
}

function create_stroke_draw_style(style: stroke_style): draw_style {
  return {
    fill: null,
    stroke: style.color,
    stroke_width: style.width,
    line_cap: line_cap_round,
    line_join: line_join_round,
    miter_limit: 10,
    alpha: style.opacity,
  }
}

export function render_stroke_with_pressure(
  stroke: stroke,
  renderer: renderer,
  _zoom: number = 1.0,
): void {
  if (stroke.points.length < 2 || stroke.pressure === null) {
    render_stroke(stroke, renderer, _zoom)
    return
  }

  const points = stroke.points
  const pressure = stroke.pressure
  const base_style = create_stroke_draw_style(stroke.style)
  const base_width = stroke.style.width
  const sensitivity = stroke.style.pressure_sensitivity

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const pr1 = pressure[i] ?? 0.5
    const pr2 = pressure[i + 1] ?? pr1

    const avg_pressure = (pr1 + pr2) / 2
    const width = base_width * (1.0 + avg_pressure * sensitivity)

    renderer.draw_line(p1, p2, { ...base_style, stroke_width: width })
  }
}
