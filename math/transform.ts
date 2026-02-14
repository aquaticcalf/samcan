import type { vector2 } from "@/math/vector2"

export type transform = [number, number, number, number, number, number]

export function create_transform(
  a: number = 1,
  b: number = 0,
  c: number = 0,
  d: number = 1,
  tx: number = 0,
  ty: number = 0,
): transform {
  return [a, b, c, d, tx, ty]
}

export function clone_transform(t: transform): transform {
  return [t[0], t[1], t[2], t[3], t[4], t[5]]
}

export function set_transform(
  a: number,
  b: number,
  c: number,
  d: number,
  tx: number,
  ty: number,
  out: transform,
): transform {
  out[0] = a
  out[1] = b
  out[2] = c
  out[3] = d
  out[4] = tx
  out[5] = ty
  return out
}

export function copy_transform(t: transform, out: transform): transform {
  out[0] = t[0]
  out[1] = t[1]
  out[2] = t[2]
  out[3] = t[3]
  out[4] = t[4]
  out[5] = t[5]
  return out
}

export function identity_transform(): transform {
  return [1, 0, 0, 1, 0, 0]
}

export function set_identity_transform(out: transform): transform {
  out[0] = 1
  out[1] = 0
  out[2] = 0
  out[3] = 1
  out[4] = 0
  out[5] = 0
  return out
}

export function translate_transform(x: number, y: number): transform {
  return [1, 0, 0, 1, x, y]
}

export function scale_transform(sx: number, sy: number = sx): transform {
  return [sx, 0, 0, sy, 0, 0]
}

export function rotate_transform(angle: number): transform {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return [cos, sin, -sin, cos, 0, 0]
}

export function from_trs_transform(
  translation: vector2,
  rotation: number,
  scale: vector2,
): transform {
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  return [
    cos * scale[0],
    sin * scale[0],
    -sin * scale[1],
    cos * scale[1],
    translation[0],
    translation[1],
  ]
}

export function multiply_transform(t1: transform, t2: transform, out: transform): transform {
  out[0] = t1[0] * t2[0] + t1[2] * t2[1]
  out[1] = t1[1] * t2[0] + t1[3] * t2[1]
  out[2] = t1[0] * t2[2] + t1[2] * t2[3]
  out[3] = t1[1] * t2[2] + t1[3] * t2[3]
  out[4] = t1[0] * t2[4] + t1[2] * t2[5] + t1[4]
  out[5] = t1[1] * t2[4] + t1[3] * t2[5] + t1[5]
  return out
}

export function determinant_transform(t: transform): number {
  return t[0] * t[3] - t[1] * t[2]
}

export function invert_transform(t: transform, out: transform): transform | null {
  const det = determinant_transform(t)

  if (Math.abs(det) < 1e-10) {
    return null
  }

  const inverse_det = 1 / det

  out[0] = t[3] * inverse_det
  out[1] = -t[1] * inverse_det
  out[2] = -t[2] * inverse_det
  out[3] = t[0] * inverse_det
  out[4] = (t[2] * t[5] - t[3] * t[4]) * inverse_det
  out[5] = (t[1] * t[4] - t[0] * t[5]) * inverse_det
  return out
}

export function transform_point_transform(t: transform, point: vector2, out: vector2): vector2 {
  out[0] = t[0] * point[0] + t[2] * point[1] + t[4]
  out[1] = t[1] * point[0] + t[3] * point[1] + t[5]
  return out
}

export function transform_vector_transform(t: transform, vector: vector2, out: vector2): vector2 {
  out[0] = t[0] * vector[0] + t[2] * vector[1]
  out[1] = t[1] * vector[0] + t[3] * vector[1]
  return out
}

export function append_translation_transform(
  t: transform,
  x: number,
  y: number,
  out: transform,
): transform {
  const translation = translate_transform(x, y)
  return multiply_transform(t, translation, out)
}

export function append_rotation_transform(t: transform, angle: number, out: transform): transform {
  const rotation = rotate_transform(angle)
  return multiply_transform(t, rotation, out)
}

export function append_scale_transform(
  t: transform,
  sx: number,
  sy: number = sx,
  out: transform,
): transform {
  const scale = scale_transform(sx, sy)
  return multiply_transform(t, scale, out)
}

export function prepend_translation_transform(
  x: number,
  y: number,
  t: transform,
  out: transform,
): transform {
  const translation = translate_transform(x, y)
  return multiply_transform(translation, t, out)
}

export function prepend_rotation_transform(angle: number, t: transform, out: transform): transform {
  const rotation = rotate_transform(angle)
  return multiply_transform(rotation, t, out)
}

export function prepend_scale_transform(
  sx: number,
  sy: number = sx,
  t: transform,
  out: transform,
): transform {
  const scale = scale_transform(sx, sy)
  return multiply_transform(scale, t, out)
}

export function equals_transform(t1: transform, t2: transform, epsilon: number = 0.0001): boolean {
  return (
    Math.abs(t1[0] - t2[0]) < epsilon &&
    Math.abs(t1[1] - t2[1]) < epsilon &&
    Math.abs(t1[2] - t2[2]) < epsilon &&
    Math.abs(t1[3] - t2[3]) < epsilon &&
    Math.abs(t1[4] - t2[4]) < epsilon &&
    Math.abs(t1[5] - t2[5]) < epsilon
  )
}

export function is_identity_transform(t: transform, epsilon: number = 0.0001): boolean {
  const identity = identity_transform()
  return equals_transform(t, identity, epsilon)
}
