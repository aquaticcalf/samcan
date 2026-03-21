import { describe, expect, test } from "bun:test"
import * as samcan from "@/index"

describe("root exports", () => {
  test("exposes representative APIs from major modules", () => {
    expect(typeof samcan.create_camera).toBe("function")
    expect(typeof samcan.create_document).toBe("function")
    expect(typeof samcan.create_image_asset).toBe("function")
    expect(typeof samcan.create_path).toBe("function")
    expect(typeof samcan.create_editor).toBe("function")
    expect(typeof samcan.create_spatial_index).toBe("function")
    expect(typeof samcan.create_stroke_style).toBe("function")
  })
})
