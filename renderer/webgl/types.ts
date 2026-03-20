import type { image_source } from "@/renderer/renderer"
import type { path_command } from "@/renderer/path"

export type color_program_locations = {
  position: number
  color: number
  transform: WebGLUniformLocation
  resolution: WebGLUniformLocation
}

export type texture_program_locations = {
  position: number
  texcoord: number
  transform: WebGLUniformLocation
  resolution: WebGLUniformLocation
  alpha: WebGLUniformLocation
  sampler: WebGLUniformLocation
}

export type webgl_state = {
  gl: WebGLRenderingContext
  canvas: HTMLCanvasElement
  program: WebGLProgram
  texture_program: WebGLProgram
  program_locations: color_program_locations
  texture_locations: texture_program_locations
  position_buffer: WebGLBuffer
  color_buffer: WebGLBuffer
  texcoord_buffer: WebGLBuffer
  index_buffer: WebGLBuffer
  vertices: Float32Array
  colors: Float32Array
  indices: Uint16Array
  vertex_count: number
  index_count: number
  max_vertices: number
  max_indices: number
  current_transform: Float32Array
  transform_stack: Float32Array[]
  fill_cache: Map<number, cached_path_fill>
  stroke_cache: Map<number, cached_path_stroke>
  texture_cache: Map<image_source, cached_texture>
  cache_max_size: number
  width: number
  height: number
  pixel_ratio: number
  scissor_enabled: boolean
}

export type cached_path_fill = {
  vertices: Float32Array
  colors: Float32Array
  indices: Uint16Array
  vertex_count: number
  index_count: number
  path_commands: readonly path_command[]
}

export type cached_path_stroke = {
  vertices: Float32Array
  colors: Float32Array
  indices: Uint16Array
  vertex_count: number
  index_count: number
  stroke_width: number
  path_commands: readonly path_command[]
}

export type cached_texture = {
  texture: WebGLTexture
  width: number
  height: number
  version: number | null
  source_key: string | null
}
