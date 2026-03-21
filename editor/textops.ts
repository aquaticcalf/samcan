import type { editor } from "@/editor/types"
import { get_element_by_id_document } from "@/document/document"
import { element_type_text } from "@/document/element"
import {
  build_text_layout_editor,
  line_caret_x_editor,
  line_index_for_caret_editor,
  nearest_caret_for_x_editor,
} from "@/editor/textlayout"

export function move_caret_line_editor(state: editor, direction: number, extend: boolean): boolean {
  if (state.text_edit === null) return false
  const element = get_element_by_id_document(state.engine.document, state.text_edit.element_id)
  if (element === null || element.type !== element_type_text) return false
  const previous_caret = state.text_edit.caret
  const caret = state.text_edit.caret
  const layout = build_text_layout_editor(element, state.text_edit.draft)
  const line_index = line_index_for_caret_editor(layout, caret)
  const desired_x = state.text_edit.preferred_column ?? line_caret_x_editor(element, layout, line_index, caret)
  const target_line = Math.max(0, Math.min(layout.lines.length - 1, line_index + (direction < 0 ? -1 : 1)))
  const target = nearest_caret_for_x_editor(element, layout, target_line, desired_x)
  collapse_selection_if_needed_editor(state, direction < 0 ? "start" : "end", extend)
  state.text_edit.caret = target
  update_anchor_editor(state, extend, previous_caret)
  state.text_edit.preferred_column = desired_x
  return true
}

export function select_all_text_editor(state: editor): boolean {
  if (state.text_edit === null) return false
  state.text_edit.anchor = 0
  state.text_edit.caret = state.text_edit.draft.length
  state.text_edit.preferred_column = null
  return true
}

export function delete_selection_text_editor(state: editor): boolean {
  if (state.text_edit === null || state.text_edit.anchor === null) return false
  const start = Math.min(state.text_edit.anchor, state.text_edit.caret)
  const end = Math.max(state.text_edit.anchor, state.text_edit.caret)
  if (start === end) return false
  state.text_edit.draft = `${state.text_edit.draft.slice(0, start)}${state.text_edit.draft.slice(end)}`
  state.text_edit.caret = start
  state.text_edit.anchor = null
  return true
}

export function collapse_selection_if_needed_editor(
  state: editor,
  edge: "start" | "end",
  extend: boolean,
): void {
  if (state.text_edit === null || extend || state.text_edit.anchor === null) return
  const start = Math.min(state.text_edit.anchor, state.text_edit.caret)
  const end = Math.max(state.text_edit.anchor, state.text_edit.caret)
  if (start === end) {
    state.text_edit.anchor = null
    return
  }
  state.text_edit.caret = edge === "start" ? start : end
  state.text_edit.anchor = null
}

export function update_anchor_editor(state: editor, extend: boolean, previous_caret: number): void {
  if (state.text_edit === null) return
  if (extend) {
    if (state.text_edit.anchor === null) state.text_edit.anchor = previous_caret
    return
  }
  state.text_edit.anchor = null
}

