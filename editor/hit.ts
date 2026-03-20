import type { rectangle } from "@/math/rectangle"
import type { vector2 } from "@/math/vector2"

export type selection_handle = {
  id: string
  bounds: rectangle
}

const handle_size = 10
const rotate_offset = 28

export function selection_handles_editor(bounds: rectangle): selection_handle[] {
  const x = bounds[0]
  const y = bounds[1]
  const w = bounds[2]
  const h = bounds[3]
  const cx = x + w / 2
  const cy = y + h / 2
  const hs = handle_size / 2

  return [
    { id: "nw", bounds: [x - hs, y - hs, handle_size, handle_size] },
    { id: "n", bounds: [cx - hs, y - hs, handle_size, handle_size] },
    { id: "ne", bounds: [x + w - hs, y - hs, handle_size, handle_size] },
    { id: "e", bounds: [x + w - hs, cy - hs, handle_size, handle_size] },
    { id: "se", bounds: [x + w - hs, y + h - hs, handle_size, handle_size] },
    { id: "s", bounds: [cx - hs, y + h - hs, handle_size, handle_size] },
    { id: "sw", bounds: [x - hs, y + h - hs, handle_size, handle_size] },
    { id: "w", bounds: [x - hs, cy - hs, handle_size, handle_size] },
    { id: "rotate", bounds: [cx - hs, y - rotate_offset - hs, handle_size, handle_size] },
  ]
}

export function hit_selection_handle_editor(
  bounds: rectangle,
  point: vector2,
): selection_handle | null {
  const handles = selection_handles_editor(bounds)
  for (let i = 0; i < handles.length; i = i + 1) {
    const handle = handles[i]
    if (handle === undefined) {
      continue
    }
    if (contains_point_editor(handle.bounds, point)) {
      return handle
    }
  }
  return null
}

export function contains_point_editor(bounds: rectangle, point: vector2): boolean {
  return (
    point[0] >= bounds[0] &&
    point[0] <= bounds[0] + bounds[2] &&
    point[1] >= bounds[1] &&
    point[1] <= bounds[1] + bounds[3]
  )
}

