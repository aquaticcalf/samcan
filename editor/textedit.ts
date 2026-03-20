import type { editor, editor_key_input } from "@/editor/types"
import { get_element_by_id_document, update_element_document } from "@/document/document"
import { element_type_text } from "@/document/element"
import { begin_transaction_editor, commit_transaction_editor } from "@/editor/history"

export function begin_text_edit_editor(state: editor, element_id: string): boolean {
  const element = get_element_by_id_document(state.engine.document, element_id)
  if (element === null || element.type !== element_type_text) {
    return false
  }
  state.text_edit = {
    element_id,
    draft: element.content,
    original: element.content,
    caret: element.content.length,
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
  if (key === "ArrowLeft") return move_caret_editor(state, -1)
  if (key === "ArrowRight") return move_caret_editor(state, 1)
  if (key === "Home") return set_caret_editor(state, 0)
  if (key === "End") return set_caret_editor(state, state.text_edit.draft.length)
  if (key === "Backspace") return backspace_editor(state)
  if (key === "Delete") return delete_editor(state)
  if (key === "Enter") return insert_text_editor(state, "\n")
  if (key === "Tab") return insert_text_editor(state, "\t")
  if (!input.ctrl && !input.meta && !input.alt && key.length === 1) {
    return insert_text_editor(state, key)
  }
  return true
}

function move_caret_editor(state: editor, delta: number): boolean {
  if (state.text_edit === null) return false
  const next = clamp_caret_editor(state.text_edit.caret + delta, state.text_edit.draft.length)
  state.text_edit.caret = next
  return true
}

function set_caret_editor(state: editor, value: number): boolean {
  if (state.text_edit === null) return false
  state.text_edit.caret = clamp_caret_editor(value, state.text_edit.draft.length)
  return true
}

function backspace_editor(state: editor): boolean {
  if (state.text_edit === null) return false
  const caret = state.text_edit.caret
  if (caret <= 0) return true
  const before = state.text_edit.draft.slice(0, caret - 1)
  const after = state.text_edit.draft.slice(caret)
  state.text_edit.draft = `${before}${after}`
  state.text_edit.caret = caret - 1
  return true
}

function delete_editor(state: editor): boolean {
  if (state.text_edit === null) return false
  const caret = state.text_edit.caret
  if (caret >= state.text_edit.draft.length) return true
  const before = state.text_edit.draft.slice(0, caret)
  const after = state.text_edit.draft.slice(caret + 1)
  state.text_edit.draft = `${before}${after}`
  return true
}

function insert_text_editor(state: editor, value: string): boolean {
  if (state.text_edit === null) return false
  const caret = state.text_edit.caret
  const before = state.text_edit.draft.slice(0, caret)
  const after = state.text_edit.draft.slice(caret)
  state.text_edit.draft = `${before}${value}${after}`
  state.text_edit.caret = caret + value.length
  return true
}

function clamp_caret_editor(value: number, length: number): number {
  return Math.max(0, Math.min(length, value))
}

