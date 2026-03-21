import type { document } from "@/document/document"
import type { element } from "@/document/element"
import type { rectangle } from "@/math/rectangle"
import type { vector2 } from "@/math/vector2"
import type { editor, editor_pointer_input, editor_tool, editor_tool_id } from "@/editor/types"
import { get_element_by_id_document } from "@/document/document"
import {
  shape_type_arrow,
  shape_type_ellipse,
  shape_type_frame,
  shape_type_line,
  shape_type_rectangle,
} from "@/document/element"
import { element_hit_at_point_editor } from "@/editor/hittest"
import { screen_to_world_engine } from "@/engine/camera"
import {
  editor_tool_arrow,
  editor_tool_ellipse,
  editor_tool_frame,
  editor_tool_line,
  editor_tool_rectangle,
  editor_tool_select,
} from "@/editor/types"
import { hit_selection_handles_editor, selection_handles_for_elements_editor } from "@/editor/hit"

export function current_tool_impl_editor(state: editor): editor_tool {
  return state.tools.get(state.current_tool) ?? state.tools.get(editor_tool_select)!
}

export function next_id_editor(state: editor, prefix: string): string {
  state.id_counter = state.id_counter + 1
  return `${prefix}_${Date.now()}_${state.id_counter}`
}

export function next_z_index_editor(doc: document): number {
  let max = -1
  for (const item of doc.elements.values()) {
    if (item.z_index > max) {
      max = item.z_index
    }
  }
  return max + 1
}

export function cleanup_selection_editor(state: editor): void {
  const ids = Array.from(state.selected_element_ids.values())
  for (let i = 0; i < ids.length; i = i + 1) {
    const id = ids[i]
    if (id !== undefined && get_element_by_id_document(state.engine.document, id) === null) {
      state.selected_element_ids.delete(id)
    }
  }
}

export function update_pointer_editor(state: editor, input: editor_pointer_input): void {
  state.pointer_screen[0] = input.screen[0]
  state.pointer_screen[1] = input.screen[1]
  state.has_pointer_input = true
  screen_to_world_engine(state.engine, input.screen, state.pointer_world)
}

export function update_hover_editor(state: editor): void {
  const hit = element_hit_at_point_editor(state.engine.document, state.pointer_world[0], state.pointer_world[1])
  state.hovered_element_id = hit?.id ?? null
}

export function update_select_hover_editor(state: editor): void {
  state.transient_guides = []
  const selected_ids = Array.from(state.selected_element_ids.values())
  const handles = selection_handles_for_elements_editor(state.engine.document, selected_ids)
  state.active_handle = hit_selection_handles_editor(handles, state.pointer_world)?.id ?? null
  update_hover_editor(state)
}

export function rectangle_from_points_editor(
  a: vector2,
  b: vector2,
  keep_square: boolean,
): rectangle {
  const x1 = a[0]
  const y1 = a[1]
  let x2 = b[0]
  let y2 = b[1]
  if (keep_square) {
    const dx = x2 - x1
    const dy = y2 - y1
    const size = Math.max(Math.abs(dx), Math.abs(dy))
    x2 = x1 + Math.sign(dx || 1) * size
    y2 = y1 + Math.sign(dy || 1) * size
  }
  return [Math.min(x1, x2), Math.min(y1, y2), Math.max(1, Math.abs(x2 - x1)), Math.max(1, Math.abs(y2 - y1))]
}

export function shape_name_for_tool_editor(tool: editor_tool_id): string {
  if (tool === editor_tool_rectangle) return "rectangle"
  if (tool === editor_tool_ellipse) return "ellipse"
  if (tool === editor_tool_line) return "line"
  if (tool === editor_tool_arrow) return "arrow"
  if (tool === editor_tool_frame) return "frame"
  return "shape"
}

export function shape_type_for_tool_editor(tool: editor_tool_id): number {
  if (tool === editor_tool_rectangle) return shape_type_rectangle
  if (tool === editor_tool_ellipse) return shape_type_ellipse
  if (tool === editor_tool_line) return shape_type_line
  if (tool === editor_tool_arrow) return shape_type_arrow
  return shape_type_frame
}

export function clone_ids_editor(elements: readonly element[]): string[] {
  const ids: string[] = []
  for (let i = 0; i < elements.length; i = i + 1) {
    const item = elements[i]
    if (item !== undefined) {
      ids.push(item.id)
    }
  }
  return ids
}

export function grouped_ids_for_element_editor(doc: document, element_id: string): string[] {
  const element = get_element_by_id_document(doc, element_id)
  if (element === null || element.group_id === null) {
    return element === null ? [] : [element_id]
  }
  const ids: string[] = []
  for (const item of doc.elements.values()) {
    if (item.group_id === element.group_id) ids.push(item.id)
  }
  return ids
}

export function expand_ids_with_groups_editor(doc: document, ids: readonly string[]): string[] {
  const out = new Set<string>()
  for (let i = 0; i < ids.length; i = i + 1) {
    const id = ids[i]
    if (id === undefined) continue
    const group_ids = grouped_ids_for_element_editor(doc, id)
    if (group_ids.length === 0) continue
    for (let j = 0; j < group_ids.length; j = j + 1) {
      const group_id = group_ids[j]
      if (group_id !== undefined) out.add(group_id)
    }
  }
  return Array.from(out)
}
