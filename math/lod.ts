import type { vector2 } from "@/math/vector2"
import { clone_vector2 } from "@/math/vector2"
import type { rectangle } from "@/math/rectangle"

export type lod_level = {
  readonly level: number
  readonly min_distance: number
  readonly max_distance: number
  readonly detail_factor: number
}

export type lod_config = {
  readonly levels: readonly lod_level[]
  readonly max_level: number
  readonly min_level: number
  readonly base_distance: number
  readonly distance_multiplier: number
}

export type lod_result = {
  level: number
  blend_factor: number
  next_level: number
  distance: number
  screen_error: number
}

export type lod_viewport = {
  readonly position: vector2
  readonly zoom_level: number
  readonly screen_width: number
  readonly screen_height: number
  readonly field_of_view: number
}

export function create_lod_level(
  level: number,
  min_distance: number,
  max_distance: number,
  detail_factor: number,
): lod_level {
  return {
    level: Math.max(0, level),
    min_distance: Math.max(0, min_distance),
    max_distance: Math.max(min_distance, max_distance),
    detail_factor: Math.max(0, Math.min(1, detail_factor)),
  }
}

export function create_lod_config(
  levels: lod_level[],
  base_distance: number = 1000,
  distance_multiplier: number = 2,
): lod_config {
  if (levels.length === 0) {
    const default_levels = [
      create_lod_level(0, 0, base_distance, 1.0),
      create_lod_level(1, base_distance, base_distance * distance_multiplier, 0.75),
      create_lod_level(
        2,
        base_distance * distance_multiplier,
        base_distance * distance_multiplier * distance_multiplier,
        0.5,
      ),
    ]
    return {
      levels: default_levels,
      max_level: 2,
      min_level: 0,
      base_distance: base_distance,
      distance_multiplier: distance_multiplier,
    }
  }

  const sorted_levels = [...levels].sort((a, b) => a.level - b.level)

  return {
    levels: sorted_levels,
    max_level: sorted_levels[sorted_levels.length - 1]!.level,
    min_level: sorted_levels[0]!.level,
    base_distance: base_distance,
    distance_multiplier: distance_multiplier,
  }
}

export function create_lod_result(): lod_result {
  return {
    level: 0,
    blend_factor: 0,
    next_level: 0,
    distance: 0,
    screen_error: 0,
  }
}

export function create_lod_viewport(
  position: vector2,
  zoom_level: number,
  screen_width: number,
  screen_height: number,
  field_of_view: number = 60,
): lod_viewport {
  return {
    position: clone_vector2(position),
    zoom_level: Math.max(0.1, zoom_level),
    screen_width: Math.max(1, screen_width),
    screen_height: Math.max(1, screen_height),
    field_of_view: Math.max(1, Math.min(179, field_of_view)),
  }
}

export function clone_lod_viewport(viewport: lod_viewport): lod_viewport {
  return {
    position: clone_vector2(viewport.position),
    zoom_level: viewport.zoom_level,
    screen_width: viewport.screen_width,
    screen_height: viewport.screen_height,
    field_of_view: viewport.field_of_view,
  }
}

export function copy_lod_viewport(
  viewport: lod_viewport,
  out_viewport: vector2,
  out_zoom: { zoom_level: number },
  out_screen: { screen_width: number; screen_height: number },
  out_fov: { field_of_view: number },
): void {
  out_viewport[0] = viewport.position[0]
  out_viewport[1] = viewport.position[1]
  out_zoom.zoom_level = viewport.zoom_level
  out_screen.screen_width = viewport.screen_width
  out_screen.screen_height = viewport.screen_height
  out_fov.field_of_view = viewport.field_of_view
}

export function distance_from_viewport(viewport: lod_viewport, object_position: vector2): number {
  const dx = object_position[0] - viewport.position[0]
  const dy = object_position[1] - viewport.position[1]
  return Math.sqrt(dx * dx + dy * dy)
}

export function zoom_adjusted_distance(distance: number, zoom_level: number): number {
  return distance / Math.max(0.1, zoom_level)
}

