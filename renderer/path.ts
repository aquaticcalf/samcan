import type { rectangle } from "@/math/rectangle"
import type { circle } from "@/math/circle"
import type { vector2 } from "@/math/vector2"
import type { transform } from "@/math/transform"
import { create_rectangle } from "@/math/rectangle"
import { transform_point_transform } from "@/math/transform"

export const path_move = 0
export const path_line = 1
export const path_cubic = 2
export const path_close = 3

export type path_command_move = [typeof path_move, number, number]
export type path_command_line = [typeof path_line, number, number]
export type path_command_cubic = [typeof path_cubic, number, number, number, number, number, number]
export type path_command_close = [typeof path_close]
export type path_command =
  | path_command_move
  | path_command_line
  | path_command_cubic
  | path_command_close

export type path = {
  readonly commands: readonly path_command[]
  readonly bounds: rectangle
}

export function create_path(): path {
  return {
    commands: [],
    bounds: create_rectangle(0, 0, 0, 0),
  }
}

export function clone_path(p: path): path {
  return {
    commands: [...p.commands],
    bounds: [...p.bounds] as rectangle,
  }
}

export function move_to_path(p: path, x: number, y: number): path {
  const new_commands = [...p.commands, [path_move, x, y] as path_command_move]
  return {
    commands: new_commands,
    bounds: calculate_bounds_of_path(new_commands),
  }
}

export function line_to_path(p: path, x: number, y: number): path {
  const new_commands = [...p.commands, [path_line, x, y] as path_command_line]
  return {
    commands: new_commands,
    bounds: calculate_bounds_of_path(new_commands),
  }
}

export function cubic_to_path(
  p: path,
  c1x: number,
  c1y: number,
  c2x: number,
  c2y: number,
  x: number,
  y: number,
): path {
  const new_commands = [...p.commands, [path_cubic, c1x, c1y, c2x, c2y, x, y] as path_command_cubic]
  return {
    commands: new_commands,
    bounds: calculate_bounds_of_path(new_commands),
  }
}

export function close_path(p: path): path {
  const new_commands = [...p.commands, [path_close] as path_command_close]
  return {
    commands: new_commands,
    bounds: p.bounds,
  }
}

export function bounds_of_path(p: path): rectangle {
  return p.bounds
}

export function is_empty_path(p: path): boolean {
  return p.commands.length === 0
}

export function command_count_of_path(p: path): number {
  return p.commands.length
}

export function transform_path(p: path, t: transform, out: path): path {
  const transformed_commands: path_command[] = []
  for (let i = 0; i < p.commands.length; i = i + 1) {
    const cmd = p.commands[i]
    if (cmd !== undefined) {
      transformed_commands.push(transform_command(cmd, t))
    }
  }
  const result: path = {
    commands: transformed_commands,
    bounds: calculate_bounds_of_path(transformed_commands),
  }
  Object.assign(out, result)
  return out
}

export function hash_of_path(p: path): number {
  let hash = 0
  for (let i = 0; i < p.commands.length; i = i + 1) {
    const cmd = p.commands[i]
    if (cmd !== undefined) {
      hash = hash * 31 + hash_command(cmd)
    }
  }
  return hash
}

export function from_rectangle_path(r: rectangle): path {
  const commands: path_command[] = [
    [path_move, r[0], r[1]],
    [path_line, r[0] + r[2], r[1]],
    [path_line, r[0] + r[2], r[1] + r[3]],
    [path_line, r[0], r[1] + r[3]],
    [path_close],
  ]
  return {
    commands,
    bounds: [...r] as rectangle,
  }
}

export function from_circle_path(c: circle, segments: number): path {
  const commands: path_command[] = []
  const cx = c[0]
  const cy = c[1]
  const r = c[2]

  if (segments < 3) {
    return create_path()
  }

  const kappa = (4 / 3) * Math.tan(Math.PI / (2 * segments))

  for (let i = 0; i < segments; i = i + 1) {
    const angle1 = (2 * Math.PI * i) / segments
    const angle2 = (2 * Math.PI * (i + 1)) / segments

    const x1 = cx + r * Math.cos(angle1)
    const y1 = cy + r * Math.sin(angle1)
    const x2 = cx + r * Math.cos(angle2)
    const y2 = cy + r * Math.sin(angle2)

    const cos1 = Math.cos(angle1)
    const sin1 = Math.sin(angle1)
    const cos2 = Math.cos(angle2)
    const sin2 = Math.sin(angle2)

    const c1x = x1 - r * kappa * sin1
    const c1y = y1 + r * kappa * cos1
    const c2x = x2 + r * kappa * sin2
    const c2y = y2 - r * kappa * cos2

    if (i === 0) {
      commands.push([path_move, x1, y1])
    }

    commands.push([path_cubic, c1x, c1y, c2x, c2y, x2, y2])
  }

  commands.push([path_close])

  const bounds = create_rectangle(cx - r, cy - r, r * 2, r * 2)

  return {
    commands,
    bounds,
  }
}

