import type { rectangle } from "@/math/rectangle"
import type { element } from "@/document/element"
import type { layer } from "@/document/layer"
import { add_element_id_to_layer, remove_element_id_from_layer } from "@/document/layer"

export type document = {
  id: string
  elements: Map<string, element>
  layers: layer[]
  active_layer_id: string
  bounds: rectangle
  element_count: number
}

export function create_document(id: string, active_layer_id: string): document {
  return {
    id,
    elements: new Map(),
    layers: [],
    active_layer_id,
    bounds: [0, 0, 0, 0],
    element_count: 0,
  }
}

export function clone_document(doc: document): document {
  const new_elements = new Map<string, element>()
  for (const [id, el] of doc.elements) {
    new_elements.set(id, el)
  }
  return {
    id: doc.id,
    elements: new_elements,
    layers: doc.layers.map((l) => ({ ...l, element_ids: [...l.element_ids] })),
    active_layer_id: doc.active_layer_id,
    bounds: [doc.bounds[0], doc.bounds[1], doc.bounds[2], doc.bounds[3]],
    element_count: doc.element_count,
  }
}

export function id_of_document(doc: document): string {
  return doc.id
}

export function elements_map_of_document(doc: document): Map<string, element> {
  return doc.elements
}

export function layers_of_document(doc: document): readonly layer[] {
  return doc.layers
}

export function active_layer_id_of_document(doc: document): string {
  return doc.active_layer_id
}

export function bounds_of_document(doc: document): rectangle {
  return [doc.bounds[0], doc.bounds[1], doc.bounds[2], doc.bounds[3]]
}

export function element_count_of_document(doc: document): number {
  return doc.element_count
}

export function get_element_by_id_document(doc: document, element_id: string): element | null {
  return doc.elements.get(element_id) || null
}

export function get_layer_by_id_document(doc: document, layer_id: string): layer | null {
  for (let i = 0; i < doc.layers.length; i = i + 1) {
    const layer = doc.layers[i]
    if (layer && layer.id === layer_id) {
      return layer
    }
  }
  return null
}

export function add_element_document(doc: document, el: element): document {
  const layer = get_layer_by_id_document(doc, el.layer_id)
  if (layer === null) {
    return doc
  }

  const new_elements = new Map(doc.elements)
  new_elements.set(el.id, el)

  const new_layers = doc.layers.map((l) => {
    if (l.id === el.layer_id) {
      return add_element_id_to_layer(l, el.id)
    }
    return l
  })

  const new_bounds = calculate_bounds_document_internal(new_elements)

  return {
    id: doc.id,
    elements: new_elements,
    layers: new_layers,
    active_layer_id: doc.active_layer_id,
    bounds: new_bounds,
    element_count: new_elements.size,
  }
}

export function remove_element_document(doc: document, element_id: string): document {
  const el = doc.elements.get(element_id)
  if (el === undefined) {
    return doc
  }

  const new_elements = new Map(doc.elements)
  new_elements.delete(element_id)

  const new_layers = doc.layers.map((l) => {
    if (l.id === el.layer_id) {
      return remove_element_id_from_layer(l, element_id)
    }
    return l
  })

  const new_bounds = calculate_bounds_document_internal(new_elements)

  return {
    id: doc.id,
    elements: new_elements,
    layers: new_layers,
    active_layer_id: doc.active_layer_id,
    bounds: new_bounds,
    element_count: new_elements.size,
  }
}

export function update_element_document(
  doc: document,
  element_id: string,
  new_element: element,
): document {
  if (!doc.elements.has(element_id)) {
    return doc
  }

  const old_element = doc.elements.get(element_id)
  if (old_element === undefined) {
    return doc
  }

  const new_elements = new Map(doc.elements)
  new_elements.set(element_id, new_element)

  let new_layers = doc.layers
  if (old_element.layer_id !== new_element.layer_id) {
    new_layers = doc.layers.map((l) => {
      if (l.id === old_element.layer_id) {
        return remove_element_id_from_layer(l, element_id)
      }
      if (l.id === new_element.layer_id) {
        return add_element_id_to_layer(l, element_id)
      }
      return l
    })
  }

  const new_bounds = calculate_bounds_document_internal(new_elements)

  return {
    id: doc.id,
    elements: new_elements,
    layers: new_layers,
    active_layer_id: doc.active_layer_id,
    bounds: new_bounds,
    element_count: new_elements.size,
  }
}

