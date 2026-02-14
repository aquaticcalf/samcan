import type { rectangle } from "@/math/rectangle"
import type { document } from "@/document/document"
import type { element } from "@/document/element"
import type { quadtree } from "@/math/quadtree"
import { create_quadtree, insert_quadtree, create_quadtree_point } from "@/math/quadtree"

export type spatial_index = {
  tree: quadtree
  element_map: Map<string, element>
}

export function create_spatial_index(bounds: rectangle): spatial_index {
  const tree = create_quadtree([bounds[0], bounds[1], bounds[2], bounds[3]], 8, 10)
  return {
    tree,
    element_map: new Map(),
  }
}

export function build_spatial_index(doc: document): spatial_index {
  const bounds = doc.bounds
  const index = create_spatial_index(bounds)

  for (const el of doc.elements.values()) {
    index.element_map.set(el.id, el)
  }

  let current_tree = index.tree
  for (const el of doc.elements.values()) {
    const center_x = el.bounds[0] + el.bounds[2] / 2
    const center_y = el.bounds[1] + el.bounds[3] / 2
    const point = create_quadtree_point(center_x, center_y, el.id)
    current_tree = insert_quadtree(current_tree, point)
  }

  index.tree = current_tree
  return index
}

export function rebuild_spatial_index(index: spatial_index, doc: document): spatial_index {
  return build_spatial_index(doc)
}

export function elements_in_bounds_document(doc: document, bounds: rectangle): element[] {
  const results: element[] = []

  for (const el of doc.elements.values()) {
    const el_bounds = el.bounds
    if (
      el_bounds[0] < bounds[0] + bounds[2] &&
      el_bounds[0] + el_bounds[2] > bounds[0] &&
      el_bounds[1] < bounds[1] + bounds[3] &&
      el_bounds[1] + el_bounds[3] > bounds[1]
    ) {
      results.push(el)
    }
  }

  return results
}

export function element_at_point_document(doc: document, x: number, y: number): element | null {
  let topmost_element: element | null = null
  let highest_z_index = -Infinity

  for (const el of doc.elements.values()) {
    const bounds = el.bounds
    if (
      x >= bounds[0] &&
      x <= bounds[0] + bounds[2] &&
      y >= bounds[1] &&
      y <= bounds[1] + bounds[3]
    ) {
      if (el.z_index > highest_z_index) {
        highest_z_index = el.z_index
        topmost_element = el
      }
    }
  }

  return topmost_element
}

export function elements_at_point_document(doc: document, x: number, y: number): element[] {
  const results: element[] = []

  for (const el of doc.elements.values()) {
    const bounds = el.bounds
    if (
      x >= bounds[0] &&
      x <= bounds[0] + bounds[2] &&
      y >= bounds[1] &&
      y <= bounds[1] + bounds[3]
    ) {
      results.push(el)
    }
  }

  results.sort((a, b) => b.z_index - a.z_index)
  return results
}

export function elements_in_radius_document(
  doc: document,
  center_x: number,
  center_y: number,
  radius: number,
): element[] {
  const results: element[] = []
  const radius_squared = radius * radius

  for (const el of doc.elements.values()) {
    const center_el_x = el.bounds[0] + el.bounds[2] / 2
    const center_el_y = el.bounds[1] + el.bounds[3] / 2
    const dx = center_el_x - center_x
    const dy = center_el_y - center_y
    const distance_squared = dx * dx + dy * dy

    if (distance_squared <= radius_squared) {
      results.push(el)
    }
  }

  return results
}

export function elements_in_layer_in_bounds_document(
  doc: document,
  layer_id: string,
  bounds: rectangle,
): element[] {
  const results: element[] = []

  for (const el of doc.elements.values()) {
    if (el.layer_id !== layer_id) {
      continue
    }

    const el_bounds = el.bounds
    if (
      el_bounds[0] < bounds[0] + bounds[2] &&
      el_bounds[0] + el_bounds[2] > bounds[0] &&
      el_bounds[1] < bounds[1] + bounds[3] &&
      el_bounds[1] + el_bounds[3] > bounds[1]
    ) {
      results.push(el)
    }
  }

  return results
}

export function elements_by_z_index_document(doc: document): element[] {
  const elements = Array.from(doc.elements.values())
  elements.sort((a, b) => a.z_index - b.z_index)
  return elements
}

export function elements_in_z_index_range_document(
  doc: document,
  min_z: number,
  max_z: number,
): element[] {
  const results: element[] = []

  for (const el of doc.elements.values()) {
    if (el.z_index >= min_z && el.z_index <= max_z) {
      results.push(el)
    }
  }

  results.sort((a, b) => a.z_index - b.z_index)
  return results
}

export function find_element_by_id_document(doc: document, element_id: string): element | null {
  return doc.elements.get(element_id) || null
}

export function has_element_document(doc: document, element_id: string): boolean {
  return doc.elements.has(element_id)
}

export function count_elements_in_bounds_document(doc: document, bounds: rectangle): number {
  let count = 0

  for (const el of doc.elements.values()) {
    const el_bounds = el.bounds
    if (
      el_bounds[0] < bounds[0] + bounds[2] &&
      el_bounds[0] + el_bounds[2] > bounds[0] &&
      el_bounds[1] < bounds[1] + bounds[3] &&
      el_bounds[1] + el_bounds[3] > bounds[1]
    ) {
      count = count + 1
    }
  }

  return count
}
