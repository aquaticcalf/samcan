import type { path } from "@/renderer/path"
import type { color } from "@/math/color"
import type { cached_path_fill, webgl_state } from "@/renderer/webgl/types"
import { path_close, path_cubic, path_line, path_move } from "@/renderer/path"
import { draw_cached_triangles_webgl } from "@/renderer/webgl/batches"
import { triangulate_polygon_earcut } from "@/renderer/webgl/triangles"

export function cache_path_fill_webgl(p: path): cached_path_fill {
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
      fill_vertices.push(current_x, current_y)
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

        fill_vertices.push(prev_x, prev_y)
        prev_x = x
        prev_y = y
      }

      current_x = cmd[5]
      current_y = cmd[6]
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

export function draw_cached_path_fill_webgl(
  state: webgl_state,
  cached: cached_path_fill,
  color: color,
  alpha: number,
): void {
  draw_cached_triangles_webgl(state, cached, color, alpha)
}
