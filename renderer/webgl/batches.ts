import type { color } from "@/math/color"
import type { webgl_state } from "@/renderer/webgl/types"
import { flush_webgl } from "@/renderer/webgl/lifecycle"

type cached_batch = {
  vertices: Float32Array
  vertex_count: number
  indices: Uint16Array
  index_count: number
}

export function draw_cached_triangles_webgl(
  state: webgl_state,
  cached: cached_batch,
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

    write_triangle_webgl(state, cached.vertices, added_vertices, [i0, i1, i2], color, alpha)
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

function write_triangle_webgl(
  state: webgl_state,
  vertices: Float32Array,
  added_vertices: Int32Array,
  indices: readonly number[],
  color: color,
  alpha: number,
): void {
  for (let i = 0; i < indices.length; i = i + 1) {
    const idx = indices[i]
    if (idx === undefined || added_vertices[idx] !== -1) {
      continue
    }

    const vx = vertices[idx * 2]
    const vy = vertices[idx * 2 + 1]
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
