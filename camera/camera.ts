export type camera = [number, number, number, number]

export type camera_limits = {
  readonly min_zoom: number
  readonly max_zoom: number
  readonly min_x: number
  readonly max_x: number
  readonly min_y: number
  readonly max_y: number
}

export type zoom_anchor = {
  readonly world_x: number
  readonly world_y: number
}

export function create_camera(
  x: number = 0,
  y: number = 0,
  zoom: number = 1,
  rotation: number = 0,
): camera {
  return [x, y, zoom, rotation]
}

export function clone_camera(c: camera): camera {
  return [c[0], c[1], c[2], c[3]]
}

export function copy_camera(c: camera, out: camera): camera {
  out[0] = c[0]
  out[1] = c[1]
  out[2] = c[2]
  out[3] = c[3]
  return out
}

export function set_camera(
  x: number,
  y: number,
  zoom: number,
  rotation: number,
  out: camera,
): camera {
  out[0] = x
  out[1] = y
  out[2] = zoom
  out[3] = rotation
  return out
}

export function x_of_camera(c: camera): number {
  return c[0]
}

export function y_of_camera(c: camera): number {
  return c[1]
}

export function zoom_of_camera(c: camera): number {
  return c[2]
}

export function rotation_of_camera(c: camera): number {
  return c[3]
}

export function position_of_camera(c: camera, out: [number, number]): [number, number] {
  out[0] = c[0]
  out[1] = c[1]
  return out
}

export function pan_camera(c: camera, dx: number, dy: number, out: camera): camera {
  out[0] = c[0] + dx
  out[1] = c[1] + dy
  out[2] = c[2]
  out[3] = c[3]
  return out
}

export function zoom_camera(c: camera, factor: number, out: camera): camera {
  out[0] = c[0]
  out[1] = c[1]
  out[2] = c[2] * factor
  out[3] = c[3]
  return out
}

export function zoom_at_camera(
  c: camera,
  factor: number,
  anchor: zoom_anchor,
  out: camera,
): camera {
  const world_dx = anchor.world_x - c[0]
  const world_dy = anchor.world_y - c[1]

  const new_zoom = c[2] * factor

  const new_world_x = anchor.world_x - world_dx / factor
  const new_world_y = anchor.world_y - world_dy / factor

  out[0] = new_world_x
  out[1] = new_world_y
  out[2] = new_zoom
  out[3] = c[3]
  return out
}

export function rotate_camera(c: camera, angle: number, out: camera): camera {
  out[0] = c[0]
  out[1] = c[1]
  out[2] = c[2]
  out[3] = c[3] + angle
  return out
}

export function clamp_camera(c: camera, limits: camera_limits, out: camera): camera {
  const clamped_zoom = Math.max(limits.min_zoom, Math.min(limits.max_zoom, c[2]))
  const clamped_x = Math.max(limits.min_x, Math.min(limits.max_x, c[0]))
  const clamped_y = Math.max(limits.min_y, Math.min(limits.max_y, c[1]))

  out[0] = clamped_x
  out[1] = clamped_y
  out[2] = clamped_zoom
  out[3] = c[3]
  return out
}

export function lerp_camera(a: camera, b: camera, t: number, out: camera): camera {
  const clamped_t = Math.max(0, Math.min(1, t))

  out[0] = a[0] + clamped_t * (b[0] - a[0])
  out[1] = a[1] + clamped_t * (b[1] - a[1])
  out[2] = a[2] + clamped_t * (b[2] - a[2])

  let rotation_diff = b[3] - a[3]
  while (rotation_diff > Math.PI) {
    rotation_diff = rotation_diff - 2 * Math.PI
  }
  while (rotation_diff < -Math.PI) {
    rotation_diff = rotation_diff + 2 * Math.PI
  }
  out[3] = a[3] + clamped_t * rotation_diff

  return out
}

export function smooth_damp_camera(
  current: camera,
  target: camera,
  velocity: camera,
  smooth_time: number,
  delta_time: number,
  out: camera,
): camera {
  const omega = 2 / Math.max(0.0001, smooth_time)
  const x = omega * delta_time
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)

  const delta_x = current[0] - target[0]
  const delta_y = current[1] - target[1]
  const delta_zoom = current[2] - target[2]

  let rotation_diff = target[3] - current[3]
  while (rotation_diff > Math.PI) {
    rotation_diff = rotation_diff - 2 * Math.PI
  }
  while (rotation_diff < -Math.PI) {
    rotation_diff = rotation_diff + 2 * Math.PI
  }
  const delta_rotation = -rotation_diff

  const temp_x = (velocity[0] + omega * delta_x) * delta_time
  const temp_y = (velocity[1] + omega * delta_y) * delta_time
  const temp_zoom = (velocity[2] + omega * delta_zoom) * delta_time
  const temp_rotation = (velocity[3] + omega * delta_rotation) * delta_time

  const new_velocity_x = (velocity[0] - omega * temp_x) * exp
  const new_velocity_y = (velocity[1] - omega * temp_y) * exp
  const new_velocity_zoom = (velocity[2] - omega * temp_zoom) * exp
  const new_velocity_rotation = (velocity[3] - omega * temp_rotation) * exp

  velocity[0] = new_velocity_x
  velocity[1] = new_velocity_y
  velocity[2] = new_velocity_zoom
  velocity[3] = new_velocity_rotation

  const result_x = target[0] + (delta_x + temp_x) * exp
  const result_y = target[1] + (delta_y + temp_y) * exp
  const result_zoom = target[2] + (delta_zoom + temp_zoom) * exp
  const result_rotation = target[3] + (delta_rotation + temp_rotation) * exp

  out[0] = result_x
  out[1] = result_y
  out[2] = result_zoom
  out[3] = result_rotation

  return out
}

export function equals_camera(c1: camera, c2: camera, epsilon: number = 0.0001): boolean {
  return (
    Math.abs(c1[0] - c2[0]) < epsilon &&
    Math.abs(c1[1] - c2[1]) < epsilon &&
    Math.abs(c1[2] - c2[2]) < epsilon &&
    Math.abs(c1[3] - c2[3]) < epsilon
  )
}

export function is_identity_camera(c: camera): boolean {
  return c[0] === 0 && c[1] === 0 && c[2] === 1 && c[3] === 0
}
