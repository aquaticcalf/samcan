import type { vector2 } from "@/math/vector2"

export type bezier_cubic = [vector2, vector2, vector2, vector2]
export type bezier_quadratic = [vector2, vector2, vector2]

export function create_cubic_bezier(
  p0: vector2,
  p1: vector2,
  p2: vector2,
  p3: vector2,
): bezier_cubic {
  return [p0, p1, p2, p3]
}

export function create_quadratic_bezier(p0: vector2, p1: vector2, p2: vector2): bezier_quadratic {
  return [p0, p1, p2]
}

export function clone_cubic_bezier(b: bezier_cubic): bezier_cubic {
  return [
    [b[0][0], b[0][1]],
    [b[1][0], b[1][1]],
    [b[2][0], b[2][1]],
    [b[3][0], b[3][1]],
  ]
}

export function clone_quadratic_bezier(b: bezier_quadratic): bezier_quadratic {
  return [
    [b[0][0], b[0][1]],
    [b[1][0], b[1][1]],
    [b[2][0], b[2][1]],
  ]
}

export function evaluate_cubic_bezier(b: bezier_cubic, t: number, out: vector2): vector2 {
  const t2 = t * t
  const t3 = t2 * t
  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt

  out[0] = mt3 * b[0][0] + 3 * mt2 * t * b[1][0] + 3 * mt * t2 * b[2][0] + t3 * b[3][0]
  out[1] = mt3 * b[0][1] + 3 * mt2 * t * b[1][1] + 3 * mt * t2 * b[2][1] + t3 * b[3][1]
  return out
}

export function evaluate_quadratic_bezier(b: bezier_quadratic, t: number, out: vector2): vector2 {
  const t2 = t * t
  const mt = 1 - t
  const mt2 = mt * mt

  out[0] = mt2 * b[0][0] + 2 * mt * t * b[1][0] + t2 * b[2][0]
  out[1] = mt2 * b[0][1] + 2 * mt * t * b[1][1] + t2 * b[2][1]
  return out
}

export function derivative_cubic_bezier(b: bezier_cubic, t: number, out: vector2): vector2 {
  const t2 = t * t
  const mt = 1 - t
  const mt2 = mt * mt

  out[0] =
    3 * mt2 * (b[1][0] - b[0][0]) + 6 * mt * t * (b[2][0] - b[1][0]) + 3 * t2 * (b[3][0] - b[2][0])
  out[1] =
    3 * mt2 * (b[1][1] - b[0][1]) + 6 * mt * t * (b[2][1] - b[1][1]) + 3 * t2 * (b[3][1] - b[2][1])
  return out
}

export function derivative_quadratic_bezier(b: bezier_quadratic, t: number, out: vector2): vector2 {
  const mt = 1 - t

  out[0] = 2 * mt * (b[1][0] - b[0][0]) + 2 * t * (b[2][0] - b[1][0])
  out[1] = 2 * mt * (b[1][1] - b[0][1]) + 2 * t * (b[2][1] - b[1][1])
  return out
}

export function length_cubic_bezier(b: bezier_cubic, steps: number = 20): number {
  let length = 0
  const step = 1 / steps
  const previous = [0, 0] as vector2
  const current = [0, 0] as vector2

  evaluate_cubic_bezier(b, 0, previous)

  for (let i = 1; i <= steps; i++) {
    evaluate_cubic_bezier(b, i * step, current)
    const dx = current[0] - previous[0]
    const dy = current[1] - previous[1]
    length += Math.sqrt(dx * dx + dy * dy)
    previous[0] = current[0]
    previous[1] = current[1]
  }

  return length
}

export function length_quadratic_bezier(b: bezier_quadratic, steps: number = 20): number {
  let length = 0
  const step = 1 / steps
  const previous = [0, 0] as vector2
  const current = [0, 0] as vector2

  evaluate_quadratic_bezier(b, 0, previous)

  for (let i = 1; i <= steps; i++) {
    evaluate_quadratic_bezier(b, i * step, current)
    const dx = current[0] - previous[0]
    const dy = current[1] - previous[1]
    length += Math.sqrt(dx * dx + dy * dy)
    previous[0] = current[0]
    previous[1] = current[1]
  }

  return length
}

export function subdivide_cubic_bezier(
  b: bezier_cubic,
  t: number,
  out1: bezier_cubic,
  out2: bezier_cubic,
): void {
  const mt = 1 - t

  const q0 = [mt * b[0][0] + t * b[1][0], mt * b[0][1] + t * b[1][1]] as vector2
  const q1 = [mt * b[1][0] + t * b[2][0], mt * b[1][1] + t * b[2][1]] as vector2
  const q2 = [mt * b[2][0] + t * b[3][0], mt * b[2][1] + t * b[3][1]] as vector2

  const r0 = [mt * q0[0] + t * q1[0], mt * q0[1] + t * q1[1]] as vector2
  const r1 = [mt * q1[0] + t * q2[0], mt * q1[1] + t * q2[1]] as vector2

  const s = [mt * r0[0] + t * r1[0], mt * r0[1] + t * r1[1]] as vector2

  out1[0] = b[0]
  out1[1] = q0
  out1[2] = r0
  out1[3] = s

  out2[0] = s
  out2[1] = r1
  out2[2] = q2
  out2[3] = b[3]
}

export function closest_point_cubic_bezier(
  b: bezier_cubic,
  point: vector2,
  steps: number = 50,
): number {
  let min_distance = Infinity
  let closest_t = 0
  const step = 1 / steps
  const current = [0, 0] as vector2

  for (let i = 0; i <= steps; i++) {
    const t = i * step
    evaluate_cubic_bezier(b, t, current)
    const dx = current[0] - point[0]
    const dy = current[1] - point[1]
    const distance = dx * dx + dy * dy

    if (distance < min_distance) {
      min_distance = distance
      closest_t = t
    }
  }

  return closest_t
}

export function from_points_cubic_bezier(points: vector2[], out: bezier_cubic[]): number {
  if (points.length < 2) return 0
  if (points.length === 2) {
    const p0 = points[0]!
    const p1 = points[1]!
    const dx = (p1[0] - p0[0]) / 3
    const dy = (p1[1] - p0[1]) / 3
    out[0] = create_cubic_bezier(p0, [p0[0] + dx, p0[1] + dy], [p1[0] - dx, p1[1] - dy], p1)
    return 1
  }

  let curve_count = 0
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]!
    const p3 = points[i + 1]!

    const dx = p3[0] - p0[0]
    const dy = p3[1] - p0[1]
    const p1: vector2 = [p0[0] + dx * 0.25, p0[1] + dy * 0.25]
    const p2: vector2 = [p0[0] + dx * 0.75, p0[1] + dy * 0.75]

    out[curve_count] = create_cubic_bezier(p0, p1, p2, p3)
    curve_count = curve_count + 1
  }

  return curve_count
}
