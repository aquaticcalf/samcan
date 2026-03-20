import type { path } from "@/renderer/path"
import type { color } from "@/math/color"
import type { cached_path_stroke, webgl_state } from "@/renderer/webgl/types"
import { path_close, path_cubic, path_line, path_move } from "@/renderer/path"
import { draw_cached_triangles_webgl } from "@/renderer/webgl/batches"

export function cache_path_stroke_webgl(p: path, stroke_width: number): cached_path_stroke {
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
      add_segment_webgl(
        stroke_vertices,
        stroke_indices,
        vertex_offset,
        current_x,
        current_y,
        cmd[1],
        cmd[2],
        stroke_width / 2,
      )
      vertex_offset = vertex_offset + 4
      current_x = cmd[1]
      current_y = cmd[2]
    } else if (type === path_cubic) {
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
        const x =
          inv_t3 * current_x + 3 * inv_t2 * t * cmd[1] + 3 * inv_t * t2 * cmd[3] + t3 * cmd[5]
        const y =
          inv_t3 * current_y + 3 * inv_t2 * t * cmd[2] + 3 * inv_t * t2 * cmd[4] + t3 * cmd[6]

        add_segment_webgl(
          stroke_vertices,
          stroke_indices,
          vertex_offset,
          prev_x,
          prev_y,
          x,
          y,
          stroke_width / 2,
        )
        vertex_offset = vertex_offset + 4
        prev_x = x
        prev_y = y
      }

      current_x = cmd[5]
      current_y = cmd[6]
    } else if (type === path_close) {
      if (current_x !== start_x || current_y !== start_y) {
        add_segment_webgl(
          stroke_vertices,
          stroke_indices,
          vertex_offset,
          current_x,
          current_y,
          start_x,
          start_y,
          stroke_width / 2,
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

export function draw_cached_path_stroke_webgl(
  state: webgl_state,
  cached: cached_path_stroke,
  color: color,
  alpha: number,
): void {
  draw_cached_triangles_webgl(state, cached, color, alpha)
}

function add_segment_webgl(
  vertices: number[],
  indices: number[],
  base_index: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  half_width: number,
): void {
  add_line_vertices(vertices, x1, y1, x2, y2, half_width)
  indices.push(
    base_index,
    base_index + 1,
    base_index + 2,
    base_index + 1,
    base_index + 3,
    base_index + 2,
  )
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
