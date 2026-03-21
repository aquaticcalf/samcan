import type { image_source } from "@/renderer/renderer"
import type { rectangle } from "@/math/rectangle"
import type { cached_texture, webgl_state } from "@/renderer/webgl/types"
import { flush_webgl } from "@/renderer/webgl/lifecycle"

export function draw_image_webgl(
  state: webgl_state,
  image: image_source,
  r: rectangle,
  opacity: number,
  version?: number,
): void {
  const texture = sync_texture_webgl(state, image, version)
  if (texture === null) {
    return
  }

  if (state.index_count > 0) {
    flush_webgl(state)
  }

  const gl = state.gl
  gl.useProgram(state.texture_program)
  gl.uniformMatrix3fv(state.texture_locations.transform, false, state.current_transform)
  gl.uniform2f(state.texture_locations.resolution, state.width, state.height)
  gl.uniform1f(state.texture_locations.alpha, opacity)

  const x = r[0]
  const y = r[1]
  const w = r[2]
  const h = r[3]

  const positions = new Float32Array([x, y, x + w, y, x, y + h, x, y + h, x + w, y, x + w, y + h])
  const texcoords = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1])

  gl.bindBuffer(gl.ARRAY_BUFFER, state.position_buffer)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW)
  gl.enableVertexAttribArray(state.texture_locations.position)
  gl.vertexAttribPointer(state.texture_locations.position, 2, gl.FLOAT, false, 0, 0)

  gl.bindBuffer(gl.ARRAY_BUFFER, state.texcoord_buffer)
  gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.DYNAMIC_DRAW)
  gl.enableVertexAttribArray(state.texture_locations.texcoord)
  gl.vertexAttribPointer(state.texture_locations.texcoord, 2, gl.FLOAT, false, 0, 0)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, texture.texture)
  gl.uniform1i(state.texture_locations.sampler, 0)
  gl.drawArrays(gl.TRIANGLES, 0, 6)
}

function sync_texture_webgl(
  state: webgl_state,
  image: image_source,
  version?: number,
): cached_texture | null {
  if (!is_image_ready_webgl(image)) {
    return null
  }

  const gl = state.gl
  const width = image instanceof HTMLImageElement ? image.naturalWidth : image.width
  const height = image instanceof HTMLImageElement ? image.naturalHeight : image.height
  const refresh_canvas_each_draw = image instanceof HTMLCanvasElement && version === undefined
  const source_key = image_source_key_webgl(image)

  let texture = state.texture_cache.get(image)
  if (texture === undefined) {
    const created = gl.createTexture()
    if (created === null) {
      return null
    }

    texture = {
      texture: created,
      width,
      height,
      version: version ?? null,
      source_key,
    }
    state.texture_cache.set(image, texture)

    gl.bindTexture(gl.TEXTURE_2D, created)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    return texture
  }

  const size_changed = texture.width !== width || texture.height !== height
  const version_changed = version !== undefined && texture.version !== version
  const source_changed = texture.source_key !== source_key

  if (size_changed || refresh_canvas_each_draw || version_changed || source_changed) {
    gl.bindTexture(gl.TEXTURE_2D, texture.texture)
    if (size_changed) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, image)
    }
    texture.width = width
    texture.height = height
    texture.source_key = source_key
  }

  if (version !== undefined) {
    texture.version = version
  }

  return texture
}

function is_image_ready_webgl(image: image_source): boolean {
  if (image instanceof HTMLImageElement) {
    return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
  }

  return image.width > 0 && image.height > 0
}

function image_source_key_webgl(image: image_source): string | null {
  if (image instanceof HTMLImageElement) {
    return image.currentSrc || image.src || null
  }
  if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
    return `bitmap:${image.width}x${image.height}`
  }

  return null
}
