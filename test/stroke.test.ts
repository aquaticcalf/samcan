import { describe, expect, test } from "bun:test"
import { create_live_stroke, add_raw_point_live_stroke, finalize_live_stroke } from "@/stroke/live"
import { create_stroke_style } from "@/stroke/stroke"
import { compute_stroke_bounds, get_simplified_for_lod } from "@/stroke/process"
import { create_spline } from "@/math/spline"

describe("stroke", () => {
  test("live stroke add/finalize", () => {
    const style = create_stroke_style([0, 0, 0, 1], 2)
    let live = create_live_stroke(style, "s1")
    live = add_raw_point_live_stroke(live, [0, 0], 0.4, 1)
    live = add_raw_point_live_stroke(live, [10, 0], 0.6, 2)
    const finalized = finalize_live_stroke(live, 1, "layer_1")
    expect(finalized.id).toBe("s1")
    expect(finalized.points.length).toBe(2)
    expect(finalized.pressure?.length).toBe(2)
  })

  test("stroke processing helpers", () => {
    const bounds: [number, number, number, number] = [0, 0, 0, 0]
    compute_stroke_bounds(
      [
        [0, 0],
        [10, 10],
        [20, 10],
      ],
      2,
      bounds,
    )
    expect(bounds[2]).toBeGreaterThan(0)
    const simplified = get_simplified_for_lod(
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
      ],
      1,
      [],
    )
    expect(simplified.length).toBeGreaterThan(1)
    expect(create_spline().point_count).toBe(0)
  })
})
