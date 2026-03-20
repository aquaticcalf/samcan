import type { rectangle } from "@/math/rectangle"
import type { vector2 } from "@/math/vector2"
import type { editor } from "@/editor/types"

export type editor_snap_context = "move" | "resize" | "rotate" | "shape" | "text" | "image"

export type editor_snap_result = {
  point: vector2
  guides: rectangle[]
}

export type editor_snapper = (
  state: editor,
  point: vector2,
  context: editor_snap_context,
) => editor_snap_result | null

