import type { rectangle } from "@/math/rectangle"
import { create_rectangle, contains_point_rectangle, intersects_rectangle } from "@/math/rectangle"

export type quadtree_point = [number, number, unknown]

export type quadtree_node = {
  readonly boundary: rectangle
  readonly points: readonly quadtree_point[]
  readonly children: readonly quadtree_node[] | null
  readonly capacity: number
  readonly depth: number
}

export type quadtree = {
  readonly root: quadtree_node
  readonly capacity: number
  readonly max_depth: number
}

export function create_quadtree_point(x: number, y: number, data: unknown = null): quadtree_point {
  return [x, y, data]
}

export function x_of_quadtree_point(point: quadtree_point): number {
  return point[0]
}

export function y_of_quadtree_point(point: quadtree_point): number {
  return point[1]
}

export function data_of_quadtree_point(point: quadtree_point): unknown {
  return point[2]
}

export function create_quadtree_node(
  boundary: rectangle,
  capacity: number = 4,
  depth: number = 0,
): quadtree_node {
  return {
    boundary: [boundary[0], boundary[1], boundary[2], boundary[3]],
    points: [] as readonly quadtree_point[],
    children: null,
    capacity: Math.max(1, capacity),
    depth: Math.max(0, depth),
  }
}

export function create_quadtree(
  boundary: rectangle,
  capacity: number = 4,
  max_depth: number = 8,
): quadtree {
  const normalized_capacity = Math.max(1, capacity)
  const normalized_max_depth = Math.max(1, max_depth)

  return {
    root: create_quadtree_node(boundary, normalized_capacity, 0),
    capacity: normalized_capacity,
    max_depth: normalized_max_depth,
  }
}

export function is_leaf_quadtree_node(node: quadtree_node): boolean {
  return node.children === null
}

export function point_count_quadtree_node(node: quadtree_node): number {
  if (is_leaf_quadtree_node(node)) {
    return node.points.length
  }

  let total = 0
  if (node.children !== null) {
    for (let i = 0; i < 4; i = i + 1) {
      const child = node.children[i]
      if (child) {
        total = total + point_count_quadtree_node(child)
      }
    }
  }
  return total
}

export function subdivide_quadtree_node(node: quadtree_node, max_depth: number): quadtree_node {
  if (node.children !== null) {
    return node
  }

  const boundary = node.boundary
  const half_width = boundary[2] / 2
  const half_height = boundary[3] / 2
  const x = boundary[0]
  const y = boundary[1]
  const next_depth = node.depth + 1

  const new_children: quadtree_node[] = [
    create_quadtree_node(
      create_rectangle(x, y, half_width, half_height),
      node.capacity,
      next_depth,
    ),
    create_quadtree_node(
      create_rectangle(x + half_width, y, half_width, half_height),
      node.capacity,
      next_depth,
    ),
    create_quadtree_node(
      create_rectangle(x, y + half_height, half_width, half_height),
      node.capacity,
      next_depth,
    ),
    create_quadtree_node(
      create_rectangle(x + half_width, y + half_height, half_width, half_height),
      node.capacity,
      next_depth,
    ),
  ]

  let updated_children = [...new_children]

  for (let i = 0; i < node.points.length; i = i + 1) {
    const point = node.points[i]
    if (point) {
      for (let j = 0; j < 4; j = j + 1) {
        const child = updated_children[j]
        if (child) {
          const child_result = insert_quadtree_node(child, point, max_depth)
          if (child_result !== null) {
            updated_children[j] = child_result
            break
          }
        }
      }
    }
  }

  return {
    boundary: node.boundary,
    points: [],
    children: updated_children,
    capacity: node.capacity,
    depth: node.depth,
  }
}

