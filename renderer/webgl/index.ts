import type { image_source, renderer, renderer_config } from "@/renderer/renderer"
import type { path } from "@/renderer/path"
import type { draw_style } from "@/renderer/style"
import type { transform } from "@/math/transform"
import type { rectangle } from "@/math/rectangle"
import type { circle } from "@/math/circle"
import type { vector2 } from "@/math/vector2"
import type { color } from "@/math/color"
import type { webgl_state } from "@/renderer/webgl/types"
import {
  begin_frame_webgl,
  clear_webgl,
  clip_rectangle_webgl,
  dispose_webgl,
  end_frame_webgl,
  resize_webgl,
} from "@/renderer/webgl/lifecycle"
import { draw_path_webgl } from "@/renderer/webgl/paths"
import { create_color_program_webgl, create_texture_program_webgl } from "@/renderer/webgl/shaders"
import {
  draw_circle_webgl,
  draw_line_webgl,
  draw_polyline_webgl,
  draw_rectangle_webgl,
} from "@/renderer/webgl/shapes"
import { draw_image_webgl } from "@/renderer/webgl/textures"
import {
  reset_transform_webgl,
  restore_webgl,
  save_webgl,
  set_transform_webgl,
} from "@/renderer/webgl/transforms"
import { renderer_kind_webgl } from "@/renderer/renderer"

export function create_renderer_webgl(
  canvas: HTMLCanvasElement,
  config: renderer_config,
): renderer | null {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: true })

  if (gl === null) {
    return null
  }

  const color_program = create_color_program_webgl(gl)
  const texture_program = create_texture_program_webgl(gl)

  if (color_program === null || texture_program === null) {
    if (color_program !== null) {
      gl.deleteProgram(color_program.program)
    }
    if (texture_program !== null) {
      gl.deleteProgram(texture_program.program)
    }
    return null
  }

  const max_vertices = 65536
  const max_indices = max_vertices * 3

  const state: webgl_state = {
    gl,
    canvas,
    program: color_program.program,
    texture_program: texture_program.program,
    program_locations: color_program.locations,
    texture_locations: texture_program.locations,
    position_buffer: gl.createBuffer() as WebGLBuffer,
    color_buffer: gl.createBuffer() as WebGLBuffer,
    texcoord_buffer: gl.createBuffer() as WebGLBuffer,
    index_buffer: gl.createBuffer() as WebGLBuffer,
    vertices: new Float32Array(max_vertices * 2),
    colors: new Float32Array(max_vertices * 4),
    indices: new Uint16Array(max_indices),
    vertex_count: 0,
    index_count: 0,
    max_vertices,
    max_indices,
    current_transform: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
    transform_stack: [],
    fill_cache: new Map(),
    stroke_cache: new Map(),
    texture_cache: new Map(),
    cache_max_size: config.path_cache_size,
    width: canvas.width,
    height: canvas.height,
    pixel_ratio: 1,
    scissor_enabled: false,
  }

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  return {
    kind: renderer_kind_webgl,
    get width() {
      return state.width
    },
    get height() {
      return state.height
    },
    get pixel_ratio() {
      return state.pixel_ratio
    },

    begin_frame: () => begin_frame_webgl(state),
    end_frame: () => end_frame_webgl(state),

    set_transform: (t: transform) => set_transform_webgl(state, t),
    reset_transform: () => reset_transform_webgl(state),
    save: () => save_webgl(state),
    restore: () => restore_webgl(state),

    draw_path: (p: path, s: draw_style) => draw_path_webgl(state, p, s),
    draw_rectangle: (r: rectangle, s: draw_style) => draw_rectangle_webgl(state, r, s),
    draw_circle: (c: circle, s: draw_style) => draw_circle_webgl(state, c, s),
    draw_line: (a: vector2, b: vector2, s: draw_style) => draw_line_webgl(state, a, b, s),
    draw_polyline: (points: readonly vector2[], s: draw_style) =>
      draw_polyline_webgl(state, points, s),
    draw_image: (image: image_source, r: rectangle, opacity: number, version?: number) =>
      draw_image_webgl(state, image, r, opacity, version),

    clip_rectangle: (r: rectangle) => clip_rectangle_webgl(state, r),
    clear: (c: color) => clear_webgl(state, c),

    resize: (width: number, height: number, pixel_ratio: number) =>
      resize_webgl(state, width, height, pixel_ratio),
    dispose: () => dispose_webgl(state),
  }
}
