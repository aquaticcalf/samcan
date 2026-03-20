import type { path_command } from "@/renderer/path"

export type path_cache_entry = {
  path2d: Path2D
  last_used: number
  path_commands: readonly path_command[]
}

export type renderer_state = {
  ctx: CanvasRenderingContext2D
  path_cache: Map<number, path_cache_entry>
  cache_access_counter: number
  cache_max_size: number
  current_width: number
  current_height: number
  current_pixel_ratio: number
}
