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
  }
  state.selected_element_ids.clear()
  state.selected_element_ids.add(element_id)
  return true
}

export function is_text_editing_editor(state: editor): boolean {
  return state.text_edit !== null
}

export function commit_text_edit_editor(state: editor): boolean {
  if (state.text_edit === null) {
    return false
  }
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
  if (state.text_edit === null) {
    return false
  }
  state.text_edit = null
  return true
}

export function handle_text_key_editor(state: editor, input: editor_key_input): boolean {
  if (state.text_edit === null) {
    return false
  }
  const key = input.key
  if (key === "Escape") {
    cancel_text_edit_editor(state)
    return true
  }
  if (key === "Enter" && !input.shift) {
    commit_text_edit_editor(state)
    return true
  }
  if (key === "Backspace") {
    state.text_edit.draft = state.text_edit.draft.slice(0, -1)
    return true
  }
  if (key === "Enter" && input.shift) {
    state.text_edit.draft = `${state.text_edit.draft}\n`
    return true
  }
  if (key === "Tab") {
    state.text_edit.draft = `${state.text_edit.draft}\t`
    return true
  }
  if (!input.ctrl && !input.meta && !input.alt && key.length === 1) {
    state.text_edit.draft = `${state.text_edit.draft}${key}`
    return true
  }
  return false
}

