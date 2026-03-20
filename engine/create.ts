import type { color } from "@/math/color"
import type { document } from "@/document/document"
import type { engine, engine_options } from "@/engine/types"
import type { image_source } from "@/renderer/renderer"
import { create_camera } from "@/camera/camera"
import { create_document, add_layer_document } from "@/document/document"
import { create_layer } from "@/document/layer"
import { create_renderer, create_renderer_config } from "@/renderer/renderer"
import { default_background } from "@/engine/shared"
import { sanitize_number_engine, sanitize_zoom_engine } from "@/engine/camera"

export function create_engine(
  canvas: HTMLCanvasElement,
  options: engine_options = {},
): engine | null {
  const defaults = create_renderer_config()
  const renderer_config = {
    prefer_webgl: options.prefer_webgl ?? defaults.prefer_webgl,
    path_cache_size: options.path_cache_size ?? defaults.path_cache_size,
  }

  const render_backend = create_renderer(canvas, renderer_config)
  if (render_backend === null) {
    return null
  }

  const initial_width = Math.max(1, canvas.clientWidth || canvas.width || 1)
  const initial_height = Math.max(1, canvas.clientHeight || canvas.height || 1)
  const initial_pixel_ratio = Math.max(1, globalThis.devicePixelRatio || 1)
  const initial_viewport = [initial_width, initial_height, initial_pixel_ratio] as const
  render_backend.resize(initial_width, initial_height, initial_pixel_ratio)

  let doc = options.document
  if (doc === undefined) {
    const created = create_document("doc_0", "layer_0")
    doc = add_layer_document(created, create_layer("layer_0", "Layer 1"))
  }

  const initial_camera = create_camera(0, 0, 1, 0)
  if (options.camera !== undefined) {
    initial_camera[0] = sanitize_number_engine(options.camera[0], 0)
    initial_camera[1] = sanitize_number_engine(options.camera[1], 0)
    initial_camera[2] = sanitize_zoom_engine(options.camera[2], 1)
    initial_camera[3] = sanitize_number_engine(options.camera[3], 0)
  }

  return {
    renderer: render_backend,
    document: doc,
    camera: initial_camera,
    viewport: [initial_viewport[0], initial_viewport[1], initial_viewport[2]],
    background: options.background
      ? [options.background[0], options.background[1], options.background[2], options.background[3]]
      : [
          default_background[0],
          default_background[1],
          default_background[2],
          default_background[3],
        ],
    background_image: options.background_image ?? null,
  }
}

export function dispose_engine(state: engine): void {
  state.renderer.dispose()
}

export function set_document_engine(state: engine, doc: document): engine {
  state.document = doc
  return state
}

export function set_background_engine(state: engine, value: color): engine {
  state.background[0] = value[0]
  state.background[1] = value[1]
  state.background[2] = value[2]
  state.background[3] = value[3]
  return state
}

export function set_background_image_engine(state: engine, value: image_source | null): engine {
  state.background_image = value
  return state
}
