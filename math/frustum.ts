import type { rectangle } from "@/math/rectangle"
import type { vector2 } from "@/math/vector2"

export type frustum = [number, number, number, number, number, number]

export function create_frustum(
  left: number,
  right: number,
  top: number,
  bottom: number,
  near: number,
  far: number,
): frustum {
  return [left, right, top, bottom, near, far]
}

export function create_frustum_from_bounds(
  min_x: number,
  max_x: number,
  min_y: number,
  max_y: number,
  out: frustum,
): frustum {
  out[0] = min_x
  out[1] = max_x
  out[2] = max_y
  out[3] = min_y
  out[4] = 0
  out[5] = Number.MAX_VALUE
  return out
}

export function create_frustum_from_rectangle(view_bounds: rectangle, out: frustum): frustum {
  out[0] = view_bounds[0]
  out[1] = view_bounds[0] + view_bounds[2]
  out[2] = view_bounds[1] + view_bounds[3]
  out[3] = view_bounds[1]
  out[4] = 0
  out[5] = Number.MAX_VALUE
  return out
}

export function left_of_frustum(f: frustum): number {
  return f[0]
}

export function right_of_frustum(f: frustum): number {
  return f[1]
}

export function top_of_frustum(f: frustum): number {
  return f[2]
}

export function bottom_of_frustum(f: frustum): number {
  return f[3]
}

export function near_of_frustum(f: frustum): number {
  return f[4]
}

export function far_of_frustum(f: frustum): number {
  return f[5]
}

export function width_of_frustum(f: frustum): number {
  return f[1] - f[0]
}

export function height_of_frustum(f: frustum): number {
  return f[2] - f[3]
}

export function set_frustum_bounds(
  left: number,
  right: number,
  top: number,
  bottom: number,
  near: number,
  far: number,
  out: frustum,
): frustum {
  out[0] = left
  out[1] = right
  out[2] = top
  out[3] = bottom
  out[4] = near
  out[5] = far
  return out
}

export function clone_frustum(f: frustum): frustum {
  return [f[0], f[1], f[2], f[3], f[4], f[5]]
}

export function copy_frustum(f: frustum, out: frustum): frustum {
  out[0] = f[0]
  out[1] = f[1]
  out[2] = f[2]
  out[3] = f[3]
  out[4] = f[4]
  out[5] = f[5]
  return out
}

export function create_frustum_from_camera(
  camera_x: number,
  camera_y: number,
  viewport_width: number,
  viewport_height: number,
  zoom: number,
  out: frustum,
): frustum {
  if (zoom <= 0) {
    zoom = 0.0001
  }

  const half_width = viewport_width / (2 * zoom)
  const half_height = viewport_height / (2 * zoom)

  out[0] = camera_x - half_width
  out[1] = camera_x + half_width
  out[2] = camera_y + half_height
  out[3] = camera_y - half_height
  out[4] = 0
  out[5] = Number.MAX_VALUE
  return out
}

export function create_frustum_from_view_matrix(
  camera_position: vector2,
  viewport_size: vector2,
  zoom: number,
  out: frustum,
): frustum {
  return create_frustum_from_camera(
    camera_position[0],
    camera_position[1],
    viewport_size[0],
    viewport_size[1],
    zoom,
    out,
  )
}

export function expand_frustum(f: frustum, margin: number, out: frustum): frustum {
  out[0] = f[0] - margin
  out[1] = f[1] + margin
  out[2] = f[2] + margin
  out[3] = f[3] - margin
  out[4] = f[4]
  out[5] = f[5]
  return out
}

export function intersects_frustum_rectangle(f: frustum, r: rectangle): boolean {
  const rect_left = r[0]
  const rect_right = r[0] + r[2]
  const rect_top = r[1] + r[3]
  const rect_bottom = r[1]

  return !(rect_right < f[0] || rect_left > f[1] || rect_bottom > f[2] || rect_top < f[3])
}

export function contains_rectangle_frustum(f: frustum, r: rectangle): boolean {
  const rect_left = r[0]
  const rect_right = r[0] + r[2]
  const rect_top = r[1] + r[3]
  const rect_bottom = r[1]

  return rect_left >= f[0] && rect_right <= f[1] && rect_bottom >= f[3] && rect_top <= f[2]
}

export function contains_point_frustum(f: frustum, x: number, y: number): boolean {
  return x >= f[0] && x <= f[1] && y >= f[3] && y <= f[2]
}

export function cull_rectangle_frustum(f: frustum, r: rectangle): boolean {
  return !intersects_frustum_rectangle(f, r)
}

export function cull_rectangles_frustum(f: frustum, rectangles: rectangle[]): rectangle[] {
  const visible_rectangles: rectangle[] = []

  for (let i = 0; i < rectangles.length; i = i + 1) {
    const rect = rectangles[i]
    if (rect && !cull_rectangle_frustum(f, rect)) {
      visible_rectangles.push(rect)
    }
  }

  return visible_rectangles
}

export function filter_visible_rectangles_frustum(
  f: frustum,
  rectangles: rectangle[],
  out_visible: rectangle[],
): rectangle[] {
  out_visible.length = 0

  for (let i = 0; i < rectangles.length; i = i + 1) {
    const rect = rectangles[i]
    if (rect && !cull_rectangle_frustum(f, rect)) {
      out_visible.push(rect)
    }
  }

  return out_visible
}

export function count_visible_rectangles_frustum(f: frustum, rectangles: rectangle[]): number {
  let visible_count = 0

  for (let i = 0; i < rectangles.length; i = i + 1) {
    const rect = rectangles[i]
    if (rect && !cull_rectangle_frustum(f, rect)) {
      visible_count = visible_count + 1
    }
  }

  return visible_count
}

export function is_empty_frustum(f: frustum): boolean {
  return f[1] <= f[0] || f[2] <= f[3]
}

export function equals_frustum(f1: frustum, f2: frustum): boolean {
  return (
    f1[0] === f2[0] &&
    f1[1] === f2[1] &&
    f1[2] === f2[2] &&
    f1[3] === f2[3] &&
    f1[4] === f2[4] &&
    f1[5] === f2[5]
  )
}

export function area_of_frustum(f: frustum): number {
  return width_of_frustum(f) * height_of_frustum(f)
}

export function center_of_frustum(f: frustum, out: vector2): vector2 {
  out[0] = (f[0] + f[1]) / 2
  out[1] = (f[3] + f[2]) / 2
  return out
}

export function translate_frustum(f: frustum, dx: number, dy: number, out: frustum): frustum {
  out[0] = f[0] + dx
  out[1] = f[1] + dx
  out[2] = f[2] + dy
  out[3] = f[3] + dy
  out[4] = f[4]
  out[5] = f[5]
  return out
}

export function intersection_frustum_rectangle(
  f: frustum,
  r: rectangle,
  out: rectangle,
): rectangle | null {
  const left = Math.max(f[0], r[0])
  const right = Math.min(f[1], r[0] + r[2])
  const bottom = Math.max(f[3], r[1])
  const top = Math.min(f[2], r[1] + r[3])

  if (left >= right || bottom >= top) {
    return null
  }

  out[0] = left
  out[1] = bottom
  out[2] = right - left
  out[3] = top - bottom
  return out
}
