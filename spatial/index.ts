import type { quadtree } from "@/math/quadtree"
import type { rectangle } from "@/math/rectangle"
import type { vector2 } from "@/math/vector2"
import type { element } from "@/document/element"
import {
  create_quadtree,
  insert_quadtree,
  remove_quadtree,
  create_quadtree_point,
  query_range_quadtree,
  query_radius_quadtree,
} from "@/math/quadtree"
import {
  intersects_rectangle,
  contains_point_rectangle,
  center_of_rectangle,
  expand_rectangle,
  contains_rectangle,
  union_rectangle,
} from "@/math/rectangle"
import { clone_vector2 } from "@/math/vector2"
import type { frustum } from "@/math/frustum"

export type spatial_index = {
  readonly quadtree: quadtree
  readonly bounds_map: Map<string, rectangle>
  readonly element_positions: Map<string, vector2>
  readonly config: spatial_index_config
  readonly deletion_count: number
}

export type spatial_index_config = {
  readonly capacity: number
  readonly max_depth: number
  readonly world_bounds: rectangle
  readonly auto_expand: boolean
  readonly rebuild_dirty_ratio: number
}

export type spatial_query_result = {
  readonly id: string
  readonly bounds: rectangle
}

export type spatial_index_stats = {
  readonly element_count: number
  readonly tree_depth: number
  readonly node_count: number
}

export function create_spatial_index_config(
  world_bounds: rectangle,
  capacity: number = 8,
  max_depth: number = 10,
  auto_expand: boolean = true,
  rebuild_dirty_ratio: number = 0.5,
): spatial_index_config {
  return {
    capacity: Math.max(1, capacity),
    max_depth: Math.max(1, max_depth),
    world_bounds: [world_bounds[0], world_bounds[1], world_bounds[2], world_bounds[3]],
    auto_expand,
    rebuild_dirty_ratio: Math.max(0, Math.min(1, rebuild_dirty_ratio)),
  }
}

export function create_spatial_index(config: spatial_index_config): spatial_index {
  return {
    quadtree: create_quadtree(config.world_bounds, config.capacity, config.max_depth),
    bounds_map: new Map(),
    element_positions: new Map(),
    config: {
      capacity: config.capacity,
      max_depth: config.max_depth,
      world_bounds: [
        config.world_bounds[0],
        config.world_bounds[1],
        config.world_bounds[2],
        config.world_bounds[3],
      ],
      auto_expand: config.auto_expand,
      rebuild_dirty_ratio: config.rebuild_dirty_ratio,
    },
    deletion_count: 0,
  }
}

export function create_spatial_index_from_document(
  doc: { elements: Map<string, element> },
  config: spatial_index_config,
): spatial_index {
  let index = create_spatial_index(config)

  for (const el of doc.elements.values()) {
    index = insert_spatial_index(index, el.id, el.bounds)
  }

  return index
}

function compute_center_from_bounds(bounds: rectangle, out: vector2): vector2 {
  return center_of_rectangle(bounds, out)
}

function bounds_within_world(bounds: rectangle, world: rectangle): boolean {
  return contains_rectangle(world, bounds)
}

function expand_world_for_bounds(
  current_world: rectangle,
  new_bounds: rectangle,
  out: rectangle,
): rectangle {
  return union_rectangle(current_world, new_bounds, out)
}