export function insert_quadtree_node(
  node: quadtree_node,
  point: quadtree_point,
  max_depth: number,
): quadtree_node | null {
  if (!contains_point_rectangle(node.boundary, point[0], point[1])) {
    return null
  }

  if (is_leaf_quadtree_node(node)) {
    if (node.points.length < node.capacity || node.depth >= max_depth) {
      const new_points = [...node.points, [point[0], point[1], point[2]] as quadtree_point]
      return {
        boundary: node.boundary,
        points: new_points,
        children: null,
        capacity: node.capacity,
        depth: node.depth,
      }
    }

    const subdivided = subdivide_quadtree_node(node, max_depth)
    return insert_quadtree_node(subdivided, point, max_depth)
  }

  if (node.children !== null && node.children.length === 4) {
    const new_children = [...node.children]

    for (let i = 0; i < 4; i = i + 1) {
      const child = node.children[i]
      if (child) {
        const child_result = insert_quadtree_node(child, point, max_depth)
        if (child_result !== null) {
          new_children[i] = child_result
          return {
            boundary: node.boundary,
            points: node.points,
            children: new_children,
            capacity: node.capacity,
            depth: node.depth,
          }
        }
      }
    }
  }

  return null
}

export function insert_quadtree(tree: quadtree, point: quadtree_point): quadtree {
  const new_root = insert_quadtree_node(tree.root, point, tree.max_depth)

  if (new_root !== null) {
    return {
      root: new_root,
      capacity: tree.capacity,
      max_depth: tree.max_depth,
    }
  }

  return tree
}

export function query_range_quadtree_node(
  node: quadtree_node,
  range: rectangle,
  out_results: quadtree_point[],
): quadtree_point[] {
  if (!intersects_rectangle(node.boundary, range)) {
    return out_results
  }

  if (is_leaf_quadtree_node(node)) {
    for (let i = 0; i < node.points.length; i = i + 1) {
      const point = node.points[i]
      if (point && contains_point_rectangle(range, point[0], point[1])) {
        out_results.push([point[0], point[1], point[2]])
      }
    }
    return out_results
  }

  if (node.children !== null && node.children.length === 4) {
    for (let i = 0; i < 4; i = i + 1) {
      const child = node.children[i]
      if (child) {
        query_range_quadtree_node(child, range, out_results)
      }
    }
  }

  return out_results
}

export function query_range_quadtree(
  tree: quadtree,
  range: rectangle,
  out_results: quadtree_point[],
): quadtree_point[] {
  return query_range_quadtree_node(tree.root, range, out_results)
}

export function query_radius_quadtree_node(
  node: quadtree_node,
  center_x: number,
  center_y: number,
  radius: number,
  out_results: quadtree_point[],
): quadtree_point[] {
  const radius_squared = radius * radius
  const query_bounds = create_rectangle(
    center_x - radius,
    center_y - radius,
    radius * 2,
    radius * 2,
  )

  const candidates: quadtree_point[] = []
  query_range_quadtree_node(node, query_bounds, candidates)

  for (let i = 0; i < candidates.length; i = i + 1) {
    const point = candidates[i]
    if (point) {
      const dx = point[0] - center_x
      const dy = point[1] - center_y
      const distance_squared = dx * dx + dy * dy

      if (distance_squared <= radius_squared) {
        out_results.push([point[0], point[1], point[2]])
      }
    }
  }

  return out_results
}

export function query_radius_quadtree(
  tree: quadtree,
  center_x: number,
  center_y: number,
  radius: number,
  out_results: quadtree_point[],
): quadtree_point[] {
  return query_radius_quadtree_node(tree.root, center_x, center_y, radius, out_results)
}

export function find_nearest_quadtree(
  tree: quadtree,
  x: number,
  y: number,
  max_distance: number = Number.POSITIVE_INFINITY,
): quadtree_point | null {
  return find_nearest_quadtree_node(tree.root, x, y, max_distance)
}

