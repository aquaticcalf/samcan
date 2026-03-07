import type { vector2 } from "@/math/vector2"
import type { rectangle } from "@/math/rectangle"

export type circle = [number, number, number]

export function create_circle(x: number = 0, y: number = 0, radius: number = 0): circle {
  return [x, y, Math.max(0, radius)]
}

export function clone_circle(c: circle): circle {
  return [c[0], c[1], c[2]]
}

export function set_circle(x: number, y: number, radius: number, out: circle): circle {
  out[0] = x
  out[1] = y
  out[2] = Math.max(0, radius)
  return out
}

export function copy_circle(c: circle, out: circle): circle {
  out[0] = c[0]
  out[1] = c[1]
  out[2] = c[2]
  return out
}

export function center_of_circle(c: circle, out: vector2): vector2 {
  out[0] = c[0]
  out[1] = c[1]
  return out
}

export function radius_of_circle(c: circle): number {
  return c[2]
}

export function diameter_of_circle(c: circle): number {
  return c[2] * 2
}

export function area_of_circle(c: circle): number {
  return Math.PI * c[2] * c[2]
}

export function circumference_of_circle(c: circle): number {
  return Math.PI * c[2] * 2
}

export function contains_point_circle(c: circle, x: number, y: number): boolean {
  const dx = x - c[0]
  const dy = y - c[1]
  return dx * dx + dy * dy <= c[2] * c[2]
}

export function contains_circle(c1: circle, c2: circle): boolean {
  const dx = c2[0] - c1[0]
  const dy = c2[1] - c1[1]
  const distance = Math.sqrt(dx * dx + dy * dy)
  return distance + c2[2] <= c1[2]
}

export function intersects_circle(c1: circle, c2: circle): boolean {
  const dx = c2[0] - c1[0]
  const dy = c2[1] - c1[1]
  const distance = Math.sqrt(dx * dx + dy * dy)
  return distance <= c1[2] + c2[2]
}

export function intersects_rectangle_circle(c: circle, r: rectangle): boolean {
  const closestX = Math.max(r[0], Math.min(c[0], r[0] + r[2]))
  const closestY = Math.max(r[1], Math.min(c[1], r[1] + r[3]))
  const dx = c[0] - closestX
  const dy = c[1] - closestY
  return dx * dx + dy * dy <= c[2] * c[2]
}

export function distance_to_circle(c1: circle, c2: circle): number {
  const dx = c2[0] - c1[0]
  const dy = c2[1] - c1[1]
  const distance = Math.sqrt(dx * dx + dy * dy)
  return Math.max(0, distance - c1[2] - c2[2])
}

export function translate_circle(c: circle, dx: number, dy: number, out: circle): circle {
  out[0] = c[0] + dx
  out[1] = c[1] + dy
  out[2] = c[2]
  return out
}

export function scale_circle(c: circle, scale: number, out: circle): circle {
  out[0] = c[0] * scale
  out[1] = c[1] * scale
  out[2] = c[2] * scale
  return out
}

export function bounding_rectangle_circle(c: circle, out: rectangle): rectangle {
  out[0] = c[0] - c[2]
  out[1] = c[1] - c[2]
  out[2] = c[2] * 2
  out[3] = c[2] * 2
  return out
}

export function equals_circle(c1: circle, c2: circle, epsilon: number = 0.0001): boolean {
  return (
    Math.abs(c1[0] - c2[0]) < epsilon &&
    Math.abs(c1[1] - c2[1]) < epsilon &&
    Math.abs(c1[2] - c2[2]) < epsilon
  )
}

export function is_empty_circle(c: circle): boolean {
  return c[2] <= 0
}
