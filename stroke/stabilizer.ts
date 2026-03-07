import type { vector2 } from "@/math/vector2"
import type { stabilizer_state } from "./stroke"

export const default_smoothing_factor = 0.3
export const default_stabilizer_history_size = 5

export function create_stabilizer(
  smoothing_factor: number = default_smoothing_factor,
): stabilizer_state {
  return {
    history: [],
    smoothing_factor,
  }
}

export function stabilize_point(state: stabilizer_state, raw: vector2, out: vector2): vector2 {
  if (state.history.length === 0) {
    out[0] = raw[0]
    out[1] = raw[1]
  } else {
    const last = state.history[state.history.length - 1]!
    out[0] = last[0] + state.smoothing_factor * (raw[0] - last[0])
    out[1] = last[1] + state.smoothing_factor * (raw[1] - last[1])
  }

  state.history.push([out[0], out[1]])

  if (state.history.length > default_stabilizer_history_size) {
    state.history.shift()
  }

  return out
}

export function reset_stabilizer(state: stabilizer_state): void {
  state.history = []
}

export function get_stabilized_history(state: stabilizer_state): readonly vector2[] {
  return state.history
}
