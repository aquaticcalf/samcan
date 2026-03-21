import type { text_element } from "@/document/element"

export type text_layout_line = {
  text: string
  start: number
  end: number
  width: number
}

export type text_layout = {
  lines: text_layout_line[]
  line_height: number
  padding: number
  max_text_width: number
}

const measure_canvas_editor =
  typeof document !== "undefined" ? document.createElement("canvas") : null
const measure_context_editor = measure_canvas_editor?.getContext("2d") ?? null

export function build_text_layout_editor(
  el: text_element,
  content: string,
): text_layout {
  const font_size = Math.max(1, el.font_size)
  const line_height = font_size * 1.3
  const padding = Math.max(4, Math.round(font_size * 0.35))
  const max_text_width = Math.max(1, el.bounds[2] - padding * 2)

  const lines: text_layout_line[] = []
  const ctx = measure_context_editor
  if (ctx === null) {
    lines.push({ text: content, start: 0, end: content.length, width: content.length * font_size * 0.6 })
    return { lines, line_height, padding, max_text_width }
  }

  ctx.font = `${font_size}px ${el.font_family}`

  const paragraphs = content.split("\n")
  let cursor = 0
  for (let p = 0; p < paragraphs.length; p = p + 1) {
    const paragraph = paragraphs[p] ?? ""
    if (paragraph.length === 0) {
      lines.push({ text: "", start: cursor, end: cursor, width: 0 })
      cursor = cursor + 1
      continue
    }
    let local = 0
    while (local < paragraph.length) {
      const remaining = paragraph.length - local
      let take = remaining
      while (take > 1) {
        const slice = paragraph.slice(local, local + take)
        if (ctx.measureText(slice).width <= max_text_width) break
        take = take - 1
      }
      if (take <= 0) take = 1
      if (take < remaining) {
        const space = paragraph.lastIndexOf(" ", local + take - 1)
        if (space >= local) {
          take = Math.max(1, space - local + 1)
        }
      }
      const text = paragraph.slice(local, local + take).replace(/\s+$/g, "")
      const width = ctx.measureText(text).width
      const start = cursor + local
      const end = start + take
      lines.push({ text, start, end, width })
      local = local + take
    }
    cursor = cursor + paragraph.length + 1
  }

  if (lines.length === 0) {
    lines.push({ text: "", start: 0, end: 0, width: 0 })
  }

  return { lines, line_height, padding, max_text_width }
}

export function line_index_for_caret_editor(layout: text_layout, index: number): number {
  if (layout.lines.length === 0) return 0
  for (let i = 0; i < layout.lines.length; i = i + 1) {
    const line = layout.lines[i]
    if (line === undefined) continue
    if (index >= line.start && index <= line.end) return i
  }
  return Math.max(0, layout.lines.length - 1)
}

export function line_caret_x_editor(
  el: text_element,
  layout: text_layout,
  line_index: number,
  caret_index: number,
): number {
  const line = layout.lines[line_index]
  if (line === undefined) return 0
  const local = Math.max(0, Math.min(line.text.length, caret_index - line.start))
  return measure_text_width_editor(el, line.text.slice(0, local))
}

export function nearest_caret_for_x_editor(
  el: text_element,
  layout: text_layout,
  line_index: number,
  x: number,
): number {
  const line = layout.lines[line_index]
  if (line === undefined) return 0
  let best_index = line.start
  let best_distance = Infinity
  for (let i = 0; i <= line.text.length; i = i + 1) {
    const width = measure_text_width_editor(el, line.text.slice(0, i))
    const distance = Math.abs(width - x)
    if (distance < best_distance) {
      best_distance = distance
      best_index = line.start + i
    }
  }
  return Math.max(line.start, Math.min(line.end, best_index))
}

export function caret_index_from_point_editor(
  el: text_element,
  content: string,
  world_x: number,
  world_y: number,
): number {
  const layout = build_text_layout_editor(el, content)
  const local_x = world_x - el.bounds[0] - layout.padding
  const local_y = world_y - el.bounds[1] - layout.padding
  const line_index = Math.max(
    0,
    Math.min(layout.lines.length - 1, Math.floor(local_y / Math.max(1, layout.line_height))),
  )
  return nearest_caret_for_x_editor(el, layout, line_index, local_x)
}

function measure_text_width_editor(el: text_element, text: string): number {
  const ctx = measure_context_editor
  if (ctx === null) return text.length * Math.max(1, el.font_size) * 0.6
  ctx.font = `${Math.max(1, el.font_size)}px ${el.font_family}`
  return ctx.measureText(text).width
}