export function insert_spatial_index(
  index: spatial_index,
  id: string,
  bounds: rectangle,
): spatial_index {
  if (index.bounds_map.has(id)) {
    return update_spatial_index(index, id, bounds)
  }

  const center: vector2 = [0, 0]
  compute_center_from_bounds(bounds, center)

  let current_quadtree = index.quadtree
  let current_config = index.config

  if (index.config.auto_expand && !bounds_within_world(bounds, index.config.world_bounds)) {
    const new_world: rectangle = [0, 0, 0, 0]
    expand_world_for_bounds(index.config.world_bounds, bounds, new_world)

    current_quadtree = create_quadtree(new_world, index.config.capacity, index.config.max_depth)

    for (const [existing_id, existing_center] of index.element_positions) {
      const existing_bounds = index.bounds_map.get(existing_id)
      if (existing_bounds !== undefined) {
        const point = create_quadtree_point(existing_center[0], existing_center[1], existing_id)
        current_quadtree = insert_quadtree(current_quadtree, point)
      }
    }

    current_config = {
      capacity: index.config.capacity,
      max_depth: index.config.max_depth,
      world_bounds: [new_world[0], new_world[1], new_world[2], new_world[3]],
      auto_expand: index.config.auto_expand,
      rebuild_dirty_ratio: index.config.rebuild_dirty_ratio,
    }
  }

  const new_bounds_map = new Map(index.bounds_map)
  new_bounds_map.set(id, [bounds[0], bounds[1], bounds[2], bounds[3]])

  const new_element_positions = new Map(index.element_positions)
  new_element_positions.set(id, clone_vector2(center))

  const point = create_quadtree_point(center[0], center[1], id)
  const new_quadtree = insert_quadtree(current_quadtree, point)

  return {
    quadtree: new_quadtree,
    bounds_map: new_bounds_map,
    element_positions: new_element_positions,
    config: current_config,
    deletion_count: index.deletion_count,
  }
}

export function remove_spatial_index(index: spatial_index, id: string): spatial_index {
  const old_center = index.element_positions.get(id)
  if (old_center === undefined) {
    return index
  }

  const new_bounds_map = new Map(index.bounds_map)
  new_bounds_map.delete(id)

  const new_element_positions = new Map(index.element_positions)
  new_element_positions.delete(id)

  const new_deletion_count = index.deletion_count + 1

  const point = create_quadtree_point(old_center[0], old_center[1], id)
  const new_quadtree = remove_quadtree(index.quadtree, point)

  const element_count = new_bounds_map.size
  const dirty_ratio = element_count > 0 ? new_deletion_count / element_count : 0

  if (dirty_ratio > index.config.rebuild_dirty_ratio && element_count > 10) {
    let rebuilt_index = create_spatial_index(index.config)
    for (const [elem_id, elem_bounds] of new_bounds_map) {
      rebuilt_index = insert_spatial_index(rebuilt_index, elem_id, elem_bounds)
    }
    return rebuilt_index
  }

  return {
    quadtree: new_quadtree,
    bounds_map: new_bounds_map,
    element_positions: new_element_positions,
    config: index.config,
    deletion_count: new_deletion_count,
  }
}

export function update_spatial_index(
  index: spatial_index,
  id: string,
  new_bounds: rectangle,
): spatial_index {
  const old_center = index.element_positions.get(id)
  if (old_center === undefined) {
    return insert_spatial_index(index, id, new_bounds)
  }

  const center: vector2 = [0, 0]
  compute_center_from_bounds(new_bounds, center)

  const epsilon = 0.001
  const center_changed =
    Math.abs(old_center[0] - center[0]) > epsilon || Math.abs(old_center[1] - center[1]) > epsilon

  if (!center_changed) {
    const new_bounds_map = new Map(index.bounds_map)
    new_bounds_map.set(id, [new_bounds[0], new_bounds[1], new_bounds[2], new_bounds[3]])

    return {
      quadtree: index.quadtree,
      bounds_map: new_bounds_map,
      element_positions: index.element_positions,
      config: index.config,
      deletion_count: index.deletion_count,
    }
  }

  const index_without_old = remove_spatial_index(index, id)
  return insert_spatial_index(index_without_old, id, new_bounds)
}

export function clear_spatial_index(index: spatial_index): spatial_index {
  return create_spatial_index(index.config)
}

export function rebuild_spatial_index(
  index: spatial_index,
  elements: Map<string, element>,
): spatial_index {
  let new_index = create_spatial_index(index.config)

  for (const el of elements.values()) {
    new_index = insert_spatial_index(new_index, el.id, el.bounds)
  }

  return new_index
}

