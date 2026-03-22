import { describe, expect, test } from "bun:test"
import { add_vector2, distance_vector2 } from "@/math/vector2"


describe("math", () => {
  test("vector2 basic operations", () => {
    const out: [number, number] = [0, 0]
    add_vector2([2, 3], [4, -1], out)
    expect(out).toEqual([6, 2])
    expect(distance_vector2([0, 0], [3, 4])).toBe(5)
  })
})
