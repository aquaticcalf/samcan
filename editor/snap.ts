import type {
  editor,
  editor_snap_context,
  editor_snap_result,
  editor_snapper,
} from "@/editor/types"
import type { rectangle } from "@/math/rectangle"
import type { vector2 } from "@/math/vector2"

export function snap_point_editor(
  state: editor,
  point: vector2,
  context: editor_snap_context,
): vector2 {
  if (state.snappers.length === 0) {
    state.transient_guides = []
    return [point[0], point[1]]
  }
  let best_point: vector2 = [point[0], point[1]]
  const guides: rectangle[] = []
  for (let i = 0; i < state.snappers.length; i = i + 1) {
    const snapper = state.snappers[i]
    if (snapper === undefined) continue
    const result = snapper(state, best_point, context)
    if (result === null) continue
    best_point = [result.point[0], result.point[1]]
    for (let j = 0; j < result.guides.length; j = j + 1) {
      const guide = result.guides[j]
      if (guide !== undefined) guides.push(guide)
    }
  }
  state.transient_guides = guides
  return best_point
}

export function create_grid_snapper_editor(
  grid_size: number = 16,
  tolerance: number = 6,
): editor_snapper {
  const safe_grid = Math.max(1, grid_size)
  const safe_tol = Math.max(0.1, tolerance)
  return (_state, point): editor_snap_result | null => {
    const gx = Math.round(point[0] / safe_grid) * safe_grid
    const gy = Math.round(point[1] / safe_grid) * safe_grid
    const dx = Math.abs(gx - point[0])
    const dy = Math.abs(gy - point[1])
    const snapped_x = dx <= safe_tol ? gx : point[0]
    const snapped_y = dy <= safe_tol ? gy : point[1]
    if (snapped_x === point[0] && snapped_y === point[1]) {
      return null
    }
    const guides: rectangle[] = []
    if (snapped_x !== point[0]) guides.push([snapped_x - 0.25, -100000, 0.5, 200000])
    if (snapped_y !== point[1]) guides.push([-100000, snapped_y - 0.25, 200000, 0.5])
    return { point: [snapped_x, snapped_y], guides }
  }
}

export function create_element_smart_snapper_editor(tolerance: number = 6): editor_snapper {
  const safe_tol = Math.max(0.1, tolerance)
  return (state, point, context): editor_snap_result | null => {
    if (context === "rotate") {
      return null
    }
    const candidates_x: number[] = []
    const candidates_y: number[] = []
    for (const element of state.engine.document.elements.values()) {
      if (state.selected_element_ids.has(element.id)) {
        continue
      }
      const bounds = element.bounds
      candidates_x.push(bounds[0], bounds[0] + bounds[2], bounds[0] + bounds[2] / 2)
      candidates_y.push(bounds[1], bounds[1] + bounds[3], bounds[1] + bounds[3] / 2)
    }

    const snapped_x = closest_axis_snap_editor(point[0], candidates_x, safe_tol)
    const snapped_y = closest_axis_snap_editor(point[1], candidates_y, safe_tol)
    if (snapped_x === null && snapped_y === null) {
      return null
    }

    const out_x = snapped_x ?? point[0]
    const out_y = snapped_y ?? point[1]
    const guides: rectangle[] = []
    if (snapped_x !== null) {
      guides.push([out_x - 0.25, -100000, 0.5, 200000])
    }
    if (snapped_y !== null) {
      guides.push([-100000, out_y - 0.25, 200000, 0.5])
    }
    return { point: [out_x, out_y], guides }
  }
}

function closest_axis_snap_editor(
  value: number,
  candidates: readonly number[],
  tolerance: number,
): number | null {
  let best: number | null = null
  let best_delta = Infinity
  for (let i = 0; i < candidates.length; i = i + 1) {
    const candidate = candidates[i]
    if (candidate === undefined) {
      continue
    }
    const delta = Math.abs(candidate - value)
    if (delta <= tolerance && delta < best_delta) {
      best_delta = delta
      best = candidate
    }
  }
  return best
}
