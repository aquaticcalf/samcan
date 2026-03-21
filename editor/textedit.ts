import type { editor, editor_key_input } from "@/editor/types"
import { get_element_by_id_document, update_element_document } from "@/document/document"
import { element_type_text } from "@/document/element"
import { begin_transaction_editor, commit_transaction_editor } from "@/editor/history"
import { caret_index_from_point_editor } from "@/editor/textlayout"
import {
  collapse_selection_if_needed_editor,
  delete_selection_text_editor,
  move_caret_line_editor,
  select_all_text_editor,
  update_anchor_editor,
} from "@/editor/textops"

export function begin_text_edit_editor(
  state: editor,
  element_id: string,
  caret_from_world?: [number, number],
): boolean {
  const element = get_element_by_id_document(state.engine.document, element_id)
  if (element === null || element.type !== element_type_text) {
    return false
  }
  const initial_caret =
    caret_from_world === undefined
      ? element.content.length
      : caret_index_from_point_editor(
          element,
          element.content,
          caret_from_world[0],
          caret_from_world[1],
        )
  state.text_edit = {
    element_id,
    draft: element.content,
    original: element.content,
    caret: initial_caret,
    anchor: null,
    preferred_column: null,
  }
  state.selected_element_ids.clear()
  state.selected_element_ids.add(element_id)
  return true
}

export function is_text_editing_editor(state: editor): boolean {
  return state.text_edit !== null
}

export function commit_text_edit_editor(state: editor): boolean {
  if (state.text_edit === null) return false
  const editing = state.text_edit
  const element = get_element_by_id_document(state.engine.document, editing.element_id)
  if (element === null || element.type !== element_type_text) {
    state.text_edit = null
    return false
  }
  if (editing.draft !== editing.original) {
    begin_transaction_editor(state, "text_edit")
    state.engine.document = update_element_document(state.engine.document, element.id, {
      ...element,
      content: editing.draft,
    })
    commit_transaction_editor(state)
  }
  state.text_edit = null
  return true
}

export function cancel_text_edit_editor(state: editor): boolean {
  if (state.text_edit === null) return false
  state.text_edit = null
  return true
}

export function handle_text_key_editor(state: editor, input: editor_key_input): boolean {
  if (state.text_edit === null) return false
  const key = input.key
  if (key === "Escape") return cancel_text_edit_editor(state)
  if (key === "Enter" && !!input.ctrl) return commit_text_edit_editor(state)
  if (key === "ArrowLeft") return move_caret_editor(state, -1, !!input.shift)
  if (key === "ArrowRight") return move_caret_editor(state, 1, !!input.shift)
  if (key === "ArrowUp") return move_caret_line_editor(state, -1, !!input.shift)
  if (key === "ArrowDown") return move_caret_line_editor(state, 1, !!input.shift)
  if (key === "Home") return set_caret_editor(state, 0, !!input.shift)
  if (key === "End") return set_caret_editor(state, state.text_edit.draft.length, !!input.shift)
  if ((key === "a" || key === "A") && (input.ctrl || input.meta)) return select_all_text_editor(state)
  if (key === "Backspace") return backspace_editor(state)
  if (key === "Delete") return delete_editor(state)
  if (key === "Enter") return insert_text_editor(state, "\n")
  if (key === "Tab") return insert_text_editor(state, "\t")
  if (!input.ctrl && !input.meta && !input.alt && key.length === 1) {
    return insert_text_editor(state, key)
  }
  return true
}

function move_caret_editor(state: editor, delta: number, extend: boolean): boolean {
  if (state.text_edit === null) return false
  const previous_caret = state.text_edit.caret
  collapse_selection_if_needed_editor(state, delta < 0 ? "start" : "end", extend)
  const next = clamp_caret_editor(state.text_edit.caret + delta, state.text_edit.draft.length)
  state.text_edit.caret = next
  update_anchor_editor(state, extend, previous_caret)
  state.text_edit.preferred_column = null
  return true
}

function set_caret_editor(state: editor, value: number, extend: boolean): boolean {
  if (state.text_edit === null) return false
  const previous_caret = state.text_edit.caret
  collapse_selection_if_needed_editor(state, value <= state.text_edit.caret ? "start" : "end", extend)
  state.text_edit.caret = clamp_caret_editor(value, state.text_edit.draft.length)
  update_anchor_editor(state, extend, previous_caret)
  state.text_edit.preferred_column = null
  return true
}

function backspace_editor(state: editor): boolean {
  if (state.text_edit === null) return false
  if (delete_selection_text_editor(state)) return true
  const caret = state.text_edit.caret
  if (caret <= 0) return true
  const before = state.text_edit.draft.slice(0, caret - 1)
  const after = state.text_edit.draft.slice(caret)
  state.text_edit.draft = `${before}${after}`
  state.text_edit.caret = caret - 1
  state.text_edit.anchor = null
  state.text_edit.preferred_column = null
  return true
}

function delete_editor(state: editor): boolean {
  if (state.text_edit === null) return false
  if (delete_selection_text_editor(state)) return true
  const caret = state.text_edit.caret
  if (caret >= state.text_edit.draft.length) return true
  const before = state.text_edit.draft.slice(0, caret)
  const after = state.text_edit.draft.slice(caret + 1)
  state.text_edit.draft = `${before}${after}`
  state.text_edit.anchor = null
  state.text_edit.preferred_column = null
  return true
}

function insert_text_editor(state: editor, value: string): boolean {
  if (state.text_edit === null) return false
  delete_selection_text_editor(state)
  const caret = state.text_edit.caret
  const before = state.text_edit.draft.slice(0, caret)
  const after = state.text_edit.draft.slice(caret)
  state.text_edit.draft = `${before}${value}${after}`
  state.text_edit.caret = caret + value.length
  state.text_edit.anchor = null
  state.text_edit.preferred_column = null
  return true
}

function clamp_caret_editor(value: number, length: number): number {
  return Math.max(0, Math.min(length, value))
}
