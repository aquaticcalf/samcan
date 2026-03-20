import type { transform } from "@/math/transform"
import type { webgl_state } from "@/renderer/webgl/types"

export function set_transform_webgl(state: webgl_state, t: transform): void {
  state.current_transform[0] = t[0]
  state.current_transform[1] = t[2]
  state.current_transform[2] = t[4]
  state.current_transform[3] = t[1]
  state.current_transform[4] = t[3]
  state.current_transform[5] = t[5]
  state.current_transform[6] = 0
  state.current_transform[7] = 0
  state.current_transform[8] = 1
}

export function reset_transform_webgl(state: webgl_state): void {
  state.current_transform[0] = 1
  state.current_transform[1] = 0
  state.current_transform[2] = 0
  state.current_transform[3] = 0
  state.current_transform[4] = 1
  state.current_transform[5] = 0
  state.current_transform[6] = 0
  state.current_transform[7] = 0
  state.current_transform[8] = 1
}

export function save_webgl(state: webgl_state): void {
  const copy = new Float32Array(9)
  copy.set(state.current_transform)
  state.transform_stack.push(copy)
}

export function restore_webgl(state: webgl_state): void {
  const previous = state.transform_stack.pop()
  if (previous !== undefined) {
    state.current_transform.set(previous)
  }
}
