import type { path, path_command } from "@/renderer/path"
import type { renderer_state } from "@/renderer/canvas/types"
import { hash_of_path, path_close, path_cubic, path_line, path_move } from "@/renderer/path"

export function get_or_create_path2d_canvas(state: renderer_state, p: path): Path2D {
  const hash = hash_of_path(p)
  const cached = state.path_cache.get(hash)

  if (cached !== undefined && paths_equal(cached.path_commands, p.commands)) {
    state.cache_access_counter = state.cache_access_counter + 1
    cached.last_used = state.cache_access_counter
    return cached.path2d
  }

  const path2d = build_path2d_canvas(p)

  if (state.path_cache.size >= state.cache_max_size) {
    evict_lru_canvas(state)
  }

  state.cache_access_counter = state.cache_access_counter + 1
  state.path_cache.set(hash, {
    path2d,
    last_used: state.cache_access_counter,
    path_commands: p.commands,
  })

  return path2d
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

function build_path2d_canvas(p: path): Path2D {
  const path2d = new Path2D()

  for (let i = 0; i < p.commands.length; i = i + 1) {
    const cmd = p.commands[i]
    if (cmd === undefined) {
      continue
    }

    const type = cmd[0]

    if (type === path_move) {
      path2d.moveTo(cmd[1], cmd[2])
    } else if (type === path_line) {
      path2d.lineTo(cmd[1], cmd[2])
    } else if (type === path_cubic) {
      path2d.bezierCurveTo(cmd[1], cmd[2], cmd[3], cmd[4], cmd[5], cmd[6])
    } else if (type === path_close) {
      path2d.closePath()
    }
  }

  return path2d
}

function evict_lru_canvas(state: renderer_state): void {
  let oldest_key: number | null = null
  let oldest_access = Infinity

  for (const [key, entry] of state.path_cache) {
    if (entry.last_used < oldest_access) {
      oldest_access = entry.last_used
      oldest_key = key
    }
  }

  if (oldest_key !== null) {
    state.path_cache.delete(oldest_key)
  }
}
