import { describe, expect, test } from "bun:test"
import {
  create_spatial_index,
  create_spatial_index_config,
  insert_spatial_index,
  query_point_spatial_index,
  query_range_spatial_index,
  remove_spatial_index,
} from "../spatial/index"

describe("spatial", () => {
  test("insert/query/remove flow", () => {
    const config = create_spatial_index_config([0, 0, 500, 500])
    let index = create_spatial_index(config)
    index = insert_spatial_index(index, "a", [10, 10, 20, 20])
    index = insert_spatial_index(index, "b", [100, 100, 10, 10])

    const point_hits: Array<{ id: string; bounds: [number, number, number, number] }> = []
    query_point_spatial_index(index, 20, 20, point_hits)
    expect(point_hits.map((x) => x.id)).toContain("a")

    const range_hits: Array<{ id: string; bounds: [number, number, number, number] }> = []
    query_range_spatial_index(index, [0, 0, 50, 50], range_hits)
    expect(range_hits.length).toBe(1)

    index = remove_spatial_index(index, "a")
    point_hits.length = 0
    query_point_spatial_index(index, 20, 20, point_hits)
    expect(point_hits.length).toBe(0)
  })
})
