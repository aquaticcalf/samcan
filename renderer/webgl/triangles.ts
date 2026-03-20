type polygon_node = {
  i: number
  x: number
  y: number
  prev: polygon_node | null
  next: polygon_node | null
}

export function triangulate_polygon_earcut(vertices: number[]): number[] {
  if (vertices.length < 6) {
    return []
  }

  const n = vertices.length / 2

  if (n === 3) {
    return [0, 1, 2]
  }

  let head: polygon_node | null = null
  let last: polygon_node | null = null

  for (let i = 0; i < n; i = i + 1) {
    const x = vertices[i * 2]
    const y = vertices[i * 2 + 1]
    if (x !== undefined && y !== undefined) {
      const node: polygon_node = { i, x, y, prev: last, next: null }
      if (last !== null) {
        last.next = node
      } else {
        head = node
      }
      last = node
    }
  }

  if (head !== null && last !== null) {
    head.prev = last
    last.next = head
  }

  const indices: number[] = []
  let ear = head
  let count = n * 2

  while (count > 0 && ear !== null && ear.next !== ear.prev) {
    count = count - 1

    const prev = ear.prev
    const next = ear.next

    if (prev !== null && next !== null && is_ear(prev, ear, next)) {
      indices.push(prev.i, ear.i, next.i)

      if (prev.next === next) {
        break
      }

      prev.next = next
      next.prev = prev
      ear = next
    } else {
      ear = next
    }
  }

  return indices
}

function is_ear(a: polygon_node, b: polygon_node, c: polygon_node): boolean {
  const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  if (area >= 0) {
    return false
  }

  let p = c.next
  while (p !== null && p !== a) {
    if (point_in_triangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y)) {
      return false
    }
    p = p.next
  }

  return true
}

function point_in_triangle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  px: number,
  py: number,
): boolean {
  const denom = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
  if (denom === 0) {
    return false
  }

  const a = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / denom
  const b = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / denom
  const c = 1 - a - b

  return a >= 0 && b >= 0 && c >= 0
}