export function find_nearest_quadtree_node(
  node: quadtree_node,
  x: number,
  y: number,
  max_distance: number = Number.POSITIVE_INFINITY,
): quadtree_point | null {
  let best_point: quadtree_point | null = null
  let best_distance_squared = max_distance * max_distance

  function search_node_recursive(search_node: quadtree_node): void {
    if (is_leaf_quadtree_node(search_node)) {
      for (let i = 0; i < search_node.points.length; i = i + 1) {
        const point = search_node.points[i]
        if (point) {
          const dx = point[0] - x
          const dy = point[1] - y
          const distance_squared = dx * dx + dy * dy

          if (distance_squared < best_distance_squared) {
            best_distance_squared = distance_squared
            best_point = [point[0], point[1], point[2]]
          }
        }
      }
    } else if (search_node.children !== null && search_node.children.length === 4) {
      const child_distances: { node: quadtree_node; distance: number }[] = []

      for (let i = 0; i < 4; i = i + 1) {
        const child = search_node.children[i]
        if (child) {
          const boundary = child.boundary
          const closest_x = Math.max(boundary[0], Math.min(x, boundary[0] + boundary[2]))
          const closest_y = Math.max(boundary[1], Math.min(y, boundary[1] + boundary[3]))
          const dx = x - closest_x
          const dy = y - closest_y
          const distance = dx * dx + dy * dy

          if (distance < best_distance_squared) {
            child_distances.push({ node: child, distance: distance })
          }
        }
      }

      child_distances.sort((a, b) => a.distance - b.distance)

      for (let i = 0; i < child_distances.length; i = i + 1) {
        const child_info = child_distances[i]
        if (child_info && child_info.distance < best_distance_squared) {
          search_node_recursive(child_info.node)
        }
      }
    }
  }

  search_node_recursive(node)
  return best_point
}

export function remove_quadtree_node(node: quadtree_node, point: quadtree_point): quadtree_node {
  if (!contains_point_rectangle(node.boundary, point[0], point[1])) {
    return node
  }

  if (is_leaf_quadtree_node(node)) {
    const new_points: quadtree_point[] = []
    let removed = false

    for (let i = 0; i < node.points.length; i = i + 1) {
      const existing = node.points[i]
      if (existing && existing[0] === point[0] && existing[1] === point[1] && !removed) {
        removed = true
      } else if (existing) {
        new_points.push([existing[0], existing[1], existing[2]])
      }
    }

    return {
      boundary: node.boundary,
      points: new_points,
      children: null,
      capacity: node.capacity,
      depth: node.depth,
    }
  }

  if (node.children !== null && node.children.length === 4) {
    const new_children = [...node.children]
    let changed = false

    for (let i = 0; i < 4; i = i + 1) {
      const child = node.children[i]
      if (child) {
        const new_child = remove_quadtree_node(child, point)
        if (new_child !== child) {
          new_children[i] = new_child
          changed = true
        }
      }
    }

    if (changed) {
      let total_points = 0
      for (let i = 0; i < 4; i = i + 1) {
        const child = new_children[i]
        if (child) {
          total_points = total_points + point_count_quadtree_node(child)
        }
      }

      if (total_points <= node.capacity) {
        const all_points: quadtree_point[] = []
        collect_all_points_quadtree_node({ ...node, children: new_children }, all_points)

        return {
          boundary: node.boundary,
          points: all_points,
          children: null,
          capacity: node.capacity,
          depth: node.depth,
        }
      }

      return {
        boundary: node.boundary,
        points: node.points,
        children: new_children,
        capacity: node.capacity,
        depth: node.depth,
      }
    }
  }

  return node
}

export function remove_quadtree(tree: quadtree, point: quadtree_point): quadtree {
  const new_root = remove_quadtree_node(tree.root, point)

  return {
    root: new_root,
    capacity: tree.capacity,
    max_depth: tree.max_depth,
  }
}

export function collect_all_points_quadtree_node(
  node: quadtree_node,
  out_points: quadtree_point[],
): quadtree_point[] {
  if (is_leaf_quadtree_node(node)) {
    for (let i = 0; i < node.points.length; i = i + 1) {
      const point = node.points[i]
      if (point) {
        out_points.push([point[0], point[1], point[2]])
      }
    }
  } else if (node.children !== null && node.children.length === 4) {
    for (let i = 0; i < 4; i = i + 1) {
      const child = node.children[i]
      if (child) {
        collect_all_points_quadtree_node(child, out_points)
      }
    }
  }
  return out_points
}

export function clear_quadtree(tree: quadtree): quadtree {
  return {
    root: create_quadtree_node(tree.root.boundary, tree.capacity, 0),
    capacity: tree.capacity,
    max_depth: tree.max_depth,
  }
}

export function point_count_quadtree(tree: quadtree): number {
  return point_count_quadtree_node(tree.root)
}

export function depth_of_quadtree_node(node: quadtree_node): number {
  if (is_leaf_quadtree_node(node)) {
    return node.depth
  }

  let max_depth = node.depth
  if (node.children !== null && node.children.length === 4) {
    for (let i = 0; i < 4; i = i + 1) {
      const child = node.children[i]
      if (child) {
        const child_depth = depth_of_quadtree_node(child)
        if (child_depth > max_depth) {
          max_depth = child_depth
        }
      }
    }
  }
  return max_depth
}

