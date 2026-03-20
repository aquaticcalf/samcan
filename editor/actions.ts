import type { element } from "@/document/element"
import type { editor } from "@/editor/types"
import type { vector2 } from "@/math/vector2"
import { get_element_by_id_document, remove_element_document } from "@/document/document"
import { screen_to_world_engine } from "@/engine/camera"
import {
  begin_transaction_editor,
  cancel_transaction_editor,
  commit_transaction_editor,
  redo_editor,
  undo_editor,
} from "@/editor/history"
import { clone_element_editor } from "@/editor/clone"
import { insert_elements_with_offset_editor } from "@/editor/ops"
import { cleanup_selection_editor } from "@/editor/shared"
import { selection_bounds_editor } from "@/editor/selection"

export function copy_selection_editor(state: editor): boolean {
  const selected_ids = Array.from(state.selected_element_ids.values())
  if (selected_ids.length === 0) return false
  const payload_elements: element[] = []
  for (let i = 0; i < selected_ids.length; i = i + 1) {
    const id = selected_ids[i]
    if (id === undefined) continue
    const el = get_element_by_id_document(state.engine.document, id)
    if (el !== null) payload_elements.push(clone_element_editor(el))
  }
  if (payload_elements.length === 0) return false
  const bounds = selection_bounds_editor(state.engine.document, selected_ids)
  const anchor: vector2 =
    bounds === null
      ? [state.pointer_world[0], state.pointer_world[1]]
      : [bounds[0] + bounds[2] / 2, bounds[1] + bounds[3] / 2]
  state.clipboard_payload = { elements: payload_elements, anchor }
  return true
}

export function cut_selection_editor(state: editor): boolean {
  return copy_selection_editor(state) ? delete_selection_editor(state) : false
}

export function paste_clipboard_editor(state: editor, world_anchor?: vector2): boolean {
  if (state.clipboard_payload === null || state.clipboard_payload.elements.length === 0) return false
  const anchor = world_anchor ?? paste_anchor_editor(state)
  const dx = anchor[0] - state.clipboard_payload.anchor[0] + 16
  const dy = anchor[1] - state.clipboard_payload.anchor[1] + 16
  begin_transaction_editor(state, "paste")
  const ok = insert_elements_with_offset_editor(state, state.clipboard_payload.elements, dx, dy)
  if (!ok) {
    cancel_transaction_editor(state)
    return false
  }
  commit_transaction_editor(state)
  return true
}

export function duplicate_selection_editor(state: editor): boolean {
  return copy_selection_editor(state) ? paste_clipboard_editor(state, state.pointer_world) : false
}

function paste_anchor_editor(state: editor): vector2 {
  if (state.has_pointer_input) {
    return [state.pointer_world[0], state.pointer_world[1]]
  }
  const center_screen: vector2 = [state.engine.viewport[0] / 2, state.engine.viewport[1] / 2]
  const center_world: vector2 = [0, 0]
  screen_to_world_engine(state.engine, center_screen, center_world)
  return center_world
}

export function delete_selection_editor(state: editor): boolean {
  if (state.selected_element_ids.size === 0) return false
  begin_transaction_editor(state, "delete")
  const selected_ids = Array.from(state.selected_element_ids.values())
  let doc = state.engine.document
  for (let i = 0; i < selected_ids.length; i = i + 1) {
    const id = selected_ids[i]
    if (id !== undefined) doc = remove_element_document(doc, id)
  }
  state.engine.document = doc
  state.selected_element_ids.clear()
  commit_transaction_editor(state)
  return true
}

export function undo_action_editor(state: editor): boolean {
  const ok = undo_editor(state)
  if (ok) cleanup_selection_editor(state)
  return ok
}

export function redo_action_editor(state: editor): boolean {
  const ok = redo_editor(state)
  if (ok) cleanup_selection_editor(state)
  return ok
}