export function screen_space_distance(distance: number, viewport: lod_viewport): number {
  const fov_radians = (viewport.field_of_view * Math.PI) / 180
  const half_height = Math.tan(fov_radians * 0.5) * distance
  const pixels_per_unit = viewport.screen_height / (2 * half_height)
  return (distance * pixels_per_unit) / viewport.zoom_level
}

export function calculate_lod_distance(object_position: vector2, viewport: lod_viewport): number {
  const base_distance = distance_from_viewport(viewport, object_position)
  return zoom_adjusted_distance(base_distance, viewport.zoom_level)
}

export function world_to_screen_size(
  world_size: number,
  distance: number,
  viewport: lod_viewport,
): number {
  if (distance <= 0) {
    return Number.POSITIVE_INFINITY
  }

  const fov_radians = (viewport.field_of_view * Math.PI) / 180
  const projected_size = world_size / distance
  const screen_size = (projected_size * viewport.screen_height) / (2 * Math.tan(fov_radians * 0.5))
  return screen_size * viewport.zoom_level
}

export function screen_to_world_size(
  screen_size: number,
  distance: number,
  viewport: lod_viewport,
): number {
  if (distance <= 0) {
    return 0
  }

  const fov_radians = (viewport.field_of_view * Math.PI) / 180
  const normalized_screen_size = screen_size / (viewport.zoom_level * viewport.screen_height)
  const angular_size = normalized_screen_size * 2 * Math.tan(fov_radians * 0.5)
  return angular_size * distance
}

export function select_discrete_lod_level(distance: number, config: lod_config): number {
  if (config.levels.length === 0) {
    return 0
  }

  for (let i = 0; i < config.levels.length; i = i + 1) {
    const level = config.levels[i]!
    if (distance >= level.min_distance && distance <= level.max_distance) {
      return level.level
    }
  }

  if (distance < config.levels[0]!.min_distance) {
    return config.levels[0]!.level
  }

  return config.levels[config.levels.length - 1]!.level
}

export function select_lod_by_zoom(
  object_position: vector2,
  viewport: lod_viewport,
  config: lod_config,
): number {
  const distance = calculate_lod_distance(object_position, viewport)
  return select_discrete_lod_level(distance, config)
}

export function select_lod_by_screen_size(
  object_world_size: number,
  object_position: vector2,
  viewport: lod_viewport,
  config: lod_config,
  pixel_threshold: number = 10,
): number {
  const distance = distance_from_viewport(viewport, object_position)
  const screen_size = world_to_screen_size(object_world_size, distance, viewport)

  if (screen_size < pixel_threshold) {
    return config.max_level
  }

  const size_ratio = pixel_threshold / screen_size
  const adjusted_distance = distance * size_ratio * viewport.zoom_level

  return select_discrete_lod_level(adjusted_distance, config)
}

export function find_lod_level_by_index(config: lod_config, level_index: number): lod_level | null {
  for (let i = 0; i < config.levels.length; i = i + 1) {
    const level = config.levels[i]!
    if (level.level === level_index) {
      return level
    }
  }
  return null
}

export function get_detail_factor_for_level(config: lod_config, level_index: number): number {
  const level = find_lod_level_by_index(config, level_index)
  return level !== null ? level.detail_factor : 0
}

