import type { camera } from "@/camera/camera"
import type { viewport } from "@/camera/projection"
import type { vector2 } from "@/math/vector2"
import type { rectangle } from "@/math/rectangle"
import type { transform } from "@/math/transform"
import type { engine } from "@/engine/types"
import { camera_frustum, screen_to_world_camera, world_to_screen_camera } from "@/camera/projection"
import { pan_camera, set_camera, zoom_at_camera, zoom_camera } from "@/camera/camera"
import {
  max_zoom_engine,
  min_zoom_engine,
  scratch_camera,
  scratch_frustum,
  scratch_screen,
  scratch_world,
} from "@/engine/shared"

export function set_camera_engine(
  state: engine,
  x: number,
  y: number,
  zoom: number,
  rotation: number = 0,
): engine {
  set_camera(
    sanitize_number_engine(x, state.camera[0]),
    sanitize_number_engine(y, state.camera[1]),
    sanitize_zoom_engine(zoom, state.camera[2]),
    sanitize_number_engine(rotation, state.camera[3]),
    state.camera,
  )
  return state
}

export function pan_engine(state: engine, dx: number, dy: number): engine {
  pan_camera(state.camera, dx, dy, scratch_camera)
  copy_camera_into_engine(state, scratch_camera)
  return state
}

export function zoom_engine(state: engine, factor: number): engine {
  zoom_camera(state.camera, factor, scratch_camera)
  copy_camera_into_engine(state, scratch_camera)
  return state
}

export function zoom_at_engine(
  state: engine,
  factor: number,
  screen_x: number,
  screen_y: number,
): engine {
  scratch_screen[0] = screen_x
  scratch_screen[1] = screen_y
  screen_to_world_camera(state.camera, state.viewport, scratch_screen, scratch_world)

  zoom_at_camera(
    state.camera,
    factor,
    {
      screen_x,
      screen_y,
      world_x: scratch_world[0],
      world_y: scratch_world[1],
    },
    scratch_camera,
  )
  copy_camera_into_engine(state, scratch_camera)
  return state
}

export function resize_engine(
  state: engine,
  width: number,
  height: number,
  pixel_ratio: number = Math.max(1, globalThis.devicePixelRatio || 1),
): engine {
  const safe_width = Math.max(1, width)
  const safe_height = Math.max(1, height)
  const safe_pixel_ratio = Math.max(1, pixel_ratio)

  state.viewport[0] = safe_width
  state.viewport[1] = safe_height
  state.viewport[2] = safe_pixel_ratio
  state.renderer.resize(safe_width, safe_height, safe_pixel_ratio)
  return state
}

export function world_to_screen_engine(state: engine, world: vector2, out: vector2): vector2 {
  return world_to_screen_camera(state.camera, state.viewport, world, out)
}

export function screen_to_world_engine(state: engine, screen: vector2, out: vector2): vector2 {
  return screen_to_world_camera(state.camera, state.viewport, screen, out)
}

export function visible_bounds_world_engine(state: engine): rectangle {
  camera_frustum(state.camera, state.viewport, scratch_frustum)
  return [
    scratch_frustum[0],
    scratch_frustum[3],
    scratch_frustum[1] - scratch_frustum[0],
    scratch_frustum[2] - scratch_frustum[3],
  ]
}

export function camera_to_screen_transform_engine(
  c: camera,
  v: viewport,
  out: transform,
): transform {
  const cos_r = Math.cos(c[3])
  const sin_r = Math.sin(c[3])
  const zoom = c[2]

  out[0] = cos_r * zoom
  out[1] = sin_r * zoom
  out[2] = -sin_r * zoom
  out[3] = cos_r * zoom
  out[4] = v[0] / 2 - c[0] * cos_r * zoom + c[1] * sin_r * zoom
  out[5] = v[1] / 2 - c[0] * sin_r * zoom - c[1] * cos_r * zoom
  return out
}

export function sanitize_number_engine(value: number, fallback: number): number {
  if (Number.isFinite(value)) {
    return value
  }
  return Number.isFinite(fallback) ? fallback : 0
}

export function sanitize_zoom_engine(value: number, fallback: number): number {
  const safe_value = Number.isFinite(value) ? value : fallback
  if (!Number.isFinite(safe_value) || safe_value <= 0) {
    return 1
  }
  return Math.min(max_zoom_engine, Math.max(min_zoom_engine, safe_value))
}

function copy_camera_into_engine(state: engine, value: camera): void {
  state.camera[0] = sanitize_number_engine(value[0], state.camera[0])
  state.camera[1] = sanitize_number_engine(value[1], state.camera[1])
  state.camera[2] = sanitize_zoom_engine(value[2], state.camera[2])
  state.camera[3] = sanitize_number_engine(value[3], state.camera[3])
}
