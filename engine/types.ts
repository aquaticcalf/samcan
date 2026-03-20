import type { camera } from "@/camera/camera"
import type { viewport } from "@/camera/projection"
import type { color } from "@/math/color"
import type { renderer, image_source } from "@/renderer/renderer"
import type { document } from "@/document/document"

export type engine_options = {
  readonly prefer_webgl?: boolean
  readonly path_cache_size?: number
  readonly document?: document
  readonly camera?: camera
  readonly background?: color
  readonly background_image?: image_source
}

export type engine = {
  renderer: renderer
  document: document
  camera: camera
  viewport: viewport
  background: color
  background_image: image_source | null
}

export type overlay_draw = (drawer: renderer) => void

export type layer_render_info = {
  order: number
  visible: boolean
}
