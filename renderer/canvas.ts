import type { renderer, renderer_config } from "@/renderer/renderer"
import type { path, path_command } from "@/renderer/path"
import type { draw_style } from "@/renderer/style"
import type { transform } from "@/math/transform"
import type { rectangle } from "@/math/rectangle"
import type { circle } from "@/math/circle"
import type { vector2 } from "@/math/vector2"
import type { color } from "@/math/color"
import { hash_of_path, path_move, path_line, path_cubic, path_close } from "@/renderer/path"
import { to_rgba_string_color } from "@/math/color"
import { renderer_kind_canvas } from "@/renderer/renderer"
import { line_cap_round, line_cap_square } from "@/renderer/style"
import { line_join_round, line_join_bevel } from "@/renderer/style"

type path_cache_entry = {
  path2d: Path2D
  last_used: number
  path_commands: readonly path_command[]
}

type renderer_state = {
  ctx: CanvasRenderingContext2D
  path_cache: Map<number, path_cache_entry>
  cache_access_counter: number
  cache_max_size: number
  current_width: number
  current_height: number
  current_pixel_ratio: number
}

export function create_renderer_canvas(
  canvas: HTMLCanvasElement,
  config: renderer_config,
): renderer | null {
  const ctx = canvas.getContext("2d")

  if (ctx === null) {
    return null
  }

  const state: renderer_state = {
    ctx,
    path_cache: new Map(),
    cache_access_counter: 0,
    cache_max_size: config.path_cache_size,
    current_width: canvas.width,
    current_height: canvas.height,
    current_pixel_ratio: 1,
  }

  return {
    kind: renderer_kind_canvas,
    get width() {
      return state.current_width
    },
    get height() {
      return state.current_height
    },
    get pixel_ratio() {
      return state.current_pixel_ratio
    },

    begin_frame: () => begin_frame_canvas(state),
    end_frame: () => end_frame_canvas(state),

    set_transform: (t: transform) => set_transform_canvas(state, t),
    reset_transform: () => reset_transform_canvas(state),
    save: () => save_canvas(state),
    restore: () => restore_canvas(state),

    draw_path: (p: path, s: draw_style) => draw_path_canvas(state, p, s),
    draw_rectangle: (r: rectangle, s: draw_style) => draw_rectangle_canvas(state, r, s),
    draw_circle: (c: circle, s: draw_style) => draw_circle_canvas(state, c, s),
    draw_line: (a: vector2, b: vector2, s: draw_style) => draw_line_canvas(state, a, b, s),
    draw_polyline: (points: readonly vector2[], s: draw_style) =>
      draw_polyline_canvas(state, points, s),

    clip_rectangle: (r: rectangle) => clip_rectangle_canvas(state, r),
    clear: (c: color) => clear_canvas(state, c),

    resize: (width: number, height: number, pixel_ratio: number) =>
      resize_canvas(state, canvas, width, height, pixel_ratio),
    dispose: () => dispose_canvas(state),
  }
}

function begin_frame_canvas(state: renderer_state): void {
  state.ctx.resetTransform()
}

function end_frame_canvas(_state: renderer_state): void {}

function set_transform_canvas(state: renderer_state, t: transform): void {
  state.ctx.setTransform(t[0], t[1], t[2], t[3], t[4], t[5])
}

function reset_transform_canvas(state: renderer_state): void {
  state.ctx.resetTransform()
}

function save_canvas(state: renderer_state): void {
  state.ctx.save()
}

function restore_canvas(state: renderer_state): void {
  state.ctx.restore()
}

function draw_path_canvas(state: renderer_state, p: path, s: draw_style): void {
  const path2d = get_or_create_path2d_canvas(state, p)
  apply_style_canvas(state.ctx, s)

  if (s.fill !== null) {
    state.ctx.fill(path2d)
  }

  if (s.stroke !== null && s.stroke_width > 0) {
    state.ctx.stroke(path2d)
  }
}

