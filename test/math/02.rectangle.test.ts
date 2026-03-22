import { describe, expect, test } from "bun:test"
import { intersection_rectangle } from "@/math/rectangle"


describe("math", () => {

  test("rectangle intersection", () => {
    const out: [number, number, number, number] = [0, 0, 0, 0]
    const result = intersection_rectangle([0, 0, 10, 10], [5, 5, 10, 10], out)
    expect(result).not.toBeNull()
    expect(out).toEqual([5, 5, 5, 5])
  })

})
