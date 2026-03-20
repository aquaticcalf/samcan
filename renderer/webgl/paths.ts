import type { path, path_command } from "@/renderer/path"
import type { draw_style } from "@/renderer/style"
import type { webgl_state } from "@/renderer/webgl/types"
import { hash_of_path } from "@/renderer/path"
import { cache_path_fill_webgl, draw_cached_path_fill_webgl } from "@/renderer/webgl/fills"
import { cache_path_stroke_webgl, draw_cached_path_stroke_webgl } from "@/renderer/webgl/strokes"

export function draw_path_webgl(state: webgl_state, p: path, s: draw_style): void {
  if (s.fill !== null) {
    const hash = hash_of_path(p)
    let fill_cached = state.fill_cache.get(hash)

    if (fill_cached === undefined || !paths_equal(fill_cached.path_commands, p.commands)) {
      fill_cached = cache_path_fill_webgl(p)
      update_cache_webgl(state.fill_cache, state.cache_max_size, hash, fill_cached)
    }

    draw_cached_path_fill_webgl(state, fill_cached, s.fill, s.alpha)
  }

  if (s.stroke !== null && s.stroke_width > 0) {
    const hash = hash_of_path(p) * 31 + s.stroke_width
    let stroke_cached = state.stroke_cache.get(hash)

    if (
      stroke_cached === undefined ||
      stroke_cached.stroke_width !== s.stroke_width ||
      !paths_equal(stroke_cached.path_commands, p.commands)
    ) {
      stroke_cached = cache_path_stroke_webgl(p, s.stroke_width)
      update_cache_webgl(state.stroke_cache, state.cache_max_size, hash, stroke_cached)
    }

    draw_cached_path_stroke_webgl(state, stroke_cached, s.stroke, s.alpha)
  }
}

function update_cache_webgl<T>(
  cache: Map<number, T>,
  max_size: number,
  key: number,
  value: T,
): void {
  if (cache.size >= max_size) {
    const first_key = cache.keys().next().value
    if (first_key !== undefined) {
      cache.delete(first_key)
    }
  }

  cache.set(key, value)
}

function paths_equal(a: readonly path_command[], b: readonly path_command[]): boolean {
  if (a.length !== b.length) {
    return false
  }

  for (let i = 0; i < a.length; i = i + 1) {
    const cmd_a = a[i]
    const cmd_b = b[i]
    if (cmd_a === undefined || cmd_b === undefined) {
      return false
    }

    if (cmd_a.length !== cmd_b.length) {
      return false
    }

    for (let j = 0; j < cmd_a.length; j = j + 1) {
      if (cmd_a[j] !== cmd_b[j]) {
        return false
      }
    }
  }

  return true
}
