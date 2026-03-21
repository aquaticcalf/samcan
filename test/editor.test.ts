import { describe, expect, test } from "bun:test"
import { contains_ellipse_editor, distance_point_to_segment_editor } from "../editor/hitmath"
import { build_text_layout_editor, caret_index_from_point_editor } from "../editor/textlayout"
import { create_text_element, text_align_left } from "../document/element"

describe("editor", () => {
  test("hit math primitives", () => {
    expect(distance_point_to_segment_editor(5, 5, 0, 0, 10, 0)).toBeCloseTo(5, 6)
    expect(contains_ellipse_editor([0, 0, 100, 50], 50, 25, 0)).toBeTrue()
    expect(contains_ellipse_editor([0, 0, 100, 50], 120, 25, 0)).toBeFalse()
  })

  test("text layout builds wrapped lines and caret index", () => {
    const el = create_text_element(
      "t1",
      [10, 10, 80, 60],
      0,
      "layer_1",
      "hello world from bun",
      "sans-serif",
      16,
      [0, 0, 0, 1],
      text_align_left,
    )
    const layout = build_text_layout_editor(el, el.content)
    expect(layout.lines.length).toBeGreaterThan(0)
    const caret = caret_index_from_point_editor(el, el.content, 12, 12)
    expect(caret).toBeGreaterThanOrEqual(0)
    expect(caret).toBeLessThanOrEqual(el.content.length)
  })
})
