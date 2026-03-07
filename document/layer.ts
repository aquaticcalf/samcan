export type layer = {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  element_ids: string[]
}

export function create_layer(
  id: string,
  name: string,
  visible: boolean = true,
  locked: boolean = false,
  opacity: number = 1,
): layer {
  return {
    id,
    name,
    visible,
    locked,
    opacity: Math.max(0, Math.min(1, opacity)),
    element_ids: [],
  }
}

export function clone_layer(l: layer): layer {
  return {
    id: l.id,
    name: l.name,
    visible: l.visible,
    locked: l.locked,
    opacity: l.opacity,
    element_ids: [...l.element_ids],
  }
}

export function id_of_layer(l: layer): string {
  return l.id
}

export function name_of_layer(l: layer): string {
  return l.name
}

export function is_visible_layer(l: layer): boolean {
  return l.visible
}

export function is_locked_layer(l: layer): boolean {
  return l.locked
}

export function opacity_of_layer(l: layer): number {
  return l.opacity
}

export function element_ids_of_layer(l: layer): readonly string[] {
  return l.element_ids
}

export function element_count_of_layer(l: layer): number {
  return l.element_ids.length
}

export function update_layer_name(l: layer, name: string): layer {
  return {
    ...l,
    name,
  }
}

export function update_layer_visibility(l: layer, visible: boolean): layer {
  return {
    ...l,
    visible,
  }
}

export function update_layer_locked(l: layer, locked: boolean): layer {
  return {
    ...l,
    locked,
  }
}

export function update_layer_opacity(l: layer, opacity: number): layer {
  return {
    ...l,
    opacity: Math.max(0, Math.min(1, opacity)),
  }
}

export function add_element_id_to_layer(l: layer, element_id: string): layer {
  if (l.element_ids.includes(element_id)) {
    return l
  }
  return {
    ...l,
    element_ids: [...l.element_ids, element_id],
  }
}

export function remove_element_id_from_layer(l: layer, element_id: string): layer {
  const index = l.element_ids.indexOf(element_id)
  if (index === -1) {
    return l
  }
  const new_ids = [...l.element_ids]
  new_ids.splice(index, 1)
  return {
    ...l,
    element_ids: new_ids,
  }
}

export function has_element_id_in_layer(l: layer, element_id: string): boolean {
  return l.element_ids.includes(element_id)
}

export function reorder_element_ids_in_layer(l: layer, element_ids: string[]): layer {
  const existing_set = new Set(l.element_ids)
  const filtered_ids = element_ids.filter((id) => existing_set.has(id))
  const new_ids_set = new Set(filtered_ids)
  const remaining_ids = l.element_ids.filter((id) => !new_ids_set.has(id))
  return {
    ...l,
    element_ids: [...remaining_ids, ...filtered_ids],
  }
}

export function equals_layer(a: layer, b: layer): boolean {
  if (a.id !== b.id || a.name !== b.name) {
    return false
  }
  if (a.visible !== b.visible || a.locked !== b.locked) {
    return false
  }
  if (a.opacity !== b.opacity) {
    return false
  }
  if (a.element_ids.length !== b.element_ids.length) {
    return false
  }
  for (let i = 0; i < a.element_ids.length; i = i + 1) {
    if (a.element_ids[i] !== b.element_ids[i]) {
      return false
    }
  }
  return true
}
