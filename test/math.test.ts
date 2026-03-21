import { describe, expect, test } from "bun:test"
import { add_vector2, distance_vector2 } from "../math/vector2"
import { intersection_rectangle } from "../math/rectangle"
import { create_transform, invert_transform, transform_point_transform } from "../math/transform"

describe("math", () => {
  test("vector2 basic operations", () => {
    const out: [number, number] = [0, 0]
    add_vector2([2, 3], [4, -1], out)
    expect(out).toEqual([6, 2])
    expect(distance_vector2([0, 0], [3, 4])).toBe(5)
  })

  test("rectangle intersection", () => {
    const out: [number, number, number, number] = [0, 0, 0, 0]
    const result = intersection_rectangle([0, 0, 10, 10], [5, 5, 10, 10], out)
    expect(result).not.toBeNull()
    expect(out).toEqual([5, 5, 5, 5])
  })

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
