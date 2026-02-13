export type vector2 = [number, number]

export function create_vector2(x: number, y: number): vector2 {
    return [x, y]
}

export function zero_vector2(): vector2 {
    return [0, 0]
}

export function unit_vector2(): vector2 {
  return [1, 1]
}

export function clone_vector2(v: vector2): vector2 {
    return [v[0], v[1]]
}

export function copy_vector2(v: vector2, out: vector2): vector2 {
    out[0] = v[0]
    out[1] = v[1]
    return out
}

export function set_vector2(x: number, y: number, out: vector2): vector2 {
    out[0] = x
    out[1] = y
    return out
}

export function add_vector2(a: vector2, b: vector2, out: vector2): vector2 {
    out[0] = a[0] + b[0]
    out[1] = a[1] + b[1]
    return out
}

export function subtract_vector2(a: vector2, b: vector2, out: vector2): vector2 {
    out[0] = a[0] - b[0]
    out[1] = a[1] - b[1]
    return out
}

export function multiply_vector2(a: vector2, b: number, out: vector2): vector2 {
    out[0] = a[0] * b
    out[1] = a[1] * b
    return out
}

export function divide_vector2(a: vector2, b: number, out: vector2): vector2 {
    out[0] = a[0] / b
    out[1] = a[1] / b
    return out
}

export function normalize_vector2(a: vector2, out: vector2): vector2 {
    const len = length_vector2(a)

    if (len > 0) {
        divide_vector2(a, len, out)
    }

    else {
        set_vector2(0, 0, out)
    }

    return out
}

export function lerp_vector2(a: vector2, b: vector2, t: number, out: vector2): vector2 {
    out[0] = a[0] + t * (b[0] - a[0])
    out[1] = a[1] + t * (b[1] - a[1])
    return out
}

export function dot_vector2(a: vector2, b: vector2): number {
    return a[0] * b[0] + a[1] * b[1]
}

export function cross_vector2(a: vector2, b: vector2): number {
    return a[0] * b[1] - a[1] * b[0]
}

export function length_squared_vector2(a: vector2): number {
    return a[0] * a[0] + a[1] * a[1]
}

export function length_vector2(a: vector2): number {
    return Math.sqrt(length_squared_vector2(a))
}

export function distance_squared_vector2(a: vector2, b: vector2): number {
    return length_squared_vector2(subtract_vector2(a, b, zero_vector2()))
}

export function distance_vector2(a: vector2, b: vector2): number {
    return Math.sqrt(distance_squared_vector2(a, b))
}

export function is_equal_vector2(a: vector2, b: vector2, epsilon: number = 0.0001): boolean {
    return Math.abs(a[0] - b[0]) < epsilon && Math.abs(a[1] - b[1]) < epsilon
}