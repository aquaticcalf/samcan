import type { color } from "@/math/color"
import type { transform } from "@/math/transform"
import type { rectangle } from "@/math/rectangle"
import type { renderer_state } from "@/renderer/canvas/types"
import { to_rgba_string_color } from "@/math/color"

export function begin_frame_canvas(state: renderer_state): void {
  state.ctx.setTransform(state.current_pixel_ratio, 0, 0, state.current_pixel_ratio, 0, 0)
}

export function end_frame_canvas(_state: renderer_state): void {}

export function set_transform_canvas(state: renderer_state, t: transform): void {
  const pr = state.current_pixel_ratio
  state.ctx.setTransform(t[0] * pr, t[1] * pr, t[2] * pr, t[3] * pr, t[4] * pr, t[5] * pr)
}

export function reset_transform_canvas(state: renderer_state): void {
  state.ctx.setTransform(state.current_pixel_ratio, 0, 0, state.current_pixel_ratio, 0, 0)
}

export function save_canvas(state: renderer_state): void {
  state.ctx.save()
}

export function restore_canvas(state: renderer_state): void {
  state.ctx.restore()
}

export function clip_rectangle_canvas(state: renderer_state, r: rectangle): void {
  state.ctx.save()
  state.ctx.beginPath()
  state.ctx.rect(r[0], r[1], r[2], r[3])
  state.ctx.clip()
}

export function clear_canvas(state: renderer_state, c: color): void {
  state.ctx.save()
  state.ctx.resetTransform()
  state.ctx.fillStyle = to_rgba_string_color(c)
  state.ctx.fillRect(
    0,
    0,
    state.current_width * state.current_pixel_ratio,
    state.current_height * state.current_pixel_ratio,
  )
  state.ctx.restore()
}

export function resize_canvas(
  state: renderer_state,
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  pixel_ratio: number,
): void {
  state.current_width = width
  state.current_height = height
  state.current_pixel_ratio = pixel_ratio

  canvas.width = width * pixel_ratio
  canvas.height = height * pixel_ratio
  canvas.style.width = width + "px"
  canvas.style.height = height + "px"

  state.ctx.setTransform(pixel_ratio, 0, 0, pixel_ratio, 0, 0)
}

export function dispose_canvas(state: renderer_state): void {
  state.path_cache.clear()
}
