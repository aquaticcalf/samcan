import type { renderer } from "@/renderer/renderer"
import type { editor, editor_key_input, editor_pointer_input, editor_tool } from "@/editor/types"

export const noop_pointer_editor = (_state: editor, _input: editor_pointer_input): void => {}
export const noop_key_editor = (_state: editor, _input: editor_key_input): void => {}
export const noop_cancel_editor = (_state: editor): void => {}
export const noop_overlay_editor = (_state: editor, _drawer: renderer): void => {}

export function create_tool_base_editor(id: editor_tool["id"], name: string): editor_tool {
  return {
    id,
    name,
    pointer_down: noop_pointer_editor,
    pointer_move: noop_pointer_editor,
    pointer_up: noop_pointer_editor,
    double_click: noop_pointer_editor,
    key_down: noop_key_editor,
    cancel: noop_cancel_editor,
    hover: noop_pointer_editor,
    cursor: () => "default",
    overlay: noop_overlay_editor,
  }
}
