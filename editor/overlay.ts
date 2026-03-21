import type { editor } from "@/editor/types"
import type { renderer } from "@/renderer/renderer"
import type { text_element } from "@/document/element"
import { get_element_by_id_document } from "@/document/document"
import { element_type_text, text_align_center, text_align_right } from "@/document/element"
import { selection_handles_for_elements_editor } from "@/editor/hit"
import { marquee_rectangle_editor, selection_bounds_editor } from "@/editor/selection"
import { build_text_layout_editor, line_index_for_caret_editor } from "@/editor/textlayout"
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
  draw_text_edit_overlay_editor(state, drawer)
}

function draw_hover_overlay_editor(state: editor, drawer: renderer): void {
  if (
    state.hovered_element_id === null ||
    state.selected_element_ids.has(state.hovered_element_id)
  ) {
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
  const handles = selection_handles_for_elements_editor(state.engine.document, selected_ids)
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

function draw_text_edit_overlay_editor(state: editor, drawer: renderer): void {
  if (state.text_edit === null) {
    return
  }
  const element = get_element_by_id_document(state.engine.document, state.text_edit.element_id)
  if (element === null || element.type !== element_type_text) return

  const draft = state.text_edit.draft
  const layout = build_text_layout_editor(element, draft)
  const anchor = state.text_edit.anchor
  const caret = state.text_edit.caret
  if (anchor !== null && anchor !== caret) {
    const start = Math.min(anchor, caret)
    const end = Math.max(anchor, caret)
    draw_text_selection_editor(drawer, element, layout, start, end)
  }
  draw_text_caret_editor(drawer, element, layout, caret)
  drawer.draw_rectangle(element.bounds, overlay_handle_style)
}

function draw_text_selection_editor(
  drawer: renderer,
  element: text_element,
  layout: ReturnType<typeof build_text_layout_editor>,
  start: number,
  end: number,
): void {
  for (let i = 0; i < layout.lines.length; i = i + 1) {
    const line = layout.lines[i]
    if (line === undefined) continue
    if (end <= line.start || start >= line.end) continue
    const local_start = Math.max(0, start - line.start)
    const local_end = Math.max(local_start, Math.min(line.text.length, end - line.start))
    const x0 =
      line_x_offset_editor(element, layout, line.width) +
      measure_line_prefix_width_editor(line.text, local_start, element)
    const x1 =
      line_x_offset_editor(element, layout, line.width) +
      measure_line_prefix_width_editor(line.text, local_end, element)
    const y = element.bounds[1] + layout.padding + i * layout.line_height
    drawer.draw_rectangle([x0, y, Math.max(1, x1 - x0), layout.line_height], overlay_marquee_style)
  }
}

function draw_text_caret_editor(
  drawer: renderer,
  element: text_element,
  layout: ReturnType<typeof build_text_layout_editor>,
  caret: number,
): void {
  const line_index = line_index_for_caret_editor(layout, caret)
  const line = layout.lines[line_index]
  if (line === undefined) return
  const local = Math.max(0, Math.min(line.text.length, caret - line.start))
  const x =
    line_x_offset_editor(element, layout, line.width) +
    measure_line_prefix_width_editor(line.text, local, element)
  const y = element.bounds[1] + layout.padding + line_index * layout.line_height
  drawer.draw_rectangle([x, y, 1.5, layout.line_height], text_caret_style_editor)
}

function line_x_offset_editor(
  element: text_element,
  layout: ReturnType<typeof build_text_layout_editor>,
  line_width: number,
): number {
  if (element.align === text_align_center) {
    return element.bounds[0] + element.bounds[2] * 0.5 - line_width * 0.5
  }
  if (element.align === text_align_right) {
    return element.bounds[0] + element.bounds[2] - layout.padding - line_width
  }
  return element.bounds[0] + layout.padding
}

function measure_line_prefix_width_editor(
  text: string,
  length: number,
  element: text_element,
): number {
  const ctx = selection_measure_context_editor
  if (ctx === null) return Math.max(0, length) * 8
  const size = Math.max(1, element.font_size)
  const family = element.font_family
  ctx.font = `${size}px ${family}`
  return ctx.measureText(text.slice(0, Math.max(0, length))).width
}

const selection_measure_canvas_editor =
  typeof document !== "undefined" ? document.createElement("canvas") : null
const selection_measure_context_editor = selection_measure_canvas_editor?.getContext("2d") ?? null

const text_caret_style_editor = {
  fill: [0.2, 0.5, 1, 0.95] as [number, number, number, number],
  stroke: null,
  stroke_width: 0,
  line_cap: 1,
  line_join: 1,
  miter_limit: 10,
  alpha: 1,
}
