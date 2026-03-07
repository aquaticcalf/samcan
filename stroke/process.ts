import type { vector2 } from "@/math/vector2"
import type { rectangle } from "@/math/rectangle"
import type { spline } from "@/math/spline"
import type { stroke_style } from "./stroke"
import { simplify_douglas_peucker, estimate_epsilon_from_points } from "@/math/simplify"
import { build_natural_spline_from_points, simplify_points_for_spline } from "@/math/spline"

export const default_simplify_epsilon = 1.0
export const default_lod_simplify_factor = 3.0

export function simplify_stroke_points(
  points: vector2[],
  epsilon: number = default_simplify_epsilon,
  out: vector2[],
): number {
  return simplify_douglas_peucker(points, epsilon, out)
}

export function simplify_stroke_points_auto(points: vector2[], out: vector2[]): number {
  const epsilon = estimate_epsilon_from_points(points, 0.1)
  return simplify_douglas_peucker(points, epsilon, out)
}

export function fit_spline_to_stroke(points: vector2[], out_spline: spline): spline {
  if (points.length < 2) {
    out_spline.segments_x = []
    out_spline.segments_y = []
    out_spline.point_count = 0
    return out_spline
  }

  const simplified_for_spline = simplify_points_for_spline(points, 2.0)

  return build_natural_spline_from_points(simplified_for_spline, out_spline)
}

export function compute_stroke_bounds(points: vector2[], width: number, out: rectangle): rectangle {
  if (points.length === 0) {
    out[0] = 0
    out[1] = 0
    out[2] = 0
    out[3] = 0
    return out
  }

  let min_x = Infinity
  let min_y = Infinity
  let max_x = -Infinity
  let max_y = -Infinity

  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    if (point === undefined) continue

    min_x = Math.min(min_x, point[0])
    min_y = Math.min(min_y, point[1])
    max_x = Math.max(max_x, point[0])
    max_y = Math.max(max_y, point[1])
  }

  const half_width = width / 2
  out[0] = min_x - half_width
  out[1] = min_y - half_width
  out[2] = max_x - min_x + width
  out[3] = max_y - min_y + width

  return out
}

export function process_stroke(
  points: vector2[],
  pressure: number[] | null,
  style: stroke_style,
  out_simplified: vector2[],
  out_spline: spline,
): {
  simplified: vector2[]
  spline: spline
} {
  const simplified_count = simplify_stroke_points(points, default_simplify_epsilon, out_simplified)
  const simplified = out_simplified.slice(0, simplified_count)

  fit_spline_to_stroke(simplified, out_spline)

  return {
    simplified,
    spline: out_spline,
  }
}

export function get_simplified_for_lod(
  points: vector2[],
  lod_level: number,
  out: vector2[],
): vector2[] {
  const lod_epsilon = default_simplify_epsilon * (lod_level * default_lod_simplify_factor)
  const simplified_count = simplify_douglas_peucker(points, lod_epsilon, out)
  return out.slice(0, simplified_count)
}
