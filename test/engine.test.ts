import { describe, expect, test } from "bun:test"
import { sanitize_number_engine, sanitize_zoom_engine, visible_bounds_world_engine } from "../engine/camera"

describe("engine", () => {
  test("sanitize helpers", () => {
    expect(sanitize_number_engine(Number.NaN, 5)).toBe(5)
    expect(sanitize_number_engine(Number.NaN, Number.NaN)).toBe(0)
    expect(sanitize_zoom_engine(-1, 2)).toBeGreaterThan(0)
    expect(sanitize_zoom_engine(Number.POSITIVE_INFINITY, 2)).toBeGreaterThan(0)
  })

  test("visible bounds from minimal engine-like state", () => {
    const state = {
      camera: [50, 40, 2, 0] as [number, number, number, number],
      viewport: [200, 100, 1] as [number, number, number],
    }
    const bounds = visible_bounds_world_engine(state as never)
    expect(bounds[0]).toBeCloseTo(0, 6)
    expect(bounds[1]).toBeCloseTo(15, 6)
    expect(bounds[2]).toBeCloseTo(100, 6)
    expect(bounds[3]).toBeCloseTo(50, 6)
  })
})
