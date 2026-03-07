import type { camera } from "@/camera/camera"
import type { vector2 } from "@/math/vector2"
import type { rectangle } from "@/math/rectangle"
import type { frustum } from "@/math/frustum"
import type { transform } from "@/math/transform"

export type viewport = [number, number, number]

export function world_to_screen_camera(
  c: camera,
  v: viewport,
  world_pos: vector2,
  out: vector2,
): vector2 {
  const dx = world_pos[0] - c[0]
  const dy = world_pos[1] - c[1]

  const cos_r = Math.cos(c[3])
  const sin_r = Math.sin(c[3])

  const rotated_x = dx * cos_r - dy * sin_r
  const rotated_y = dx * sin_r + dy * cos_r

  const screen_x = rotated_x * c[2] + v[0] / 2
  const screen_y = rotated_y * c[2] + v[1] / 2

  out[0] = screen_x
  out[1] = screen_y
  return out
}

export function screen_to_world_camera(
  c: camera,
  v: viewport,
  screen_pos: vector2,
  out: vector2,
): vector2 {
  if (c[2] <= 0) {
    out[0] = c[0]
    out[1] = c[1]
    return out
  }

  const dx = screen_pos[0] - v[0] / 2
  const dy = screen_pos[1] - v[1] / 2

  const cos_r = Math.cos(-c[3])
  const sin_r = Math.sin(-c[3])

  const scaled_x = dx / c[2]
  const scaled_y = dy / c[2]

  const rotated_x = scaled_x * cos_r - scaled_y * sin_r
  const rotated_y = scaled_x * sin_r + scaled_y * cos_r

  out[0] = rotated_x + c[0]
  out[1] = rotated_y + c[1]
  return out
}

export function view_transform_camera(c: camera, out: transform): transform {
  const cos_r = Math.cos(c[3])
  const sin_r = Math.sin(c[3])

  out[0] = cos_r * c[2]
  out[1] = sin_r * c[2]
  out[2] = -sin_r * c[2]
  out[3] = cos_r * c[2]
  out[4] = -c[0] * cos_r * c[2] + c[1] * sin_r * c[2]
  out[5] = -c[0] * sin_r * c[2] - c[1] * cos_r * c[2]
  return out
}

export function inverse_view_transform_camera(c: camera, out: transform): transform {
  const cos_r = Math.cos(c[3])
  const sin_r = Math.sin(c[3])

  const safe_zoom = c[2] <= 0 ? 0.0001 : c[2]
  const inverse_zoom = 1 / safe_zoom

  out[0] = cos_r * inverse_zoom
  out[1] = -sin_r * inverse_zoom
  out[2] = sin_r * inverse_zoom
  out[3] = cos_r * inverse_zoom
  out[4] = c[0]
  out[5] = c[1]
  return out
}

export function camera_frustum(c: camera, v: viewport, out: frustum): frustum {
  if (c[2] <= 0) {
    out[0] = c[0]
    out[1] = c[0]
    out[2] = c[1]
    out[3] = c[1]
    out[4] = 0
    out[5] = Number.MAX_VALUE
    return out
  }

  const half_width = v[0] / (2 * c[2])
  const half_height = v[1] / (2 * c[2])

  if (c[3] === 0) {
    out[0] = c[0] - half_width
    out[1] = c[0] + half_width
    out[2] = c[1] + half_height
    out[3] = c[1] - half_height
    out[4] = 0
    out[5] = Number.MAX_VALUE
    return out
  }

  const cos_r = Math.abs(Math.cos(c[3]))
  const sin_r = Math.abs(Math.sin(c[3]))

  const x_extent = half_width * cos_r + half_height * sin_r
  const y_extent = half_width * sin_r + half_height * cos_r

  out[0] = c[0] - x_extent
  out[1] = c[0] + x_extent
  out[2] = c[1] + y_extent
  out[3] = c[1] - y_extent
  out[4] = 0
  out[5] = Number.MAX_VALUE
  return out
}

export function fit_camera_to_bounds(
  bounds: rectangle,
  v: viewport,
  margin: number = 0.1,
  out: camera,
): camera {
  const bounds_width = bounds[2]
  const bounds_height = bounds[3]

  if (bounds_width <= 0 || bounds_height <= 0) {
    out[0] = bounds[0]
    out[1] = bounds[1]
    out[2] = 1
    out[3] = 0
    return out
  }

  const viewport_width = v[0] * (1 - margin * 2)
  const viewport_height = v[1] * (1 - margin * 2)

  if (viewport_width <= 0 || viewport_height <= 0) {
    out[0] = bounds[0] + bounds_width / 2
    out[1] = bounds[1] + bounds_height / 2
    out[2] = 1
    out[3] = 0
    return out
  }

  const zoom_x = viewport_width / bounds_width
  const zoom_y = viewport_height / bounds_height
  const zoom = Math.min(zoom_x, zoom_y)

  const center_x = bounds[0] + bounds_width / 2
  const center_y = bounds[1] + bounds_height / 2

  out[0] = center_x
  out[1] = center_y
  out[2] = zoom
  out[3] = 0
  return out
}

export function contains_point_camera_frustum(
  c: camera,
  v: viewport,
  world_x: number,
  world_y: number,
): boolean {
  const dx = world_x - c[0]
  const dy = world_y - c[1]

  const cos_r = Math.cos(-c[3])
  const sin_r = Math.sin(-c[3])

  const rotated_x = dx * cos_r - dy * sin_r
  const rotated_y = dx * sin_r + dy * cos_r

  const scaled_x = rotated_x * c[2]
  const scaled_y = rotated_y * c[2]

  const half_width = v[0] / 2
  const half_height = v[1] / 2

  return (
    scaled_x >= -half_width &&
    scaled_x <= half_width &&
    scaled_y >= -half_height &&
    scaled_y <= half_height
  )
}

export function width_of_camera_world(c: camera, v: viewport): number {
  const safe_zoom = c[2] <= 0 ? 0.0001 : c[2]
  return v[0] / safe_zoom
}

export function height_of_camera_world(c: camera, v: viewport): number {
  const safe_zoom = c[2] <= 0 ? 0.0001 : c[2]
  return v[1] / safe_zoom
}

export function pixel_size_of_camera(c: camera): number {
  const safe_zoom = c[2] <= 0 ? 0.0001 : c[2]
  return 1 / safe_zoom
}

export function pixel_ratio_of_viewport(v: viewport): number {
  return v[2]
}

export function device_width_of_viewport(v: viewport): number {
  return v[0] * v[2]
}

export function device_height_of_viewport(v: viewport): number {
  return v[1] * v[2]
}

export function world_to_device_camera(
  c: camera,
  v: viewport,
  world_pos: vector2,
  out: vector2,
): vector2 {
  world_to_screen_camera(c, v, world_pos, out)
  out[0] = out[0] * v[2]
  out[1] = out[1] * v[2]
  return out
}

export function device_to_world_camera(
  c: camera,
  v: viewport,
  device_pos: vector2,
  out: vector2,
): vector2 {
  const screen_pos: vector2 = [device_pos[0] / v[2], device_pos[1] / v[2]]
  return screen_to_world_camera(c, v, screen_pos, out)
}