export function calculate_continuous_lod(
  distance: number,
  config: lod_config,
  out_result: lod_result,
): lod_result {
  if (config.levels.length === 0) {
    out_result.level = 0
    out_result.blend_factor = 0
    out_result.next_level = 0
    out_result.distance = distance
    out_result.screen_error = 0
    return out_result
  }

  if (config.levels.length === 1) {
    const single_level = config.levels[0]!
    out_result.level = single_level.level
    out_result.blend_factor = 0
    out_result.next_level = single_level.level
    out_result.distance = distance
    out_result.screen_error = 0
    return out_result
  }

  let current_level_index = -1
  let next_level_index = -1

  for (let i = 0; i < config.levels.length - 1; i = i + 1) {
    const current = config.levels[i]!
    const next = config.levels[i + 1]!

    if (distance >= current.min_distance && distance <= next.min_distance) {
      current_level_index = i
      next_level_index = i + 1
      break
    }
  }

  if (current_level_index === -1) {
    if (distance < config.levels[0]!.min_distance) {
      const first_level = config.levels[0]!
      out_result.level = first_level.level
      out_result.blend_factor = 0
      out_result.next_level = first_level.level
      out_result.distance = distance
      out_result.screen_error = 0
      return out_result
    } else {
      const last_level = config.levels[config.levels.length - 1]!
      out_result.level = last_level.level
      out_result.blend_factor = 0
      out_result.next_level = last_level.level
      out_result.distance = distance
      out_result.screen_error = 0
      return out_result
    }
  }

  const current_level = config.levels[current_level_index]!
  const next_level = config.levels[next_level_index]!

  const distance_range = next_level.min_distance - current_level.min_distance
  const distance_offset = distance - current_level.min_distance
  const blend_factor =
    distance_range > 0 ? Math.min(1, Math.max(0, distance_offset / distance_range)) : 0

  out_result.level = current_level.level
  out_result.blend_factor = blend_factor
  out_result.next_level = next_level.level
  out_result.distance = distance
  out_result.screen_error = 0

  return out_result
}

export function interpolate_lod_detail_factor(result: lod_result, config: lod_config): number {
  const current_factor = get_detail_factor_for_level(config, result.level)
  const next_factor = get_detail_factor_for_level(config, result.next_level)

  return current_factor + result.blend_factor * (next_factor - current_factor)
}

export function calculate_smooth_lod_transition(
  object_position: vector2,
  viewport: lod_viewport,
  config: lod_config,
  out_result: lod_result,
): lod_result {
  const distance = calculate_lod_distance(object_position, viewport)
  return calculate_continuous_lod(distance, config, out_result)
}

export function lerp_lod_values(value_a: number, value_b: number, blend_factor: number): number {
  return value_a + blend_factor * (value_b - value_a)
}

export function smooth_step_transition(t: number): number {
  const clamped_t = Math.max(0, Math.min(1, t))
  return clamped_t * clamped_t * (3 - 2 * clamped_t)
}

export function smoother_step_transition(t: number): number {
  const clamped_t = Math.max(0, Math.min(1, t))
  return clamped_t * clamped_t * clamped_t * (clamped_t * (clamped_t * 6 - 15) + 10)
}

export function calculate_alpha_blend_factor(
  result: lod_result,
  transition_distance: number = 0.1,
): number {
  if (transition_distance <= 0) {
    return result.blend_factor < 0.5 ? 1 : 0
  }

  if (result.blend_factor <= transition_distance) {
    return 1 - result.blend_factor / transition_distance
  }

  if (result.blend_factor >= 1 - transition_distance) {
    return (1 - result.blend_factor) / transition_distance
  }

  return 1 - result.blend_factor
}

export function calculate_hysteresis_lod(
  current_lod: number,
  target_lod: number,
  distance: number,
  config: lod_config,
  hysteresis_factor: number = 0.1,
): number {
  const current_level = find_lod_level_by_index(config, current_lod)
  const target_level = find_lod_level_by_index(config, target_lod)

  if (current_level === null || target_level === null) {
    return target_lod
  }

  if (target_lod > current_lod) {
    const adjusted_distance = distance * (1 + hysteresis_factor)
    return select_discrete_lod_level(adjusted_distance, config)
  }

  if (target_lod < current_lod) {
    const adjusted_distance = distance * (1 - hysteresis_factor)
    return select_discrete_lod_level(adjusted_distance, config)
  }

  return current_lod
}

