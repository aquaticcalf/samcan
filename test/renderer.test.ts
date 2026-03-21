import { describe, expect, test } from "bun:test"
import { create_draw_style, equals_draw_style, with_alpha_draw_style } from "../renderer/style"
import {
  command_count_of_path,
  from_circle_path,
  from_rectangle_path,
  hash_of_path,
  is_empty_path,
} from "../renderer/path"

describe("renderer utils", () => {
  test("draw style helpers", () => {
    const base = create_draw_style()
    const out = create_draw_style()
    with_alpha_draw_style(base, 0.5, out)
    expect(out.alpha).toBe(0.5)
    expect(equals_draw_style(base, out)).toBeFalse()
  })

  test("path builders produce stable command sets", () => {
    const rect = from_rectangle_path([0, 0, 20, 10])
    expect(is_empty_path(rect)).toBeFalse()
    expect(command_count_of_path(rect)).toBe(5)
    const circle = from_circle_path([0, 0, 10], 8)
    expect(command_count_of_path(circle)).toBeGreaterThan(0)
    expect(hash_of_path(circle)).toBeTypeOf("number")
  })
})