export function add_layer_document(doc: document, layer: layer): document {
  const existing = get_layer_by_id_document(doc, layer.id)
  if (existing !== null) {
    return doc
  }

  return {
    id: doc.id,
    elements: doc.elements,
    layers: [...doc.layers, layer],
    active_layer_id: doc.active_layer_id,
    bounds: doc.bounds,
    element_count: doc.element_count,
  }
}

export function remove_layer_document(doc: document, layer_id: string): document {
  const layer = get_layer_by_id_document(doc, layer_id)
  if (layer === null) {
    return doc
  }

  const new_elements = new Map(doc.elements)
  for (const element_id of layer.element_ids) {
    new_elements.delete(element_id)
  }

  const new_layers = doc.layers.filter((l) => l.id !== layer_id)
  let new_active_layer_id = doc.active_layer_id
  if (doc.active_layer_id === layer_id) {
    if (new_layers.length > 0) {
      const first_layer = new_layers[0]
      if (first_layer !== undefined) {
        new_active_layer_id = first_layer.id
      } else {
        new_active_layer_id = ""
      }
    } else {
      new_active_layer_id = ""
    }
  }

  const new_bounds = calculate_bounds_document_internal(new_elements)

  return {
    id: doc.id,
    elements: new_elements,
    layers: new_layers,
    active_layer_id: new_active_layer_id,
    bounds: new_bounds,
    element_count: new_elements.size,
  }
}

export function reorder_layers_document(doc: document, layer_ids: string[]): document {
  const id_set = new Set(layer_ids)
  const existing_ids = doc.layers.map((l) => l.id)
  const missing_ids = existing_ids.filter((id) => !id_set.has(id))

  const ordered_layers: layer[] = []
  const layer_map = new Map(doc.layers.map((l) => [l.id, l]))

  for (const id of layer_ids) {
    const layer = layer_map.get(id)
    if (layer) {
      ordered_layers.push(layer)
    }
  }

  for (const id of missing_ids) {
    const layer = layer_map.get(id)
    if (layer) {
      ordered_layers.push(layer)
    }
  }

  return {
    id: doc.id,
    elements: doc.elements,
    layers: ordered_layers,
    active_layer_id: doc.active_layer_id,
    bounds: doc.bounds,
    element_count: doc.element_count,
  }
}

export function set_active_layer_document(doc: document, layer_id: string): document {
  const layer = get_layer_by_id_document(doc, layer_id)
  if (layer === null) {
    return doc
  }

  return {
    id: doc.id,
    elements: doc.elements,
    layers: doc.layers,
    active_layer_id: layer_id,
    bounds: doc.bounds,
    element_count: doc.element_count,
  }
}

export function get_elements_in_layer_document(doc: document, layer_id: string): element[] {
  const layer = get_layer_by_id_document(doc, layer_id)
  if (layer === null) {
    return []
  }

  const elements: element[] = []
  for (const element_id of layer.element_ids) {
    const el = doc.elements.get(element_id)
    if (el !== undefined) {
      elements.push(el)
    }
  }
  return elements
}

export function get_all_elements_document(doc: document): element[] {
  return Array.from(doc.elements.values())
}

function calculate_bounds_document_internal(elements: Map<string, element>): rectangle {
  if (elements.size === 0) {
    return [0, 0, 0, 0]
  }

  let min_x = Infinity
  let min_y = Infinity
  let max_x = -Infinity
  let max_y = -Infinity

  for (const el of elements.values()) {
    const bounds = el.bounds
    min_x = Math.min(min_x, bounds[0])
    min_y = Math.min(min_y, bounds[1])
    max_x = Math.max(max_x, bounds[0] + bounds[2])
    max_y = Math.max(max_y, bounds[1] + bounds[3])
  }

  if (min_x === Infinity) {
    return [0, 0, 0, 0]
  }

  return [min_x, min_y, max_x - min_x, max_y - min_y]
}

export function recalculate_bounds_document(doc: document): document {
  const new_bounds = calculate_bounds_document_internal(doc.elements)
  return {
    id: doc.id,
    elements: doc.elements,
    layers: doc.layers,
    active_layer_id: doc.active_layer_id,
    bounds: new_bounds,
    element_count: doc.element_count,
  }
}

export function clear_document(doc: document): document {
  return {
    id: doc.id,
    elements: new Map(),
    layers: doc.layers.map((l) => ({ ...l, element_ids: [] })),
    active_layer_id: doc.active_layer_id,
    bounds: [0, 0, 0, 0],
    element_count: 0,
  }
}
