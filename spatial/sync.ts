import type { spatial_index, spatial_index_config } from "@/spatial/index"
import type { document } from "@/document/document"
import type { element } from "@/document/element"
import {
  create_spatial_index,
  create_spatial_index_from_document,
  insert_spatial_index,
  remove_spatial_index,
  update_spatial_index,
  rebuild_spatial_index,
} from "@/spatial/index"

export type spatial_index_manager = {
  index: spatial_index
  version: number
}

export function create_spatial_index_manager(config: spatial_index_config): spatial_index_manager {
  return {
    index: create_spatial_index(config),
    version: 0,
  }
}

export function create_spatial_index_manager_from_document(
  doc: document,
  config: spatial_index_config,
): spatial_index_manager {
  return {
    index: create_spatial_index_from_document(doc, config),
    version: 1,
  }
}

export function sync_spatial_index_on_add_element(
  manager: spatial_index_manager,
  doc: document,
  el: element,
): spatial_index_manager {
  const new_index = insert_spatial_index(manager.index, el.id, el.bounds)
  return {
    index: new_index,
    version: manager.version + 1,
  }
}

export function sync_spatial_index_on_remove_element(
  manager: spatial_index_manager,
  doc: document,
  element_id: string,
): spatial_index_manager {
  const new_index = remove_spatial_index(manager.index, element_id)
  return {
    index: new_index,
    version: manager.version + 1,
  }
}

export function sync_spatial_index_on_update_element(
  manager: spatial_index_manager,
  doc: document,
  element_id: string,
  new_bounds: [number, number, number, number],
): spatial_index_manager {
  const new_index = update_spatial_index(manager.index, element_id, new_bounds)
  return {
    index: new_index,
    version: manager.version + 1,
  }
}

export function sync_spatial_index_on_rebuild(
  manager: spatial_index_manager,
  doc: document,
): spatial_index_manager {
  const new_index = rebuild_spatial_index(manager.index, doc.elements)
  return {
    index: new_index,
    version: manager.version + 1,
  }
}

export function is_spatial_index_synced(manager: spatial_index_manager, _doc: document): boolean {
  return manager.version > 0
}

export function force_sync_spatial_index(
  manager: spatial_index_manager,
  doc: document,
): spatial_index_manager {
  return sync_spatial_index_on_rebuild(manager, doc)
}
