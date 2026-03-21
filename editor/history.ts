import type { editor } from "@/editor/types"
import { clone_document } from "@/document/document"

export function begin_transaction_editor(state: editor, label: string): void {
  if (state.active_transaction !== null) {
    return
  }

  state.active_transaction = {
    label,
    before: clone_document(state.engine.document),
  }
}

export function commit_transaction_editor(state: editor): void {
  if (state.active_transaction === null) {
    return
  }

  const before = state.active_transaction.before
  const after = state.engine.document
  if (before !== after) {
    state.undo_stack.push(before)
    state.redo_stack = []
  }
  state.active_transaction = null
}

export function cancel_transaction_editor(state: editor): void {
  if (state.active_transaction === null) {
    return
  }

  state.engine.document = state.active_transaction.before
  state.active_transaction = null
}

export function undo_editor(state: editor): boolean {
  if (state.active_transaction !== null) {
    return false
  }

  const previous = state.undo_stack.pop()
  if (previous === undefined) {
    return false
  }

  state.redo_stack.push(clone_document(state.engine.document))
  state.engine.document = previous
  return true
}

export function redo_editor(state: editor): boolean {
  if (state.active_transaction !== null) {
    return false
  }

  const next = state.redo_stack.pop()
  if (next === undefined) {
    return false
  }

  state.undo_stack.push(clone_document(state.engine.document))
  state.engine.document = next
  return true
}
