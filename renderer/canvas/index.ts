import type { image_source, renderer, renderer_config } from "@/renderer/renderer"
import type { path } from "@/renderer/path"
import type { draw_style } from "@/renderer/style"
import type { transform } from "@/math/transform"
import type { rectangle } from "@/math/rectangle"
import type { circle } from "@/math/circle"
import type { vector2 } from "@/math/vector2"
import type { color } from "@/math/color"
import type { renderer_state } from "@/renderer/canvas/types"
import {
  draw_circle_canvas,
  draw_image_canvas,
  draw_line_canvas,
  draw_path_canvas,
  draw_polyline_canvas,
  draw_rectangle_canvas,
} from "@/renderer/canvas/draw"
import {
  begin_frame_canvas,
  clear_canvas,
  clip_rectangle_canvas,
  dispose_canvas,
  end_frame_canvas,
  reset_transform_canvas,
  resize_canvas,
  restore_canvas,
  save_canvas,
  set_transform_canvas,
} from "@/renderer/canvas/lifecycle"
import { renderer_kind_canvas } from "@/renderer/renderer"

export function create_renderer_canvas(
  canvas: HTMLCanvasElement,
  config: renderer_config,
): renderer | null {
  const ctx = canvas.getContext("2d")

  if (ctx === null) {
    return null
  }

  const state: renderer_state = {
    ctx,
    path_cache: new Map(),
    cache_access_counter: 0,
    cache_max_size: config.path_cache_size,
    current_width: canvas.width,
    current_height: canvas.height,
    current_pixel_ratio: 1,
  }

  return {
    kind: renderer_kind_canvas,
    get width() {
      return state.current_width
    },
    get height() {
      return state.current_height
    },
    get pixel_ratio() {
      return state.current_pixel_ratio
    },

    begin_frame: () => begin_frame_canvas(state),
    end_frame: () => end_frame_canvas(state),

    set_transform: (t: transform) => set_transform_canvas(state, t),
    reset_transform: () => reset_transform_canvas(state),
    save: () => save_canvas(state),
    restore: () => restore_canvas(state),

    draw_path: (p: path, s: draw_style) => draw_path_canvas(state, p, s),
    draw_rectangle: (r: rectangle, s: draw_style) => draw_rectangle_canvas(state, r, s),
    draw_circle: (c: circle, s: draw_style) => draw_circle_canvas(state, c, s),
    draw_line: (a: vector2, b: vector2, s: draw_style) => draw_line_canvas(state, a, b, s),
    draw_polyline: (points: readonly vector2[], s: draw_style) =>
      draw_polyline_canvas(state, points, s),
    draw_image: (image: image_source, r: rectangle, opacity: number, version?: number) =>
      draw_image_canvas(state, image, r, opacity, version),

    clip_rectangle: (r: rectangle) => clip_rectangle_canvas(state, r),
    clear: (c: color) => clear_canvas(state, c),

    resize: (width: number, height: number, pixel_ratio: number) =>
      resize_canvas(state, canvas, width, height, pixel_ratio),
    dispose: () => dispose_canvas(state),
  }
}