export function depth_of_quadtree(tree: quadtree): number {
  return depth_of_quadtree_node(tree.root)
}

export function is_empty_quadtree(tree: quadtree): boolean {
  return point_count_quadtree(tree) === 0
}

export function bounds_of_quadtree(tree: quadtree, out_bounds: rectangle): rectangle {
  out_bounds[0] = tree.root.boundary[0]
  out_bounds[1] = tree.root.boundary[1]
  out_bounds[2] = tree.root.boundary[2]
  out_bounds[3] = tree.root.boundary[3]
  return out_bounds
}

export function find_k_nearest_quadtree(
  tree: quadtree,
  x: number,
  y: number,
  k: number,
  max_distance: number,
  out_results: quadtree_point[],
): quadtree_point[] {
  if (point_count_quadtree(tree) <= k * 2) {
    const all_points: quadtree_point[] = []
    collect_all_points_quadtree_node(tree.root, all_points)

    const distances: { point: quadtree_point; distance: number }[] = []

    for (let i = 0; i < all_points.length; i = i + 1) {
      const point = all_points[i]
      if (point) {
        const dx = point[0] - x
        const dy = point[1] - y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance <= max_distance) {
          distances.push({ point: point, distance: distance })
        }
      }
    }

    distances.sort((a, b) => a.distance - b.distance)
    const limit = Math.min(k, distances.length)

    for (let i = 0; i < limit; i = i + 1) {
      const item = distances[i]
      if (item && item.point) {
        out_results.push([item.point[0], item.point[1], item.point[2]])
      }
    }

    return out_results
  }

  let current_radius = 100
  const bounds: rectangle = [0, 0, 0, 0]
  bounds_of_quadtree(tree, bounds)
  const max_possible_radius = Math.sqrt(bounds[2] * bounds[2] + bounds[3] * bounds[3])

  while (current_radius <= max_possible_radius) {
    const candidates: quadtree_point[] = []
    query_radius_quadtree(tree, x, y, Math.min(current_radius, max_distance), candidates)

    if (candidates.length >= k) {
      const distances: { point: quadtree_point; distance: number }[] = []

      for (let i = 0; i < candidates.length; i = i + 1) {
        const point = candidates[i]
        if (point) {
          const dx = point[0] - x
          const dy = point[1] - y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance <= max_distance) {
            distances.push({ point: point, distance: distance })
          }
        }
      }

      distances.sort((a, b) => a.distance - b.distance)
      const limit = Math.min(k, distances.length)

      for (let i = 0; i < limit; i = i + 1) {
        const item = distances[i]
        if (item && item.point) {
          out_results.push([item.point[0], item.point[1], item.point[2]])
        }
      }

      return out_results
    }

    current_radius = current_radius * 2
  }

  const final_candidates: quadtree_point[] = []
  query_radius_quadtree(tree, x, y, max_distance, final_candidates)

  const distances: { point: quadtree_point; distance: number }[] = []

  for (let i = 0; i < final_candidates.length; i = i + 1) {
    const point = final_candidates[i]
    if (point) {
      const dx = point[0] - x
      const dy = point[1] - y
      const distance = Math.sqrt(dx * dx + dy * dy)

      distances.push({ point: point, distance: distance })
    }
  }

  distances.sort((a, b) => a.distance - b.distance)
  const limit = Math.min(k, distances.length)

  for (let i = 0; i < limit; i = i + 1) {
    const item = distances[i]
    if (item && item.point) {
      out_results.push([item.point[0], item.point[1], item.point[2]])
    }
  }

  return out_results
}

export function detect_collisions_quadtree(
  tree: quadtree,
  point: quadtree_point,
  radius: number,
  out_collisions: quadtree_point[],
): quadtree_point[] {
  return query_radius_quadtree(tree, point[0], point[1], radius, out_collisions)
}

export function detect_collisions_rectangle_quadtree(
  tree: quadtree,
  rect: rectangle,
  out_collisions: quadtree_point[],
): quadtree_point[] {
  return query_range_quadtree(tree, rect, out_collisions)
}