export function from_polyline_path(points: readonly vector2[], closed: boolean): path {
  if (points.length === 0) {
    return create_path()
  }

  const commands: path_command[] = []
  const first_point = points[0]
  if (first_point !== undefined) {
    commands.push([path_move, first_point[0], first_point[1]])
  }

  for (let i = 1; i < points.length; i = i + 1) {
    const point = points[i]
    if (point !== undefined) {
      commands.push([path_line, point[0], point[1]])
    }
  }

  if (closed && points.length > 2) {
    commands.push([path_close])
  }

  return {
    commands,
    bounds: calculate_bounds_of_path(commands),
  }
}

function calculate_bounds_of_path(commands: readonly path_command[]): rectangle {
  if (commands.length === 0) {
    return create_rectangle(0, 0, 0, 0)
  }

  let min_x = Infinity
  let min_y = Infinity
  let max_x = -Infinity
  let max_y = -Infinity

  for (let i = 0; i < commands.length; i = i + 1) {
    const cmd = commands[i]
    if (cmd === undefined) {
      continue
    }
    const type = cmd[0]

    if (type === path_move || type === path_line) {
      const cmd_move_line = cmd as path_command_move | path_command_line
      const x = cmd_move_line[1]
      const y = cmd_move_line[2]
      min_x = Math.min(min_x, x)
      min_y = Math.min(min_y, y)
      max_x = Math.max(max_x, x)
      max_y = Math.max(max_y, y)
    } else if (type === path_cubic) {
      const cmd_cubic = cmd as path_command_cubic
      const c1x = cmd_cubic[1]
      const c1y = cmd_cubic[2]
      const c2x = cmd_cubic[3]
      const c2y = cmd_cubic[4]
      const x = cmd_cubic[5]
      const y = cmd_cubic[6]
      min_x = Math.min(min_x, c1x, c2x, x)
      min_y = Math.min(min_y, c1y, c2y, y)
      max_x = Math.max(max_x, c1x, c2x, x)
      max_y = Math.max(max_y, c1y, c2y, y)
    }
  }

  if (min_x === Infinity) {
    return create_rectangle(0, 0, 0, 0)
  }

  return create_rectangle(min_x, min_y, max_x - min_x, max_y - min_y)
}

function transform_command(cmd: path_command, t: transform): path_command {
  const type = cmd[0]

  if (type === path_move || type === path_line) {
    const cmd_move_line = cmd as path_command_move | path_command_line
    const p1: vector2 = [cmd_move_line[1], cmd_move_line[2]]
    const out1: vector2 = [0, 0]
    transform_point_transform(t, p1, out1)
    return [type, out1[0], out1[1]]
  } else if (type === path_cubic) {
    const cmd_cubic = cmd as path_command_cubic
    const p1: vector2 = [cmd_cubic[1], cmd_cubic[2]]
    const p2: vector2 = [cmd_cubic[3], cmd_cubic[4]]
    const p3: vector2 = [cmd_cubic[5], cmd_cubic[6]]
    const out1: vector2 = [0, 0]
    const out2: vector2 = [0, 0]
    const out3: vector2 = [0, 0]
    transform_point_transform(t, p1, out1)
    transform_point_transform(t, p2, out2)
    transform_point_transform(t, p3, out3)
    return [path_cubic, out1[0], out1[1], out2[0], out2[1], out3[0], out3[1]]
  } else {
    return cmd
  }
}

function hash_command(cmd: path_command): number {
  const type = cmd[0]
  let hash = type * 31

  if (type === path_move || type === path_line) {
    const cmd_move_line = cmd as path_command_move | path_command_line
    hash = hash * 31 + Math.floor(cmd_move_line[1] * 1000)
    hash = hash * 31 + Math.floor(cmd_move_line[2] * 1000)
  } else if (type === path_cubic) {
    const cmd_cubic = cmd as path_command_cubic
    hash = hash * 31 + Math.floor(cmd_cubic[1] * 1000)
    hash = hash * 31 + Math.floor(cmd_cubic[2] * 1000)
    hash = hash * 31 + Math.floor(cmd_cubic[3] * 1000)
    hash = hash * 31 + Math.floor(cmd_cubic[4] * 1000)
    hash = hash * 31 + Math.floor(cmd_cubic[5] * 1000)
    hash = hash * 31 + Math.floor(cmd_cubic[6] * 1000)
  }

  return hash
}
