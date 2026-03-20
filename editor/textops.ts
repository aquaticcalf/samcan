import type { editor } from "@/editor/types"

export function move_caret_line_editor(state: editor, direction: number, extend: boolean): boolean {
  if (state.text_edit === null) return false
  const previous_caret = state.text_edit.caret
  const text = state.text_edit.draft
  const caret = state.text_edit.caret
  const line_start = line_start_editor(text, caret)
  const column = state.text_edit.preferred_column ?? caret - line_start
  let target = caret
  if (direction < 0) {
    if (line_start === 0) {
      target = 0
    } else {
      const prev_end = line_start - 1
      const prev_start = line_start_editor(text, prev_end)
      target = Math.min(prev_start + column, prev_end)
    }
  } else {
    const line_end = line_end_editor(text, caret)
    if (line_end >= text.length) {
      target = text.length
    } else {
      const next_start = line_end + 1
      const next_end = line_end_editor(text, next_start)
      target = Math.min(next_start + column, next_end)
    }
  }
  collapse_selection_if_needed_editor(state, direction < 0 ? "start" : "end", extend)
  state.text_edit.caret = target
  update_anchor_editor(state, extend, previous_caret)
  state.text_edit.preferred_column = column
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

function line_start_editor(text: string, index: number): number {
  return text.lastIndexOf("\n", Math.max(0, index - 1)) + 1
}

function line_end_editor(text: string, index: number): number {
  const end = text.indexOf("\n", index)
  return end === -1 ? text.length : end
}