export function query_range_spatial_index(
  index: spatial_index,
  bounds: rectangle,
  out_results: spatial_query_result[],
): spatial_query_result[] {
  out_results.length = 0

  const candidates: Array<[number, number, unknown]> = []
  query_range_quadtree(index.quadtree, bounds, candidates)

  for (let i = 0; i < candidates.length; i = i + 1) {
    const candidate = candidates[i]
    if (candidate !== undefined) {
      const id = candidate[2] as string
      const element_bounds = index.bounds_map.get(id)

      if (element_bounds !== undefined) {
        if (intersects_rectangle(element_bounds, bounds)) {
          out_results.push({
            id,
            bounds: [element_bounds[0], element_bounds[1], element_bounds[2], element_bounds[3]],
          })
        }
      }
    }
  }

  return out_results
}

export function query_point_spatial_index(
  index: spatial_index,
  x: number,
  y: number,
  out_results: spatial_query_result[],
): spatial_query_result[] {
  out_results.length = 0

  const candidates: Array<[number, number, unknown]> = []
  query_range_quadtree(index.quadtree, [x, y, 1, 1], candidates)

  for (let i = 0; i < candidates.length; i = i + 1) {
    const candidate = candidates[i]
    if (candidate !== undefined) {
      const id = candidate[2] as string
      const element_bounds = index.bounds_map.get(id)

      if (element_bounds !== undefined) {
        if (contains_point_rectangle(element_bounds, x, y)) {
          out_results.push({
            id,
            bounds: [element_bounds[0], element_bounds[1], element_bounds[2], element_bounds[3]],
          })
        }
      }
    }
  }

  return out_results
}

export function query_radius_spatial_index(
  index: spatial_index,
  x: number,
  y: number,
  radius: number,
  out_results: spatial_query_result[],
): spatial_query_result[] {
  out_results.length = 0

  const candidates: Array<[number, number, unknown]> = []
  query_radius_quadtree(index.quadtree, x, y, radius, candidates)

  const radius_squared = radius * radius

  for (let i = 0; i < candidates.length; i = i + 1) {
    const candidate = candidates[i]
    if (candidate !== undefined) {
      const id = candidate[2] as string
      const element_bounds = index.bounds_map.get(id)

      if (element_bounds !== undefined) {
        const center: vector2 = [0, 0]
        compute_center_from_bounds(element_bounds, center)

        const dx = center[0] - x
        const dy = center[1] - y
        const distance_squared = dx * dx + dy * dy

        if (distance_squared <= radius_squared) {
          out_results.push({
            id,
            bounds: [element_bounds[0], element_bounds[1], element_bounds[2], element_bounds[3]],
          })
        }
      }
    }
  }

  return out_results
}

export function query_frustum_spatial_index(
  index: spatial_index,
  frustum_bounds: frustum,
  out_results: spatial_query_result[],
): spatial_query_result[] {
  out_results.length = 0

  const frustum_rect: rectangle = [
    frustum_bounds[0],
    frustum_bounds[3],
    frustum_bounds[1] - frustum_bounds[0],
    frustum_bounds[2] - frustum_bounds[3],
  ]

  return query_range_spatial_index(index, frustum_rect, out_results)
}

export function query_visible_elements_spatial_index(
  index: spatial_index,
  viewport_bounds: rectangle,
  margin: number = 50,
  out_results: spatial_query_result[],
): spatial_query_result[] {
  const expanded = expand_rectangle(viewport_bounds, margin, [0, 0, 0, 0])
  return query_range_spatial_index(index, expanded, out_results)
}

export function count_spatial_index(index: spatial_index): number {
  return index.bounds_map.size
}

export function bounds_of_spatial_index(index: spatial_index, out: rectangle): rectangle {
  out[0] = index.config.world_bounds[0]
  out[1] = index.config.world_bounds[1]
  out[2] = index.config.world_bounds[2]
  out[3] = index.config.world_bounds[3]
  return out
}

export function has_element_spatial_index(index: spatial_index, id: string): boolean {
  return index.bounds_map.has(id)
}

export function get_element_bounds_spatial_index(
  index: spatial_index,
  id: string,
): rectangle | null {
  const bounds = index.bounds_map.get(id)
  if (bounds === undefined) {
    return null
  }
  return [bounds[0], bounds[1], bounds[2], bounds[3]]
}

export function stats_of_spatial_index(index: spatial_index): spatial_index_stats {
  return {
    element_count: index.bounds_map.size,
    tree_depth: index.config.max_depth,
    node_count: 0,
  }
}
