export type color = [number, number, number, number]

export function create_color(r: number = 0, g: number = 0, b: number = 0, a: number = 1): color {
  return [
    Math.max(0, Math.min(1, r)),
    Math.max(0, Math.min(1, g)),
    Math.max(0, Math.min(1, b)),
    Math.max(0, Math.min(1, a)),
  ]
}

export function clone_color(c: color): color {
  return [c[0], c[1], c[2], c[3]]
}

export function set_color(out: color, r: number, g: number, b: number, a: number = 1): color {
  out[0] = Math.max(0, Math.min(1, r))
  out[1] = Math.max(0, Math.min(1, g))
  out[2] = Math.max(0, Math.min(1, b))
  out[3] = Math.max(0, Math.min(1, a))
  return out
}

export function copy_color(out: color, c: color): color {
  out[0] = c[0]
  out[1] = c[1]
  out[2] = c[2]
  out[3] = c[3]
  return out
}

export function from_rgb_color(r: number, g: number, b: number, a: number = 255): color {
  return create_color(r / 255, g / 255, b / 255, a / 255)
}

export function from_hex_color(hex: string): color {
  const cleaned = hex.replace("#", "")
  const r = parseInt(cleaned.substring(0, 2), 16) / 255
  const g = parseInt(cleaned.substring(2, 4), 16) / 255
  const b = parseInt(cleaned.substring(4, 6), 16) / 255
  const a = cleaned.length === 8 ? parseInt(cleaned.substring(6, 8), 16) / 255 : 1
  return create_color(r, g, b, a)
}

export function to_rgba_string_color(c: color): string {
  return `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${c[3]})`
}

export function to_hex_string_color(c: color): string {
  const r = Math.round(c[0] * 255)
    .toString(16)
    .padStart(2, "0")
  const g = Math.round(c[1] * 255)
    .toString(16)
    .padStart(2, "0")
  const b = Math.round(c[2] * 255)
    .toString(16)
    .padStart(2, "0")
  const a = Math.round(c[3] * 255)
    .toString(16)
    .padStart(2, "0")
  return c[3] === 1 ? `#${r}${g}${b}` : `#${r}${g}${b}${a}`
}

export function lerp_color(out: color, c1: color, c2: color, t: number): color {
  out[0] = c1[0] + (c2[0] - c1[0]) * t
  out[1] = c1[1] + (c2[1] - c1[1]) * t
  out[2] = c1[2] + (c2[2] - c1[2]) * t
  out[3] = c1[3] + (c2[3] - c1[3]) * t
  return out
}

export function equals_color(c1: color, c2: color, epsilon: number = 0.0001): boolean {
  return (
    Math.abs(c1[0] - c2[0]) < epsilon &&
    Math.abs(c1[1] - c2[1]) < epsilon &&
    Math.abs(c1[2] - c2[2]) < epsilon &&
    Math.abs(c1[3] - c2[3]) < epsilon
  )
}

export function white_color(): color {
  return [1, 1, 1, 1]
}

export function black_color(): color {
  return [0, 0, 0, 1]
}

export function transparent_color(): color {
  return [0, 0, 0, 0]
}
