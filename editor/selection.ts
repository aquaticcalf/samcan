import type { document } from "@/document/document"
import type { rectangle } from "@/math/rectangle"
import { get_element_by_id_document } from "@/document/document"

export function selection_bounds_editor(doc: document, ids: readonly string[]): rectangle | null {
  if (ids.length === 0) {
    return null
  }

  let min_x = Infinity
  let min_y = Infinity
  let max_x = -Infinity
  let max_y = -Infinity
  let found = false

  for (let i = 0; i < ids.length; i = i + 1) {
    const id = ids[i]
    if (id === undefined) {
      continue
    }
    const element = get_element_by_id_document(doc, id)
    if (element === null) {
      continue
    }

    min_x = Math.min(min_x, element.bounds[0])
    min_y = Math.min(min_y, element.bounds[1])
    max_x = Math.max(max_x, element.bounds[0] + element.bounds[2])
    max_y = Math.max(max_y, element.bounds[1] + element.bounds[3])
    found = true
  }

  if (!found) {
    return null
  }

  return [min_x, min_y, max_x - min_x, max_y - min_y]
}

export function marquee_rectangle_editor(
  origin_x: number,
  origin_y: number,
  current_x: number,
  current_y: number,
): rectangle {
  const x = Math.min(origin_x, current_x)
  const y = Math.min(origin_y, current_y)
  const width = Math.abs(current_x - origin_x)
  const height = Math.abs(current_y - origin_y)
  return [x, y, width, height]
}

