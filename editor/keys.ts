import type { editor, editor_key_input } from "@/editor/types"
import {
  editor_tool_arrow,
  editor_tool_draw,
  editor_tool_ellipse,
  editor_tool_frame,
  editor_tool_hand,
  editor_tool_image_place,
  editor_tool_line,
  editor_tool_rectangle,
  editor_tool_select,
  editor_tool_text,
} from "@/editor/types"
import {
  copy_selection_editor,
  cut_selection_editor,
  delete_selection_editor,
  duplicate_selection_editor,
  group_selection_editor,
  paste_clipboard_editor,
  redo_action_editor,
  ungroup_selection_editor,
  undo_action_editor,
} from "@/editor/actions"
import { current_tool_impl_editor } from "@/editor/shared"

export function handle_global_key_editor(state: editor, input: editor_key_input): boolean {
  const normalized = normalize_key_editor(input.key)
  const mod = !!input.meta || !!input.ctrl
  if (mod && normalized === "z" && !input.shift) return undo_action_editor(state)
  if ((mod && normalized === "y") || (mod && normalized === "z" && !!input.shift)) return redo_action_editor(state)
  if (mod && normalized === "c") return copy_selection_editor(state)
  if (mod && normalized === "x") return cut_selection_editor(state)
  if (mod && normalized === "v") return paste_clipboard_editor(state)
  if (mod && normalized === "d") return duplicate_selection_editor(state)
  if (mod && normalized === "g" && !!input.shift) return ungroup_selection_editor(state)
  if (mod && normalized === "g") return group_selection_editor(state)
  if (normalized === "delete" || normalized === "backspace") return delete_selection_editor(state)
  if (normalized === "escape") {
    current_tool_impl_editor(state).cancel(state)
    return true
  }
  if (normalized === " ") {
    if (state.current_tool !== editor_tool_hand) {
      state.previous_tool_before_hand = state.current_tool
      state.current_tool = editor_tool_hand
    }
    return true
  }
  if (normalized === "v") return set_tool_shortcut_editor(state, editor_tool_select)
  if (normalized === "h") return set_tool_shortcut_editor(state, editor_tool_hand)
  if (normalized === "p") return set_tool_shortcut_editor(state, editor_tool_draw)
  if (normalized === "r") return set_tool_shortcut_editor(state, editor_tool_rectangle)
  if (normalized === "e") return set_tool_shortcut_editor(state, editor_tool_ellipse)
  if (normalized === "l") return set_tool_shortcut_editor(state, editor_tool_line)
  if (normalized === "a") return set_tool_shortcut_editor(state, editor_tool_arrow)
  if (normalized === "f") return set_tool_shortcut_editor(state, editor_tool_frame)
  if (normalized === "t") return set_tool_shortcut_editor(state, editor_tool_text)
  if (normalized === "i") return set_tool_shortcut_editor(state, editor_tool_image_place)
  return false
}

export function normalize_key_editor(key: string): string {
  return key.toLowerCase()
}

function set_tool_shortcut_editor(state: editor, tool: number): boolean {
  if (!state.tools.has(tool) || state.current_tool === tool) return true
  current_tool_impl_editor(state).cancel(state)
  state.current_tool = tool
  return true
}
