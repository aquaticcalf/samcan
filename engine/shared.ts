import type { camera } from "@/camera/camera"
import type { color } from "@/math/color"
import type { transform } from "@/math/transform"
import type { vector2 } from "@/math/vector2"

export const default_background: color = [1, 1, 1, 1]
export const default_element_fill: color = [0.95, 0.97, 1, 1]
export const default_element_stroke: color = [0.18, 0.22, 0.31, 1]
export const min_zoom_engine = 0.0001
export const max_zoom_engine = 1_000_000
export const scratch_camera: camera = [0, 0, 1, 0]
export const scratch_frustum: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0]
export const scratch_transform: transform = [1, 0, 0, 1, 0, 0]
export const scratch_world: vector2 = [0, 0]
export const scratch_screen: vector2 = [0, 0]
