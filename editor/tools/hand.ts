import type { editor_tool } from "@/editor/types"
import { pan_engine } from "@/engine/camera"
import { editor_tool_hand } from "@/editor/types"

export function create_hand_tool_editor(): editor_tool {
  return {
    id: editor_tool_hand,
    name: "hand",
    pointer_down: (state) => {
      state.drag_state = {
        kind: "pan",
        origin_screen: [state.pointer_screen[0], state.pointer_screen[1]],
        current_screen: [state.pointer_screen[0], state.pointer_screen[1]],
      }
      state.pointer_capture = true
    },
    pointer_move: (state) => {
      if (state.drag_state === null || state.drag_state.kind !== "pan") return
      const dx_screen = state.pointer_screen[0] - state.drag_state.current_screen[0]
      const dy_screen = state.pointer_screen[1] - state.drag_state.current_screen[1]
      state.drag_state.current_screen = [state.pointer_screen[0], state.pointer_screen[1]]
      const zoom = Math.max(0.001, state.engine.camera[2])
      pan_engine(state.engine, -dx_screen / zoom, -dy_screen / zoom)
    },
    pointer_up: (state) => {
      state.drag_state = null
      state.pointer_capture = false
    },
    double_click: () => {},
    key_down: () => {},
    cancel: (state) => {
      state.drag_state = null
      state.pointer_capture = false
    },
    hover: () => {},
    cursor: () => "grab",
    overlay: () => {},
  }
}
