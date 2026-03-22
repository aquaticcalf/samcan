import { describe, expect, test } from "bun:test"
import { create_transform, invert_transform, transform_point_transform } from "@/math/transform"

describe("math", () => {
  test("transform invert roundtrip", () => {
    const t = create_transform(2, 0, 0, 2, 10, -4)
    const inv: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0]
    const ok = invert_transform(t, inv)
    expect(ok).not.toBeNull()
    const world: [number, number] = [7, 11]
    const screen: [number, number] = [0, 0]
    const back: [number, number] = [0, 0]
    transform_point_transform(t, world, screen)
    transform_point_transform(inv, screen, back)
    expect(back[0]).toBeCloseTo(world[0], 6)
    expect(back[1]).toBeCloseTo(world[1], 6)
  })
})
