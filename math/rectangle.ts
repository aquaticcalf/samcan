import type { vector2 } from "@/math/vector2"

export type rectangle = [number, number, number, number]

export function create_rectangle(
  x: number = 0,
  y: number = 0,
  width: number = 0,
  height: number = 0,
): rectangle {
  return [x, y, width, height]
}

export function clone_rectangle(r: rectangle): rectangle {
  return [r[0], r[1], r[2], r[3]]
}

export function from_center_rectangle(
  center: vector2,
  width: number,
  height: number,
  out: rectangle,
): rectangle {
  out[0] = center[0] - width / 2
  out[1] = center[1] - height / 2
  out[2] = width
  out[3] = height
  return out
}

export function top_of_rectangle(r: rectangle): number {
  return r[1] + r[3]
}

export function left_of_rectangle(r: rectangle): number {
  return r[0]
}

export function right_of_rectangle(r: rectangle): number {
  return r[0] + r[2]
}

export function bottom_of_rectangle(r: rectangle): number {
  return r[1]
}

export function center_of_rectangle(r: rectangle, out: vector2): vector2 {
  out[0] = r[0] + r[2] / 2
  out[1] = r[1] + r[3] / 2
  return out
}

export function width_of_rectangle(r: rectangle): number {
  return r[2]
}

export function height_of_rectangle(r: rectangle): number {
  return r[3]
}

export function area_of_rectangle(r: rectangle): number {
  return r[2] * r[3]
}

export function set_rectangle(
  x: number,
  y: number,
  width: number,
  height: number,
  out: rectangle,
): rectangle {
  out[0] = x
  out[1] = y
  out[2] = width
  out[3] = height
  return out
}

export function translate_rectangle(
  r: rectangle,
  dx: number,
  dy: number,
  out: rectangle,
): rectangle {
  out[0] = r[0] + dx
  out[1] = r[1] + dy
  out[2] = r[2]
  out[3] = r[3]
  return out
}

export function scale_rectangle(r: rectangle, scale: number, out: rectangle): rectangle {
  out[0] = r[0] * scale
  out[1] = r[1] * scale
  out[2] = r[2] * scale
  out[3] = r[3] * scale
  return out
}

export function contains_point_rectangle(r: rectangle, x: number, y: number): boolean {
  return x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]
}

export function contains_rectangle(r1: rectangle, r2: rectangle): boolean {
  return (
    r2[0] >= r1[0] &&
    r2[1] >= r1[1] &&
    r2[0] + r2[2] <= r1[0] + r1[2] &&
    r2[1] + r2[3] <= r1[1] + r1[3]
  )
}

export function intersects_rectangle(r1: rectangle, r2: rectangle): boolean {
  return (
    r1[0] < r2[0] + r2[2] && r1[0] + r1[2] > r2[0] && r1[1] < r2[1] + r2[3] && r1[1] + r1[3] > r2[1]
  )
}

export function intersection_rectangle(
  r1: rectangle,
  r2: rectangle,
  out: rectangle,
): rectangle | null {
  const x1 = Math.max(r1[0], r2[0])
  const y1 = Math.max(r1[1], r2[1])
  const x2 = Math.min(r1[0] + r1[2], r2[0] + r2[2])
  const y2 = Math.min(r1[1] + r1[3], r2[1] + r2[3])

  if (x2 <= x1 || y2 <= y1) {
    return null
  }

  out[0] = x1
  out[1] = y1
  out[2] = x2 - x1
  out[3] = y2 - y1
  return out
}

export function union_rectangle(r1: rectangle, r2: rectangle, out: rectangle): rectangle {
  const x1 = Math.min(r1[0], r2[0])
  const y1 = Math.min(r1[1], r2[1])
  const x2 = Math.max(r1[0] + r1[2], r2[0] + r2[2])
  const y2 = Math.max(r1[1] + r1[3], r2[1] + r2[3])

  out[0] = x1
  out[1] = y1
  out[2] = x2 - x1
  out[3] = y2 - y1
  return out
}

export function expand_rectangle(r: rectangle, amount: number, out: rectangle): rectangle {
  out[0] = r[0] - amount
  out[1] = r[1] - amount
  out[2] = r[2] + amount * 2
  out[3] = r[3] + amount * 2
  return out
}

export function is_empty_rectangle(r: rectangle): boolean {
  return r[2] <= 0 || r[3] <= 0
}

export function equals_rectangle(r1: rectangle, r2: rectangle): boolean {
  return r1[0] === r2[0] && r1[1] === r2[1] && r1[2] === r2[2] && r1[3] === r2[3]
}
