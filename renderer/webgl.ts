import type { renderer, renderer_config } from "@/renderer/renderer"
import type { path, path_command } from "@/renderer/path"
import type { draw_style } from "@/renderer/style"
import type { transform } from "@/math/transform"
import type { rectangle } from "@/math/rectangle"
import type { circle } from "@/math/circle"
import type { vector2 } from "@/math/vector2"
import type { color } from "@/math/color"
import { hash_of_path, path_move, path_line, path_cubic, path_close } from "@/renderer/path"
import { renderer_kind_webgl } from "@/renderer/renderer"

type webgl_state = {
  gl: WebGLRenderingContext
  canvas: HTMLCanvasElement
  program: WebGLProgram
  position_buffer: WebGLBuffer
  color_buffer: WebGLBuffer
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
  cache_max_size: number
  width: number
  height: number
  pixel_ratio: number
  scissor_enabled: boolean
}

type cached_path_fill = {
  vertices: Float32Array
  colors: Float32Array
  indices: Uint16Array
  vertex_count: number
  index_count: number
  path_commands: readonly path_command[]
}

type cached_path_stroke = {
  vertices: Float32Array
  colors: Float32Array
  indices: Uint16Array
  vertex_count: number
  index_count: number
  stroke_width: number
  path_commands: readonly path_command[]
}

const vertex_shader_source = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  uniform mat3 u_transform;
  uniform vec2 u_resolution;
  varying vec4 v_color;
  
  void main() {
    vec2 position = (u_transform * vec3(a_position, 1.0)).xy;
    vec2 clip_space = ((position / u_resolution) * 2.0) - 1.0;
    gl_Position = vec4(clip_space * vec2(1.0, -1.0), 0.0, 1.0);
    v_color = a_color;
  }
`

const fragment_shader_source = `
  precision mediump float;
  varying vec4 v_color;
  
  void main() {
    gl_FragColor = v_color;
  }
