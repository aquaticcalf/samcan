import type { document } from "@/document/document"
import type { element } from "@/document/element"
import { element_type_image } from "@/document/element"
import type { engine, layer_render_info, overlay_draw } from "@/engine/types"
import { elements_in_bounds_document } from "@/document/query"
import { scratch_transform } from "@/engine/shared"
import { camera_to_screen_transform_engine, visible_bounds_world_engine } from "@/engine/camera"
import { render_element_engine } from "@/engine/elements"

export function render_engine(state: engine): void {
  render_engine_with_overlay(state, null)
}

export function render_engine_with_overlay(state: engine, overlay: overlay_draw | null): void {
  const view_bounds = visible_bounds_world_engine(state)
  const visible_elements = elements_in_bounds_document(state.document, view_bounds)
  const layer_info = build_layer_render_info_map_engine(state.document)
  const renderable_elements: element[] = []

  for (let i = 0; i < visible_elements.length; i = i + 1) {
    const el = visible_elements[i]
    if (el === undefined) {
      continue
    }

    const info = layer_info.get(el.layer_id)
    if (info === undefined || info.visible) {
      renderable_elements.push(el)
    }
  }

  renderable_elements.sort((a, b) => {
    const a_order = layer_info.get(a.layer_id)?.order ?? Number.MAX_SAFE_INTEGER
    const b_order = layer_info.get(b.layer_id)?.order ?? Number.MAX_SAFE_INTEGER
    if (a_order !== b_order) {
      return a_order - b_order
    }
    return a.z_index - b.z_index
  })

  state.renderer.begin_frame()
  state.renderer.clear(state.background)
  camera_to_screen_transform_engine(state.camera, state.viewport, scratch_transform)
  state.renderer.set_transform(scratch_transform)

  if (state.background_image !== null) {
    state.renderer.draw_image(
      state.background_image,
      [0, 0, state.background_image.width, state.background_image.height],
      1.0,
    )
  }

  for (let i = 0; i < renderable_elements.length; i = i + 1) {
    const el = renderable_elements[i]
    if (el !== undefined) {
      const asset_src =
        el.type === element_type_image && el.asset_id !== null
          ? (state.document.assets.get(el.asset_id)?.src ?? null)
          : null
      render_element_engine(state.renderer, el, asset_src)
    }
  }

  if (overlay !== null) {
    overlay(state.renderer)
  }

  state.renderer.end_frame()
}

function build_layer_render_info_map_engine(doc: document): Map<string, layer_render_info> {
  const map = new Map<string, layer_render_info>()
  for (let i = 0; i < doc.layers.length; i = i + 1) {
    const layer = doc.layers[i]
    if (layer !== undefined) {
      map.set(layer.id, { order: i, visible: layer.visible })
    }
  }
  return map
}