export function calculate_temporal_lod_blend(
  previous_result: lod_result,
  current_result: lod_result,
  delta_time: number,
  blend_speed: number = 2.0,
): number {
  if (previous_result.level === current_result.level) {
    return current_result.blend_factor
  }

  const target_blend = current_result.blend_factor
  const current_blend = previous_result.blend_factor
  const blend_delta = target_blend - current_blend
  const max_change = blend_speed * delta_time

  if (Math.abs(blend_delta) <= max_change) {
    return target_blend
  }

  return current_blend + Math.sign(blend_delta) * max_change
}

export function is_lod_transition_stable(
  result: lod_result,
  stability_threshold: number = 0.05,
): boolean {
  return result.blend_factor < stability_threshold || result.blend_factor > 1 - stability_threshold
}

export function calculate_screen_space_error(
  geometric_error: number,
  distance: number,
  viewport: lod_viewport,
): number {
  if (distance <= 0) {
    return Number.POSITIVE_INFINITY
  }

  const screen_error = world_to_screen_size(geometric_error, distance, viewport)
  return screen_error
}

export function calculate_geometric_error_for_lod(
  config: lod_config,
  level_index: number,
  base_error: number = 1.0,
): number {
  const level = find_lod_level_by_index(config, level_index)
  if (level === null) {
    return base_error
  }

  const error_multiplier = 1.0 - level.detail_factor
  return base_error * (1 + error_multiplier * level.level)
}

export function select_lod_by_screen_error(
  object_position: vector2,
  viewport: lod_viewport,
  config: lod_config,
  max_screen_error: number = 2.0,
  base_geometric_error: number = 1.0,
): number {
  const distance = distance_from_viewport(viewport, object_position)

  for (let i = 0; i < config.levels.length; i = i + 1) {
    const level = config.levels[i]!
    const geometric_error = calculate_geometric_error_for_lod(
      config,
      level.level,
      base_geometric_error,
    )
    const screen_error = calculate_screen_space_error(geometric_error, distance, viewport)

    if (screen_error <= max_screen_error) {
      return level.level
    }
  }

  return config.max_level
}

export function calculate_pixel_density_lod(
  object_bounds: rectangle,
  object_position: vector2,
  viewport: lod_viewport,
  config: lod_config,
  target_pixels_per_unit: number = 1.0,
): number {
  const distance = distance_from_viewport(viewport, object_position)
  const object_width = object_bounds[2]
  const object_height = object_bounds[3]
  const object_size = Math.max(object_width, object_height)

  const screen_size = world_to_screen_size(object_size, distance, viewport)
  const actual_pixels_per_unit = screen_size / object_size

  if (actual_pixels_per_unit >= target_pixels_per_unit) {
    return config.min_level
  }

  const error_ratio = target_pixels_per_unit / actual_pixels_per_unit
  const adjusted_distance = distance * error_ratio

  return select_discrete_lod_level(adjusted_distance, config)
}

export function update_lod_result_screen_error(
  result: lod_result,
  viewport: lod_viewport,
  config: lod_config,
  base_geometric_error: number = 1.0,
  out_result: lod_result,
): lod_result {
  out_result.level = result.level
  out_result.blend_factor = result.blend_factor
  out_result.next_level = result.next_level
  out_result.distance = result.distance

  const geometric_error = calculate_geometric_error_for_lod(
    config,
    result.level,
    base_geometric_error,
  )
  out_result.screen_error = calculate_screen_space_error(geometric_error, result.distance, viewport)

  return out_result
}

export function create_adaptive_lod_config(
  max_levels: number = 5,
  base_distance: number = 100,
  distance_multiplier: number = 2.5,
  detail_falloff: number = 0.2,
): lod_config {
  const levels: lod_level[] = []

  for (let i = 0; i < max_levels; i = i + 1) {
    const min_distance = i === 0 ? 0 : base_distance * Math.pow(distance_multiplier, i - 1)
    const max_distance = base_distance * Math.pow(distance_multiplier, i)
    const detail_factor = Math.max(0, 1 - i * detail_falloff)

    levels.push(create_lod_level(i, min_distance, max_distance, detail_factor))
  }

  return create_lod_config(levels, base_distance, distance_multiplier)
}
