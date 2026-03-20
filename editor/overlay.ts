import type { editor } from "@/editor/types"
import type { renderer } from "@/renderer/renderer"
import { get_element_by_id_document } from "@/document/document"
import { selection_handles_editor } from "@/editor/hit"
import { marquee_rectangle_editor, selection_bounds_editor } from "@/editor/selection"
import {
  overlay_handle_style,
  overlay_hover_style,
  overlay_marquee_style,
  overlay_selection_style,
} from "@/editor/styles"

export function draw_editor_overlay(state: editor, drawer: renderer): void {
  draw_hover_overlay_editor(state, drawer)
  draw_selection_overlay_editor(state, drawer)
  draw_marquee_overlay_editor(state, drawer)
  draw_guides_overlay_editor(state, drawer)
}

function draw_hover_overlay_editor(state: editor, drawer: renderer): void {
  if (state.hovered_element_id === null || state.selected_element_ids.has(state.hovered_element_id)) {
    return
  }
  const hovered = get_element_by_id_document(state.engine.document, state.hovered_element_id)
  if (hovered !== null) {
    drawer.draw_rectangle(hovered.bounds, overlay_hover_style)
  }
}

function draw_selection_overlay_editor(state: editor, drawer: renderer): void {
  const selected_ids = Array.from(state.selected_element_ids.values())
  const selection_bounds = selection_bounds_editor(state.engine.document, selected_ids)
  if (selection_bounds === null) {
    return
  }
  drawer.draw_rectangle(selection_bounds, overlay_selection_style)
  const handles = selection_handles_editor(selection_bounds)
  for (let i = 0; i < handles.length; i = i + 1) {
    const handle = handles[i]
    if (handle !== undefined) {
      drawer.draw_rectangle(handle.bounds, overlay_handle_style)
    }
  }
}

function draw_marquee_overlay_editor(state: editor, drawer: renderer): void {
  if (state.marquee_state === null) {
    return
  }
  const marquee = marquee_rectangle_editor(
    state.marquee_state.origin_world[0],
    state.marquee_state.origin_world[1],
    state.marquee_state.current_world[0],
    state.marquee_state.current_world[1],
  )
  drawer.draw_rectangle(marquee, overlay_marquee_style)
}

function draw_guides_overlay_editor(state: editor, drawer: renderer): void {
  for (let i = 0; i < state.transient_guides.length; i = i + 1) {
    const guide = state.transient_guides[i]
    if (guide !== undefined) {
      drawer.draw_rectangle(guide, overlay_hover_style)
    }
  }
}

