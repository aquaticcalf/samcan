import type { vector2 } from "@/math/vector2"

export type simplify_result = {
  points: vector2[]
  original_count: number
  simplified_count: number
  reduction_ratio: number
}

export function create_simplify_result(): simplify_result {
  return {
    points: [],
    original_count: 0,
    simplified_count: 0,
    reduction_ratio: 0,
  }
}

export function clone_simplify_result(result: simplify_result): simplify_result {
  return {
    points: result.points.map((point) => [point[0], point[1]] as vector2),
    original_count: result.original_count,
    simplified_count: result.simplified_count,
    reduction_ratio: result.reduction_ratio,
  }
}

export function copy_simplify_result(
  result: simplify_result,
  out: simplify_result,
): simplify_result {
  out.points = result.points.map((point) => [point[0], point[1]] as vector2)
  out.original_count = result.original_count
  out.simplified_count = result.simplified_count
  out.reduction_ratio = result.reduction_ratio
  return out
}

export function perpendicular_distance_to_line(
  point: vector2,
  line_start: vector2,
  line_end: vector2,
): number {
  const dx = line_end[0] - line_start[0]
  const dy = line_end[1] - line_start[1]

  if (dx === 0 && dy === 0) {
    const px = point[0] - line_start[0]
    const py = point[1] - line_start[1]
    return Math.sqrt(px * px + py * py)
  }

  const numerator = Math.abs(
    dy * point[0] - dx * point[1] + line_end[0] * line_start[1] - line_end[1] * line_start[0],
  )
  const denominator = Math.sqrt(dx * dx + dy * dy)

  return numerator / denominator
}

export function find_farthest_point(
  points: vector2[],
  start_index: number,
  end_index: number,
  out_result: { index: number; distance: number },
): { index: number; distance: number } {
  let max_distance = 0
  let farthest_index = -1

  const line_start = points[start_index]!
  const line_end = points[end_index]!

  for (let i = start_index + 1; i < end_index; i++) {
    const distance = perpendicular_distance_to_line(points[i]!, line_start, line_end)
    if (distance > max_distance) {
      max_distance = distance
      farthest_index = i
    }
  }

  out_result.index = farthest_index
  out_result.distance = max_distance
  return out_result
}

function douglas_peucker_recursive(
  points: vector2[],
  start_index: number,
  end_index: number,
  epsilon: number,
  keep_flags: boolean[],
): void {
  if (end_index <= start_index + 1) {
    return
  }

  const farthest_result = { index: -1, distance: 0 }
  find_farthest_point(points, start_index, end_index, farthest_result)

  if (farthest_result.index === -1 || farthest_result.distance <= epsilon) {
    return
  }

  keep_flags[farthest_result.index] = true

  douglas_peucker_recursive(points, start_index, farthest_result.index, epsilon, keep_flags)
  douglas_peucker_recursive(points, farthest_result.index, end_index, epsilon, keep_flags)
}

export function simplify_douglas_peucker(
  points: vector2[],
  epsilon: number,
  out_points: vector2[],
): number {
  if (points.length <= 2) {
    for (let i = 0; i < points.length; i++) {
      out_points[i] = [points[i]![0], points[i]![1]]
    }
    return points.length
  }

  const keep_flags = Array.from({ length: points.length }, () => false)
  keep_flags[0] = true
  keep_flags[points.length - 1] = true

  douglas_peucker_recursive(points, 0, points.length - 1, epsilon, keep_flags)

  let result_count = 0
  for (let i = 0; i < points.length; i++) {
    if (keep_flags[i]) {
      out_points[result_count] = [points[i]![0], points[i]![1]]
      result_count = result_count + 1
    }
  }

  return result_count
}

export function simplify_douglas_peucker_detailed(
  points: vector2[],
  epsilon: number,
  out_result: simplify_result,
): simplify_result {
  const temp_points = Array.from({ length: points.length }, () => [0, 0] as vector2)
  const simplified_count = simplify_douglas_peucker(points, epsilon, temp_points)

  out_result.points = temp_points.slice(0, simplified_count)
  out_result.original_count = points.length
  out_result.simplified_count = simplified_count
  out_result.reduction_ratio =
    points.length > 0 ? (points.length - simplified_count) / points.length : 0

  return out_result
}

export function estimate_epsilon_from_points(
  points: vector2[],
  tolerance_factor: number = 0.1,
): number {
  if (points.length < 2) {
    return 1.0
  }

  let total_distance = 0
  let segment_count = 0

  for (let i = 1; i < points.length; i++) {
    const dx = points[i]![0] - points[i - 1]![0]
    const dy = points[i]![1] - points[i - 1]![1]
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 0) {
      total_distance = total_distance + distance
      segment_count = segment_count + 1
    }
  }

  if (segment_count === 0) {
    return 1.0
  }

  const average_distance = total_distance / segment_count
  return average_distance * tolerance_factor
}

export function polyline_length(points: vector2[]): number {
  if (points.length < 2) {
    return 0
  }

  let total_length = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i]![0] - points[i - 1]![0]
    const dy = points[i]![1] - points[i - 1]![1]
    total_length = total_length + Math.sqrt(dx * dx + dy * dy)
  }

  return total_length
}

export function polyline_area_under_curve(points: vector2[]): number {
  if (points.length < 2) {
    return 0
  }

  let area = 0
  for (let i = 1; i < points.length; i++) {
    const x1 = points[i - 1]![0]
    const y1 = points[i - 1]![1]
    const x2 = points[i]![0]
    const y2 = points[i]![1]

    area = area + (x2 - x1) * (y1 + y2) * 0.5
  }

  return Math.abs(area)
}

export function validate_simplified_polyline(points: vector2[]): boolean {
  if (points.length < 4) {
    return true
  }

  for (let i = 0; i < points.length - 3; i++) {
    for (let j = i + 2; j < points.length - 1; j++) {
      const p1 = points[i]!
      const p2 = points[i + 1]!
      const p3 = points[j]!
      const p4 = points[j + 1]!

      if (line_segments_intersect(p1, p2, p3, p4)) {
        return false
      }
    }
  }

  return true
}

function line_segments_intersect(p1: vector2, p2: vector2, p3: vector2, p4: vector2): boolean {
  const d1 = direction(p3, p4, p1)
  const d2 = direction(p3, p4, p2)
  const d3 = direction(p1, p2, p3)
  const d4 = direction(p1, p2, p4)

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }

  if (d1 === 0 && on_segment(p3, p1, p4)) return true
  if (d2 === 0 && on_segment(p3, p2, p4)) return true
  if (d3 === 0 && on_segment(p1, p3, p2)) return true
  if (d4 === 0 && on_segment(p1, p4, p2)) return true

  return false
}

function direction(pi: vector2, pj: vector2, pk: vector2): number {
  return (pk[0] - pi[0]) * (pj[1] - pi[1]) - (pj[0] - pi[0]) * (pk[1] - pi[1])
}

function on_segment(pi: vector2, pj: vector2, pk: vector2): boolean {
  return (
    Math.min(pi[0], pk[0]) <= pj[0] &&
    pj[0] <= Math.max(pi[0], pk[0]) &&
    Math.min(pi[1], pk[1]) <= pj[1] &&
    pj[1] <= Math.max(pi[1], pk[1])
  )
}
