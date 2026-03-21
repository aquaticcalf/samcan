import type { rectangle } from "@/math/rectangle"
import type { vector2 } from "@/math/vector2"

export function contains_with_padding_editor(
  bounds: rectangle,
  x: number,
  y: number,
  padding: number,
): boolean {
  return (
    x >= bounds[0] - padding &&
    x <= bounds[0] + bounds[2] + padding &&
    y >= bounds[1] - padding &&
    y <= bounds[1] + bounds[3] + padding
  )
}

export function distance_point_to_segment_editor(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  if (dx === 0 && dy === 0) {
    return Math.hypot(px - ax, py - ay)
  }
  const length_sq = dx * dx + dy * dy
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length_sq))
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

export function contains_ellipse_editor(
  bounds: rectangle,
  x: number,
  y: number,
  padding: number,
): boolean {
  const cx = bounds[0] + bounds[2] / 2
  const cy = bounds[1] + bounds[3] / 2
  const rx = Math.max(0.001, bounds[2] / 2 + padding)
  const ry = Math.max(0.001, bounds[3] / 2 + padding)
  const nx = (x - cx) / rx
  const ny = (y - cy) / ry
  return nx * nx + ny * ny <= 1
}

export function contains_polyline_editor(
  points: readonly vector2[],
  x: number,
  y: number,
  radius: number,
): boolean {
  if (points.length === 0) {
    return false
  }
  if (points.length === 1) {
    const p = points[0]
    return p !== undefined && Math.hypot(x - p[0], y - p[1]) <= radius
  }
  for (let i = 1; i < points.length; i = i + 1) {
    const a = points[i - 1]
    const b = points[i]
    if (a === undefined || b === undefined) {
      continue
    }
    if (distance_point_to_segment_editor(x, y, a[0], a[1], b[0], b[1]) <= radius) {
      return true
    }
  }
  return false
}
