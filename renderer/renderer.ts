import type { transform } from "@/math/transform"
import type { rectangle } from "@/math/rectangle"
import type { circle } from "@/math/circle"
import type { vector2 } from "@/math/vector2"
import type { color } from "@/math/color"
import type { path } from "@/renderer/path"
import type { draw_style } from "@/renderer/style"
import { create_renderer_canvas } from "@/renderer/canvas"
import { create_renderer_webgl } from "@/renderer/webgl"

export const renderer_kind_canvas = 0
export const renderer_kind_webgl = 1

export type renderer_config = {
  readonly prefer_webgl: boolean
  readonly path_cache_size: number
}

export type renderer = {
  readonly kind: number
  readonly width: number
  readonly height: number
  readonly pixel_ratio: number

  begin_frame: () => void
  end_frame: () => void

  set_transform: (t: transform) => void
  reset_transform: () => void
  save: () => void
  restore: () => void

  draw_path: (p: path, s: draw_style) => void
  draw_rectangle: (r: rectangle, s: draw_style) => void
  draw_circle: (c: circle, s: draw_style) => void
  draw_line: (a: vector2, b: vector2, s: draw_style) => void
  draw_polyline: (points: readonly vector2[], s: draw_style) => void

  clip_rectangle: (r: rectangle) => void
  clear: (c: color) => void

  resize: (width: number, height: number, pixel_ratio: number) => void
  dispose: () => void
}

export function create_renderer_config(): renderer_config {
  return {
    prefer_webgl: false,
    path_cache_size: 1024,
  }
}

export function create_renderer(
  canvas: HTMLCanvasElement,
  config: renderer_config,
): renderer | null {
  if (config.prefer_webgl) {
    const webgl_renderer = create_renderer_webgl(canvas, config)
    if (webgl_renderer !== null) {
      return webgl_renderer
    }
  }

  return create_renderer_canvas(canvas, config)
}