`

export function create_renderer_webgl(
  canvas: HTMLCanvasElement,
  config: renderer_config,
): renderer | null {
  const gl = canvas.getContext("webgl")

  if (gl === null) {
    return null
  }

  const program = create_shader_program(gl, vertex_shader_source, fragment_shader_source)
  if (program === null) {
    return null
  }

  const max_vertices = 65536
  const max_indices = max_vertices * 3

  const state: webgl_state = {
    gl,
    canvas,
    program,
    position_buffer: gl.createBuffer() as WebGLBuffer,
    color_buffer: gl.createBuffer() as WebGLBuffer,
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

    clip_rectangle: (r: rectangle) => clip_rectangle_webgl(state, r),
    clear: (c: color) => clear_webgl(state, c),

    resize: (width: number, height: number, pixel_ratio: number) =>
      resize_webgl(state, width, height, pixel_ratio),
    dispose: () => dispose_webgl(state),
  }
}

function create_shader_program(
  gl: WebGLRenderingContext,
  vertex_source: string,
  fragment_source: string,
): WebGLProgram | null {
  const vertex_shader = compile_shader(gl, vertex_source, gl.VERTEX_SHADER)
  const fragment_shader = compile_shader(gl, fragment_source, gl.FRAGMENT_SHADER)

  if (vertex_shader === null || fragment_shader === null) {
    return null
  }

  const program = gl.createProgram()
  if (program === null) {
    return null
  }

  gl.attachShader(program, vertex_shader)
  gl.attachShader(program, fragment_shader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    return null
  }

  return program
}

function compile_shader(
  gl: WebGLRenderingContext,
  source: string,
  type: number,
): WebGLShader | null {
  const shader = gl.createShader(type)
  if (shader === null) {
    return null
  }

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }

  return shader
}

function begin_frame_webgl(state: webgl_state): void {
  state.vertex_count = 0
  state.index_count = 0
  state.scissor_enabled = false
  state.gl.disable(state.gl.SCISSOR_TEST)
}

function end_frame_webgl(state: webgl_state): void {
  if (state.index_count > 0) {
    flush_webgl(state)
  }
}

function flush_webgl(state: webgl_state): void {
  if (state.index_count === 0) {
    return
  }

  const gl = state.gl

  gl.useProgram(state.program)

  const position_location = gl.getAttribLocation(state.program, "a_position")
  const color_location = gl.getAttribLocation(state.program, "a_color")
  const transform_location = gl.getUniformLocation(state.program, "u_transform")
  const resolution_location = gl.getUniformLocation(state.program, "u_resolution")

  gl.uniformMatrix3fv(transform_location, false, state.current_transform)
  gl.uniform2f(resolution_location, state.width, state.height)

  gl.bindBuffer(gl.ARRAY_BUFFER, state.position_buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    state.vertices.subarray(0, state.vertex_count * 2),
    gl.DYNAMIC_DRAW,
  )
  gl.enableVertexAttribArray(position_location)
  gl.vertexAttribPointer(position_location, 2, gl.FLOAT, false, 0, 0)

  gl.bindBuffer(gl.ARRAY_BUFFER, state.color_buffer)
  gl.bufferData(gl.ARRAY_BUFFER, state.colors.subarray(0, state.vertex_count * 4), gl.DYNAMIC_DRAW)
  gl.enableVertexAttribArray(color_location)
  gl.vertexAttribPointer(color_location, 4, gl.FLOAT, false, 0, 0)

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, state.index_buffer)
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    state.indices.subarray(0, state.index_count),
    gl.DYNAMIC_DRAW,
  )

  gl.drawElements(gl.TRIANGLES, state.index_count, gl.UNSIGNED_SHORT, 0)

  state.vertex_count = 0
  state.index_count = 0
}

function set_transform_webgl(state: webgl_state, t: transform): void {
  state.current_transform[0] = t[0]
  state.current_transform[1] = t[2]
  state.current_transform[2] = t[4]
  state.current_transform[3] = t[1]
  state.current_transform[4] = t[3]
  state.current_transform[5] = t[5]
  state.current_transform[6] = 0
  state.current_transform[7] = 0
  state.current_transform[8] = 1
}

function reset_transform_webgl(state: webgl_state): void {
  state.current_transform[0] = 1
  state.current_transform[1] = 0
  state.current_transform[2] = 0
  state.current_transform[3] = 0
  state.current_transform[4] = 1
  state.current_transform[5] = 0
  state.current_transform[6] = 0
  state.current_transform[7] = 0
  state.current_transform[8] = 1
}

function save_webgl(state: webgl_state): void {
  const copy = new Float32Array(9)
  copy.set(state.current_transform)
  state.transform_stack.push(copy)
}

function restore_webgl(state: webgl_state): void {
  const previous = state.transform_stack.pop()
  if (previous !== undefined) {
    state.current_transform.set(previous)
  }
}

function paths_equal(a: readonly path_command[], b: readonly path_command[]): boolean {
  if (a.length !== b.length) {
    return false
  }

  for (let i = 0; i < a.length; i = i + 1) {
    const cmd_a = a[i]
    const cmd_b = b[i]
    if (cmd_a === undefined || cmd_b === undefined) {
      return false
    }

    if (cmd_a.length !== cmd_b.length) {
      return false
    }

    for (let j = 0; j < cmd_a.length; j = j + 1) {
      if (cmd_a[j] !== cmd_b[j]) {
        return false
      }
    }
  }

  return true
}

function draw_path_webgl(state: webgl_state, p: path, s: draw_style): void {
  if (s.fill !== null) {
    const hash = hash_of_path(p)
    let fill_cached = state.fill_cache.get(hash)

    if (fill_cached === undefined || !paths_equal(fill_cached.path_commands, p.commands)) {
      fill_cached = cache_path_fill_webgl(p)
      if (state.fill_cache.size >= state.cache_max_size) {
        const first_key = state.fill_cache.keys().next().value
        if (first_key !== undefined) {
          state.fill_cache.delete(first_key)
        }
      }
      state.fill_cache.set(hash, fill_cached)
    }

    draw_cached_path_fill_webgl(state, fill_cached, s.fill, s.alpha)
  }

  if (s.stroke !== null && s.stroke_width > 0) {
    const hash = hash_of_path(p) * 31 + s.stroke_width
    let stroke_cached = state.stroke_cache.get(hash)

    if (
      stroke_cached === undefined ||
      stroke_cached.stroke_width !== s.stroke_width ||
      !paths_equal(stroke_cached.path_commands, p.commands)
    ) {
      stroke_cached = cache_path_stroke_webgl(p, s.stroke_width)
      if (state.stroke_cache.size >= state.cache_max_size) {
        const first_key = state.stroke_cache.keys().next().value
        if (first_key !== undefined) {
          state.stroke_cache.delete(first_key)
        }
      }
      state.stroke_cache.set(hash, stroke_cached)
    }

    draw_cached_path_stroke_webgl(state, stroke_cached, s.stroke, s.alpha)
  }
}

function cache_path_fill_webgl(p: path): cached_path_fill {
  const fill_vertices: number[] = []
  const fill_colors: number[] = []
  const fill_indices: number[] = []

  let current_x = 0
  let current_y = 0
  let start_x = 0
  let start_y = 0

  for (let i = 0; i < p.commands.length; i = i + 1) {
    const cmd = p.commands[i]
    if (cmd === undefined) {
      continue
    }

    const type = cmd[0]

    if (type === path_move) {
      current_x = cmd[1]
      current_y = cmd[2]
      start_x = current_x
      start_y = current_y
    } else if (type === path_line) {
      const next_x = cmd[1]
      const next_y = cmd[2]

      fill_vertices.push(current_x, current_y)

      current_x = next_x
      current_y = next_y
    } else if (type === path_cubic) {
      const c1x = cmd[1]
      const c1y = cmd[2]
      const c2x = cmd[3]
      const c2y = cmd[4]
      const next_x = cmd[5]
      const next_y = cmd[6]

      const steps = 8
      let prev_x = current_x
      let prev_y = current_y

      for (let step = 1; step <= steps; step = step + 1) {
        const t = step / steps
        const inv_t = 1 - t
        const t2 = t * t
        const inv_t2 = inv_t * inv_t
        const t3 = t2 * t
        const inv_t3 = inv_t2 * inv_t

        const x = inv_t3 * current_x + 3 * inv_t2 * t * c1x + 3 * inv_t * t2 * c2x + t3 * next_x
        const y = inv_t3 * current_y + 3 * inv_t2 * t * c1y + 3 * inv_t * t2 * c2y + t3 * next_y

        fill_vertices.push(prev_x, prev_y)

        prev_x = x
        prev_y = y
      }

      current_x = next_x
      current_y = next_y
    } else if (type === path_close) {
      if (current_x !== start_x || current_y !== start_y) {
        fill_vertices.push(current_x, current_y)
      }
      fill_vertices.push(start_x, start_y)
    }
  }

  if (fill_vertices.length > 0 && (current_x !== start_x || current_y !== start_y)) {
    fill_vertices.push(start_x, start_y)
  }

  const fill_tris = triangulate_polygon_earcut(fill_vertices)
  for (let i = 0; i < fill_tris.length; i = i + 1) {
    const tri_index = fill_tris[i]
    if (tri_index !== undefined) {
      fill_indices.push(tri_index)
    }
  }
  for (let i = 0; i < fill_vertices.length / 2; i = i + 1) {
    fill_colors.push(1, 1, 1, 1)
  }

  return {
    vertices: new Float32Array(fill_vertices),
    colors: new Float32Array(fill_colors),
    indices: new Uint16Array(fill_indices),
    vertex_count: fill_vertices.length / 2,
    index_count: fill_indices.length,
    path_commands: p.commands,
  }
}

function cache_path_stroke_webgl(p: path, stroke_width: number): cached_path_stroke {
  const stroke_vertices: number[] = []
  const stroke_colors: number[] = []
  const stroke_indices: number[] = []

  let current_x = 0
  let current_y = 0
  let start_x = 0
  let start_y = 0
  let vertex_offset = 0

  for (let i = 0; i < p.commands.length; i = i + 1) {
    const cmd = p.commands[i]
    if (cmd === undefined) {
      continue
    }

    const type = cmd[0]

    if (type === path_move) {
      current_x = cmd[1]
      current_y = cmd[2]
      start_x = current_x
      start_y = current_y
    } else if (type === path_line) {
      const next_x = cmd[1]
      const next_y = cmd[2]

      add_line_vertices(stroke_vertices, current_x, current_y, next_x, next_y, stroke_width / 2)
      const base_index = vertex_offset
      stroke_indices.push(
        base_index,
        base_index + 1,
        base_index + 2,
        base_index + 1,
        base_index + 3,
        base_index + 2,
      )
      vertex_offset = vertex_offset + 4

      current_x = next_x
      current_y = next_y
    } else if (type === path_cubic) {
      const c1x = cmd[1]
      const c1y = cmd[2]
      const c2x = cmd[3]
      const c2y = cmd[4]
      const next_x = cmd[5]
      const next_y = cmd[6]

      const steps = 8
      let prev_x = current_x
      let prev_y = current_y

      for (let step = 1; step <= steps; step = step + 1) {
        const t = step / steps
        const inv_t = 1 - t
        const t2 = t * t
        const inv_t2 = inv_t * inv_t
        const t3 = t2 * t
        const inv_t3 = inv_t2 * inv_t

        const x = inv_t3 * current_x + 3 * inv_t2 * t * c1x + 3 * inv_t * t2 * c2x + t3 * next_x
        const y = inv_t3 * current_y + 3 * inv_t2 * t * c1y + 3 * inv_t * t2 * c2y + t3 * next_y

        add_line_vertices(stroke_vertices, prev_x, prev_y, x, y, stroke_width / 2)
        const base_index = vertex_offset
        stroke_indices.push(
          base_index,
          base_index + 1,
          base_index + 2,
          base_index + 1,
          base_index + 3,
          base_index + 2,
        )
        vertex_offset = vertex_offset + 4

        prev_x = x
        prev_y = y
      }

      current_x = next_x
      current_y = next_y
    } else if (type === path_close) {
      if (current_x !== start_x || current_y !== start_y) {
        add_line_vertices(stroke_vertices, current_x, current_y, start_x, start_y, stroke_width / 2)
        const base_index = vertex_offset
        stroke_indices.push(
          base_index,
          base_index + 1,
          base_index + 2,
          base_index + 1,
          base_index + 3,
          base_index + 2,
        )
        vertex_offset = vertex_offset + 4
      }
    }
  }

  for (let i = 0; i < stroke_vertices.length / 2; i = i + 1) {
    stroke_colors.push(1, 1, 1, 1)
  }

  return {
    vertices: new Float32Array(stroke_vertices),
    colors: new Float32Array(stroke_colors),
    indices: new Uint16Array(stroke_indices),
    vertex_count: stroke_vertices.length / 2,
    index_count: stroke_indices.length,
    stroke_width,
    path_commands: p.commands,
  }
}

function add_line_vertices(
  vertices: number[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  half_width: number,
): void {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)

  if (len === 0) {
    vertices.push(
      x1 - half_width,
      y1 - half_width,
      x1 + half_width,
      y1 - half_width,
      x1 - half_width,
      y1 + half_width,
      x1 + half_width,
      y1 + half_width,
    )
    return
  }

  const nx = (-dy / len) * half_width
  const ny = (dx / len) * half_width

  vertices.push(x1 + nx, y1 + ny, x2 + nx, y2 + ny, x1 - nx, y1 - ny, x2 - nx, y2 - ny)
}

type polygon_node = {
  i: number
  x: number
  y: number
  prev: polygon_node | null
  next: polygon_node | null
}

function triangulate_polygon_earcut(vertices: number[]): number[] {
  if (vertices.length < 6) {
    return []
  }

  const n = vertices.length / 2

  if (n === 3) {
    return [0, 1, 2]
  }

  let head: polygon_node | null = null
  let last: polygon_node | null = null

  for (let i = 0; i < n; i = i + 1) {
    const x = vertices[i * 2]
    const y = vertices[i * 2 + 1]
    if (x !== undefined && y !== undefined) {
      const node: polygon_node = { i, x, y, prev: last, next: null }
      if (last !== null) {
        last.next = node
      } else {
        head = node
      }
      last = node
    }
  }

  if (head !== null && last !== null) {
    head.prev = last
    last.next = head
  }

  const indices: number[] = []
  let ear = head
  let count = n * 2

  while (count > 0 && ear !== null && ear.next !== ear.prev) {
    count = count - 1

    const prev = ear.prev
    const next = ear.next

    if (prev !== null && next !== null && is_ear(prev, ear, next)) {
      indices.push(prev.i, ear.i, next.i)

      if (prev.next === next) {
        break
      }

      prev.next = next
      next.prev = prev

      ear = next
    } else {
      ear = next
    }
  }

  return indices
}

function is_ear(a: polygon_node, b: polygon_node, c: polygon_node): boolean {
  const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  if (area >= 0) {
    return false
  }

  let p = c.next
  while (p !== null && p !== a) {
    if (point_in_triangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y)) {
      return false
    }
    p = p.next
  }

  return true
}

function point_in_triangle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  px: number,
  py: number,
): boolean {
  const denom = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
  if (denom === 0) {
    return false
  }

  const a = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / denom
  const b = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / denom
  const c = 1 - a - b

  return a >= 0 && b >= 0 && c >= 0
}

function draw_cached_path_fill_webgl(
  state: webgl_state,
  cached: cached_path_fill,
  color: color,
  alpha: number,
): void {
  if (cached.index_count === 0) {
    return
  }

  const added_vertices = new Int32Array(cached.vertex_count)
  for (let i = 0; i < cached.vertex_count; i = i + 1) {
    added_vertices[i] = -1
  }

  for (let tri = 0; tri < cached.index_count; tri = tri + 3) {
    const i0 = cached.indices[tri]
    const i1 = cached.indices[tri + 1]
    const i2 = cached.indices[tri + 2]

    if (i0 === undefined || i1 === undefined || i2 === undefined) {
      continue
    }

    if (state.vertex_count + 3 > state.max_vertices || state.index_count + 3 > state.max_indices) {
      flush_webgl(state)
      for (let i = 0; i < cached.vertex_count; i = i + 1) {
        added_vertices[i] = -1
      }
    }

    for (const idx of [i0, i1, i2]) {
      if (added_vertices[idx] === -1) {
        const vx = cached.vertices[idx * 2]
        const vy = cached.vertices[idx * 2 + 1]
        if (vx !== undefined && vy !== undefined) {
          state.vertices[state.vertex_count * 2] = vx
          state.vertices[state.vertex_count * 2 + 1] = vy
          state.colors[state.vertex_count * 4] = color[0]
          state.colors[state.vertex_count * 4 + 1] = color[1]
          state.colors[state.vertex_count * 4 + 2] = color[2]
          state.colors[state.vertex_count * 4 + 3] = color[3] * alpha
          added_vertices[idx] = state.vertex_count
          state.vertex_count = state.vertex_count + 1
        }
      }
    }

    const v0 = added_vertices[i0]
    const v1 = added_vertices[i1]
    const v2 = added_vertices[i2]

    if (
      v0 !== -1 &&
      v0 !== undefined &&
      v1 !== -1 &&
      v1 !== undefined &&
      v2 !== -1 &&
      v2 !== undefined
    ) {
      state.indices[state.index_count] = v0
      state.indices[state.index_count + 1] = v1
      state.indices[state.index_count + 2] = v2
      state.index_count = state.index_count + 3
    }
  }
}

function draw_cached_path_stroke_webgl(
  state: webgl_state,
  cached: cached_path_stroke,
  color: color,
  alpha: number,
): void {
  if (cached.index_count === 0) {
    return
  }

  const added_vertices = new Int32Array(cached.vertex_count)
  for (let i = 0; i < cached.vertex_count; i = i + 1) {
    added_vertices[i] = -1
  }

  for (let tri = 0; tri < cached.index_count; tri = tri + 3) {
    const i0 = cached.indices[tri]
    const i1 = cached.indices[tri + 1]
    const i2 = cached.indices[tri + 2]

    if (i0 === undefined || i1 === undefined || i2 === undefined) {
      continue
    }

    if (state.vertex_count + 3 > state.max_vertices || state.index_count + 3 > state.max_indices) {
      flush_webgl(state)
      for (let i = 0; i < cached.vertex_count; i = i + 1) {
        added_vertices[i] = -1
      }
    }

    for (const idx of [i0, i1, i2]) {
      if (added_vertices[idx] === -1) {
        const vx = cached.vertices[idx * 2]
        const vy = cached.vertices[idx * 2 + 1]
        if (vx !== undefined && vy !== undefined) {
          state.vertices[state.vertex_count * 2] = vx
          state.vertices[state.vertex_count * 2 + 1] = vy
          state.colors[state.vertex_count * 4] = color[0]
          state.colors[state.vertex_count * 4 + 1] = color[1]
          state.colors[state.vertex_count * 4 + 2] = color[2]
          state.colors[state.vertex_count * 4 + 3] = color[3] * alpha
          added_vertices[idx] = state.vertex_count
          state.vertex_count = state.vertex_count + 1
        }
      }
    }

    const v0 = added_vertices[i0]
    const v1 = added_vertices[i1]
    const v2 = added_vertices[i2]

    if (
      v0 !== -1 &&
      v0 !== undefined &&
      v1 !== -1 &&
      v1 !== undefined &&
      v2 !== -1 &&
      v2 !== undefined
    ) {
      state.indices[state.index_count] = v0
      state.indices[state.index_count + 1] = v1
      state.indices[state.index_count + 2] = v2
      state.index_count = state.index_count + 3
    }
  }
}

function draw_rectangle_webgl(state: webgl_state, r: rectangle, s: draw_style): void {
  const x = r[0]
  const y = r[1]
  const w = r[2]
  const h = r[3]

  if (s.fill !== null) {
    add_quad_webgl(state, x, y, x + w, y, x + w, y + h, x, y + h, s.fill, s.alpha)
  }

  if (s.stroke !== null && s.stroke_width > 0) {
    const sw = s.stroke_width

    add_quad_webgl(
      state,
      x - sw,
      y - sw,
      x + w + sw,
      y - sw,
      x + w + sw,
      y,
      x - sw,
      y,
      s.stroke,
      s.alpha,
    )
    add_quad_webgl(
      state,
      x + w,
      y,
      x + w + sw,
      y,
      x + w + sw,
      y + h,
      x + w,
      y + h,
      s.stroke,
      s.alpha,
    )
    add_quad_webgl(
      state,
      x - sw,
      y + h,
      x + w + sw,
      y + h,
      x + w + sw,
      y + h + sw,
      x - sw,
      y + h + sw,
      s.stroke,
      s.alpha,
    )
    add_quad_webgl(state, x - sw, y, x, y, x, y + h, x - sw, y + h, s.stroke, s.alpha)
  }
}

function draw_circle_webgl(state: webgl_state, c: circle, s: draw_style): void {
  const cx = c[0]
  const cy = c[1]
  const r = c[2]
  const segments = 32

  if (s.fill !== null) {
    const base_vertex = state.vertex_count

    state.vertices[state.vertex_count * 2] = cx
    state.vertices[state.vertex_count * 2 + 1] = cy
    state.colors[state.vertex_count * 4] = s.fill[0]
    state.colors[state.vertex_count * 4 + 1] = s.fill[1]
    state.colors[state.vertex_count * 4 + 2] = s.fill[2]
    state.colors[state.vertex_count * 4 + 3] = s.fill[3] * s.alpha
    state.vertex_count = state.vertex_count + 1

    for (let i = 0; i <= segments; i = i + 1) {
      const angle = (i / segments) * Math.PI * 2
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r

      state.vertices[state.vertex_count * 2] = x
      state.vertices[state.vertex_count * 2 + 1] = y
      state.colors[state.vertex_count * 4] = s.fill[0]
      state.colors[state.vertex_count * 4 + 1] = s.fill[1]
      state.colors[state.vertex_count * 4 + 2] = s.fill[2]
      state.colors[state.vertex_count * 4 + 3] = s.fill[3] * s.alpha
      state.vertex_count = state.vertex_count + 1
    }

    for (let i = 0; i < segments; i = i + 1) {
      state.indices[state.index_count] = base_vertex
      state.indices[state.index_count + 1] = base_vertex + i + 1
      state.indices[state.index_count + 2] = base_vertex + i + 2
      state.index_count = state.index_count + 3
    }
  }

  if (s.stroke !== null && s.stroke_width > 0 && r > 0) {
    const outer_r = r + s.stroke_width
    const base_vertex = state.vertex_count

    for (let i = 0; i <= segments; i = i + 1) {
      const angle = (i / segments) * Math.PI * 2
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)

      const x1 = cx + cos * r
      const y1 = cy + sin * r
      const x2 = cx + cos * outer_r
      const y2 = cy + sin * outer_r

      state.vertices[state.vertex_count * 2] = x1
      state.vertices[state.vertex_count * 2 + 1] = y1
      state.colors[state.vertex_count * 4] = s.stroke[0]
      state.colors[state.vertex_count * 4 + 1] = s.stroke[1]
      state.colors[state.vertex_count * 4 + 2] = s.stroke[2]
      state.colors[state.vertex_count * 4 + 3] = s.stroke[3] * s.alpha
      state.vertex_count = state.vertex_count + 1

      state.vertices[state.vertex_count * 2] = x2
      state.vertices[state.vertex_count * 2 + 1] = y2
      state.colors[state.vertex_count * 4] = s.stroke[0]
      state.colors[state.vertex_count * 4 + 1] = s.stroke[1]
      state.colors[state.vertex_count * 4 + 2] = s.stroke[2]
      state.colors[state.vertex_count * 4 + 3] = s.stroke[3] * s.alpha
      state.vertex_count = state.vertex_count + 1
    }

    for (let i = 0; i < segments; i = i + 1) {
      const base = base_vertex + i * 2
      state.indices[state.index_count] = base
      state.indices[state.index_count + 1] = base + 1
      state.indices[state.index_count + 2] = base + 2
      state.indices[state.index_count + 3] = base + 1
      state.indices[state.index_count + 4] = base + 3
      state.indices[state.index_count + 5] = base + 2
      state.index_count = state.index_count + 6
    }
  }
}

function draw_line_webgl(state: webgl_state, a: vector2, b: vector2, s: draw_style): void {
  if (s.stroke === null || s.stroke_width <= 0) {
    return
  }

  const x1 = a[0]
  const y1 = a[1]
  const x2 = b[0]
  const y2 = b[1]
  const width = s.stroke_width / 2

  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)

  if (len === 0) {
    return
  }

  const nx = (-dy / len) * width
  const ny = (dx / len) * width

  add_quad_webgl(
    state,
    x1 + nx,
    y1 + ny,
    x2 + nx,
    y2 + ny,
    x2 - nx,
    y2 - ny,
    x1 - nx,
    y1 - ny,
    s.stroke,
    s.alpha,
  )
}

function draw_polyline_webgl(state: webgl_state, points: readonly vector2[], s: draw_style): void {
  if (points.length < 2 || s.stroke === null || s.stroke_width <= 0) {
    return
  }

  for (let i = 0; i < points.length - 1; i = i + 1) {
    const p1 = points[i]
    const p2 = points[i + 1]
    if (p1 !== undefined && p2 !== undefined) {
      draw_line_webgl(state, p1, p2, s)
    }
  }
}

function add_quad_webgl(
  state: webgl_state,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
  color: color,
  alpha: number,
): void {
  if (state.vertex_count + 4 > state.max_vertices || state.index_count + 6 > state.max_indices) {
    flush_webgl(state)
  }

  const base = state.vertex_count

  state.vertices[state.vertex_count * 2] = x1
  state.vertices[state.vertex_count * 2 + 1] = y1
  state.colors[state.vertex_count * 4] = color[0]
  state.colors[state.vertex_count * 4 + 1] = color[1]
  state.colors[state.vertex_count * 4 + 2] = color[2]
  state.colors[state.vertex_count * 4 + 3] = color[3] * alpha
  state.vertex_count = state.vertex_count + 1

  state.vertices[state.vertex_count * 2] = x2
  state.vertices[state.vertex_count * 2 + 1] = y2
  state.colors[state.vertex_count * 4] = color[0]
  state.colors[state.vertex_count * 4 + 1] = color[1]
  state.colors[state.vertex_count * 4 + 2] = color[2]
  state.colors[state.vertex_count * 4 + 3] = color[3] * alpha
  state.vertex_count = state.vertex_count + 1

  state.vertices[state.vertex_count * 2] = x3
  state.vertices[state.vertex_count * 2 + 1] = y3
  state.colors[state.vertex_count * 4] = color[0]
  state.colors[state.vertex_count * 4 + 1] = color[1]
  state.colors[state.vertex_count * 4 + 2] = color[2]
  state.colors[state.vertex_count * 4 + 3] = color[3] * alpha
  state.vertex_count = state.vertex_count + 1

  state.vertices[state.vertex_count * 2] = x4
  state.vertices[state.vertex_count * 2 + 1] = y4
  state.colors[state.vertex_count * 4] = color[0]
  state.colors[state.vertex_count * 4 + 1] = color[1]
  state.colors[state.vertex_count * 4 + 2] = color[2]
  state.colors[state.vertex_count * 4 + 3] = color[3] * alpha
  state.vertex_count = state.vertex_count + 1

  state.indices[state.index_count] = base
  state.indices[state.index_count + 1] = base + 1
  state.indices[state.index_count + 2] = base + 2
  state.indices[state.index_count + 3] = base + 1
  state.indices[state.index_count + 4] = base + 3
  state.indices[state.index_count + 5] = base + 2
  state.index_count = state.index_count + 6
}

function clip_rectangle_webgl(state: webgl_state, r: rectangle): void {
  if (state.index_count > 0) {
    flush_webgl(state)
  }

  state.scissor_enabled = true
  state.gl.enable(state.gl.SCISSOR_TEST)
  state.gl.scissor(
    Math.floor(r[0] * state.pixel_ratio),
    Math.floor((state.height - r[1] - r[3]) * state.pixel_ratio),
    Math.ceil(r[2] * state.pixel_ratio),
    Math.ceil(r[3] * state.pixel_ratio),
  )
}

function clear_webgl(state: webgl_state, c: color): void {
  if (state.index_count > 0) {
    flush_webgl(state)
  }

  state.gl.clearColor(c[0], c[1], c[2], c[3])
  state.gl.clear(state.gl.COLOR_BUFFER_BIT)
}

function resize_webgl(
  state: webgl_state,
  width: number,
  height: number,
  pixel_ratio: number,
): void {
  state.width = width
  state.height = height
  state.pixel_ratio = pixel_ratio

  state.canvas.width = width * pixel_ratio
  state.canvas.height = height * pixel_ratio
  state.canvas.style.width = width + "px"
  state.canvas.style.height = height + "px"

  state.gl.viewport(0, 0, state.canvas.width, state.canvas.height)
}

function dispose_webgl(state: webgl_state): void {
  state.fill_cache.clear()
  state.stroke_cache.clear()
  state.gl.deleteBuffer(state.position_buffer)
  state.gl.deleteBuffer(state.color_buffer)
  state.gl.deleteBuffer(state.index_buffer)
  state.gl.deleteProgram(state.program)
}
