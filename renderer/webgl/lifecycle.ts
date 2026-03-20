import type { color } from "@/math/color"
import type { rectangle } from "@/math/rectangle"
import type { webgl_state } from "@/renderer/webgl/types"

export function begin_frame_webgl(state: webgl_state): void {
  state.vertex_count = 0
  state.index_count = 0
  state.scissor_enabled = false
  state.gl.disable(state.gl.SCISSOR_TEST)
}

export function end_frame_webgl(state: webgl_state): void {
  if (state.index_count > 0) {
    flush_webgl(state)
  }
}

export function flush_webgl(state: webgl_state): void {
  if (state.index_count === 0) {
    return
  }

  const gl = state.gl

  gl.useProgram(state.program)
  gl.uniformMatrix3fv(state.program_locations.transform, false, state.current_transform)
  gl.uniform2f(state.program_locations.resolution, state.width, state.height)

  gl.bindBuffer(gl.ARRAY_BUFFER, state.position_buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    state.vertices.subarray(0, state.vertex_count * 2),
    gl.DYNAMIC_DRAW,
  )
  gl.enableVertexAttribArray(state.program_locations.position)
  gl.vertexAttribPointer(state.program_locations.position, 2, gl.FLOAT, false, 0, 0)

  gl.bindBuffer(gl.ARRAY_BUFFER, state.color_buffer)
  gl.bufferData(gl.ARRAY_BUFFER, state.colors.subarray(0, state.vertex_count * 4), gl.DYNAMIC_DRAW)
  gl.enableVertexAttribArray(state.program_locations.color)
  gl.vertexAttribPointer(state.program_locations.color, 4, gl.FLOAT, false, 0, 0)

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

export function clip_rectangle_webgl(state: webgl_state, r: rectangle): void {
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

export function clear_webgl(state: webgl_state, c: color): void {
  if (state.index_count > 0) {
    flush_webgl(state)
  }

  state.gl.clearColor(c[0], c[1], c[2], c[3])
  state.gl.clear(state.gl.COLOR_BUFFER_BIT)
}

export function resize_webgl(
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

export function dispose_webgl(state: webgl_state): void {
  state.fill_cache.clear()
  state.stroke_cache.clear()
  for (const texture of state.texture_cache.values()) {
    state.gl.deleteTexture(texture.texture)
  }
  state.texture_cache.clear()
  state.gl.deleteBuffer(state.position_buffer)
  state.gl.deleteBuffer(state.color_buffer)
  state.gl.deleteBuffer(state.texcoord_buffer)
  state.gl.deleteBuffer(state.index_buffer)
  state.gl.deleteProgram(state.program)
  state.gl.deleteProgram(state.texture_program)
}