function draw_rectangle_canvas(state: renderer_state, r: rectangle, s: draw_style): void {
  apply_style_canvas(state.ctx, s)

  if (s.fill !== null) {
    state.ctx.fillRect(r[0], r[1], r[2], r[3])
  }

  if (s.stroke !== null && s.stroke_width > 0) {
    state.ctx.strokeRect(r[0], r[1], r[2], r[3])
  }
}

function draw_circle_canvas(state: renderer_state, c: circle, s: draw_style): void {
  state.ctx.beginPath()
  state.ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2)
  apply_style_canvas(state.ctx, s)

  if (s.fill !== null) {
    state.ctx.fill()
  }

  if (s.stroke !== null && s.stroke_width > 0) {
    state.ctx.stroke()
  }
}

function draw_line_canvas(state: renderer_state, a: vector2, b: vector2, s: draw_style): void {
  state.ctx.beginPath()
  state.ctx.moveTo(a[0], a[1])
  state.ctx.lineTo(b[0], b[1])
  apply_style_canvas(state.ctx, s)
  state.ctx.stroke()
}

function draw_polyline_canvas(
  state: renderer_state,
  points: readonly vector2[],
  s: draw_style,
): void {
  if (points.length < 2) {
    return
  }

  state.ctx.beginPath()
  const first = points[0]
  if (first !== undefined) {
    state.ctx.moveTo(first[0], first[1])
  }

  for (let i = 1; i < points.length; i = i + 1) {
    const point = points[i]
    if (point !== undefined) {
      state.ctx.lineTo(point[0], point[1])
    }
  }

  apply_style_canvas(state.ctx, s)
  state.ctx.stroke()
}

function clip_rectangle_canvas(state: renderer_state, r: rectangle): void {
  state.ctx.save()
  state.ctx.beginPath()
  state.ctx.rect(r[0], r[1], r[2], r[3])
  state.ctx.clip()
}

function clear_canvas(state: renderer_state, c: color): void {
  state.ctx.save()
  state.ctx.resetTransform()
  state.ctx.fillStyle = to_rgba_string_color(c)
  state.ctx.fillRect(
    0,
    0,
    state.current_width * state.current_pixel_ratio,
    state.current_height * state.current_pixel_ratio,
  )
  state.ctx.restore()
}

function resize_canvas(
  state: renderer_state,
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  pixel_ratio: number,
): void {
  state.current_width = width
  state.current_height = height
  state.current_pixel_ratio = pixel_ratio

  canvas.width = width * pixel_ratio
  canvas.height = height * pixel_ratio
  canvas.style.width = width + "px"
  canvas.style.height = height + "px"

  state.ctx.scale(pixel_ratio, pixel_ratio)
}

function dispose_canvas(state: renderer_state): void {
  state.path_cache.clear()
}

function apply_style_canvas(ctx: CanvasRenderingContext2D, s: draw_style): void {
  ctx.globalAlpha = s.alpha

  if (s.fill !== null) {
    ctx.fillStyle = to_rgba_string_color(s.fill)
  }

  if (s.stroke !== null) {
    ctx.strokeStyle = to_rgba_string_color(s.stroke)
  }

  ctx.lineWidth = s.stroke_width
  ctx.lineCap = line_cap_to_string_canvas(s.line_cap)
  ctx.lineJoin = line_join_to_string_canvas(s.line_join)
  ctx.miterLimit = s.miter_limit
}

function line_cap_to_string_canvas(cap: number): CanvasLineCap {
  if (cap === line_cap_round) {
    return "round"
  } else if (cap === line_cap_square) {
    return "square"
  } else {
    return "butt"
  }
}

function line_join_to_string_canvas(join: number): CanvasLineJoin {
  if (join === line_join_round) {
    return "round"
  } else if (join === line_join_bevel) {
    return "bevel"
  } else {
    return "miter"
  }
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

function get_or_create_path2d_canvas(state: renderer_state, p: path): Path2D {
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
