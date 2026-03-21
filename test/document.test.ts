import { describe, expect, test } from "bun:test"
import {
  add_element_document,
  add_image_asset_document,
  add_layer_document,
  create_document,
  get_image_asset_document,
  remove_image_asset_document,
} from "@/document/document"
import { create_shape_element, shape_type_rectangle } from "@/document/element"
import { create_layer } from "@/document/layer"
import { element_at_point_document, elements_in_bounds_document } from "@/document/query"
import { create_image_asset } from "@/document/asset"

describe("document", () => {
  test("add/query element", () => {
    let doc = create_document("doc", "layer_1")
    doc = add_layer_document(doc, create_layer("layer_1", "Main"))
    doc = add_element_document(
      doc,
      create_shape_element(
        "rect_1",
        [10, 20, 40, 30],
        0,
        "layer_1",
        shape_type_rectangle,
        null,
        [0, 0, 0, 1],
        1,
        null,
        null,
      ),
    )
    const hit = element_at_point_document(doc, 20, 25)
    expect(hit?.id).toBe("rect_1")
    expect(elements_in_bounds_document(doc, [0, 0, 100, 100]).length).toBe(1)
  })

  test("image assets registry lifecycle", () => {
    let doc = create_document("doc", "layer_1")
    const asset = create_image_asset("asset_1", "https://example.com/a.png", 320, 240)
    doc = add_image_asset_document(doc, asset)
    expect(get_image_asset_document(doc, "asset_1")?.src).toBe(asset.src)
    doc = remove_image_asset_document(doc, "asset_1")
    expect(get_image_asset_document(doc, "asset_1")).toBeNull()
  })
})
