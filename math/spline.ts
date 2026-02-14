import type { vector2 } from "@/math/vector2"

export type spline_segment = {
  a: number
  b: number
  c: number
  d: number
  x_start: number
  x_end: number
}

export type spline = {
  segments_x: spline_segment[]
  segments_y: spline_segment[]
  point_count: number
}

export function create_spline(): spline {
  return {
    segments_x: [],
    segments_y: [],
    point_count: 0,
  }
}

export function clone_spline(s: spline): spline {
  return {
    segments_x: s.segments_x.map((seg) => ({ ...seg })),
    segments_y: s.segments_y.map((seg) => ({ ...seg })),
    point_count: s.point_count,
  }
}

export function build_natural_spline_1d(points: number[], t_values: number[]): spline_segment[] {
  const n = points.length
  if (n < 2) return []
  if (n === 2) {
    const slope = (points[1]! - points[0]!) / (t_values[1]! - t_values[0]!)
    return [
      {
        a: points[0]!,
        b: slope,
        c: 0,
        d: 0,
        x_start: t_values[0]!,
        x_end: t_values[1]!,
      },
    ]
  }

  const h = Array.from({ length: n - 1 }, () => 0)
  for (let i = 0; i < n - 1; i++) {
    h[i] = t_values[i + 1]! - t_values[i]!
  }

  const alpha = Array.from({ length: n - 1 }, () => 0)
  for (let i = 1; i < n - 1; i++) {
    alpha[i] =
      (3 / h[i]!) * (points[i + 1]! - points[i]!) - (3 / h[i - 1]!) * (points[i]! - points[i - 1]!)
  }

  const l = Array.from({ length: n }, () => 0)
  const mu = Array.from({ length: n }, () => 0)
  const z = Array.from({ length: n }, () => 0)

  l[0] = 1
  mu[0] = 0
  z[0] = 0

  for (let i = 1; i < n - 1; i++) {
    l[i] = 2 * (t_values[i + 1]! - t_values[i - 1]!) - h[i - 1]! * mu[i - 1]!
    mu[i] = h[i]! / l[i]!
    z[i] = (alpha[i]! - h[i - 1]! * z[i - 1]!) / l[i]!
  }

  l[n - 1] = 1
  z[n - 1] = 0

  const c = Array.from({ length: n }, () => 0)
  c[n - 1] = 0

  for (let j = n - 2; j >= 0; j--) {
    c[j] = z[j]! - mu[j]! * c[j + 1]!
  }

  const segments: spline_segment[] = []

  for (let i = 0; i < n - 1; i++) {
    const a = points[i]!
    const b = (points[i + 1]! - points[i]!) / h[i]! - (h[i]! * (c[i + 1]! + 2 * c[i]!)) / 3
    const d = (c[i + 1]! - c[i]!) / (3 * h[i]!)

    segments.push({
      a,
      b,
      c: c[i]!,
      d,
      x_start: t_values[i]!,
      x_end: t_values[i + 1]!,
    })
  }

  return segments
}

export function build_natural_spline_from_points(points: vector2[], spline: spline): spline {
  const n = points.length
  if (n < 2) {
    spline.segments_x = []
    spline.segments_y = []
    spline.point_count = 0
    return spline
  }

  const t_values = Array.from({ length: n }, () => 0)
  t_values[0] = 0

  for (let i = 1; i < n; i++) {
    const dx = points[i]![0] - points[i - 1]![0]
    const dy = points[i]![1] - points[i - 1]![1]
    const distance = Math.sqrt(dx * dx + dy * dy)
    t_values[i] = t_values[i - 1]! + distance
  }

  const x_coords = points.map((p) => p[0])
  const y_coords = points.map((p) => p[1])

  spline.segments_x = build_natural_spline_1d(x_coords, t_values)
  spline.segments_y = build_natural_spline_1d(y_coords, t_values)
  spline.point_count = n

  return spline
}

export function evaluate_spline_segment(segment: spline_segment, t: number): number {
  const dt = t - segment.x_start
  return segment.a + segment.b * dt + segment.c * dt * dt + segment.d * dt * dt * dt
}

export function evaluate_spline_at_t(spline: spline, t: number, out: vector2): vector2 | null {
  if (spline.segments_x.length === 0 || spline.segments_y.length === 0) {
    return null
  }

  let segment_x: spline_segment | null = null
  let segment_y: spline_segment | null = null

  for (let i = 0; i < spline.segments_x.length; i++) {
    const seg_x = spline.segments_x[i]!
    const seg_y = spline.segments_y[i]!
    if (t >= seg_x.x_start && t <= seg_x.x_end) {
      segment_x = seg_x
      segment_y = seg_y
      break
    }
  }

  if (!segment_x || !segment_y) {
    const last_idx = spline.segments_x.length - 1
    if (t > spline.segments_x[last_idx]!.x_end) {
      segment_x = spline.segments_x[last_idx]!
      segment_y = spline.segments_y[last_idx]!
      t = segment_x.x_end
    } else {
      segment_x = spline.segments_x[0]!
      segment_y = spline.segments_y[0]!
      t = segment_x.x_start
    }
  }

  out[0] = evaluate_spline_segment(segment_x, t)
  out[1] = evaluate_spline_segment(segment_y, t)
  return out
}

export function evaluate_spline_at_points(
  spline: spline,
  t_values: number[],
  out_points: vector2[],
): number {
  let valid_count = 0
  const temp_point = [0, 0] as vector2

  for (let i = 0; i < t_values.length; i++) {
    const t_val = t_values[i]!
    if (evaluate_spline_at_t(spline, t_val, temp_point)) {
      out_points[valid_count]![0] = temp_point[0]
      out_points[valid_count]![1] = temp_point[1]
      valid_count = valid_count + 1
    }
  }

  return valid_count
}

export function get_spline_length(spline: spline, steps: number = 100): number {
  if (spline.segments_x.length === 0) return 0

  const first_segment = spline.segments_x[0]!
  const last_segment = spline.segments_x[spline.segments_x.length - 1]!
  const t_start = first_segment.x_start
  const t_end = last_segment.x_end
  const dt = (t_end - t_start) / steps

  let length = 0
  const prev = [0, 0] as vector2
  const curr = [0, 0] as vector2

  evaluate_spline_at_t(spline, t_start, prev)

  for (let i = 1; i <= steps; i++) {
    const t = t_start + i * dt
    if (evaluate_spline_at_t(spline, t, curr)) {
      const dx = curr[0] - prev[0]
      const dy = curr[1] - prev[1]
      length = length + Math.sqrt(dx * dx + dy * dy)
      prev[0] = curr[0]
      prev[1] = curr[1]
    }
  }

  return length
}

export function simplify_points_for_spline(points: vector2[], tolerance: number = 1.0): vector2[] {
  if (points.length <= 2) return [...points]

  const simplified: vector2[] = [points[0]!]

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!
    const curr = points[i]!
    const next = points[i + 1]!

    const dx1 = curr[0] - prev[0]
    const dy1 = curr[1] - prev[1]
    const dx2 = next[0] - curr[0]
    const dy2 = next[1] - curr[1]

    const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)

    if (dist1 < tolerance && dist2 < tolerance) {
      if (dist1 > 0 && dist2 > 0) {
        const dot = (dx1 * dx2 + dy1 * dy2) / (dist1 * dist2)
        if (dot > 0.99) {
          continue
        }
      } else {
        continue
      }
    }

    simplified.push(curr)
  }

  simplified.push(points[points.length - 1]!)
  return simplified
}
