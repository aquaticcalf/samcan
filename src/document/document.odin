package document

color :: [4]f32

element_kind :: enum {
    rectangle,
    ellipse,
    diamond,
    line,
    arrow,
}

element :: struct {
    id:     u64,
    kind:   element_kind,
    x:      f32,
    y:      f32,
    width:  f32,
    height: f32,
    fill:   color,
}

document :: struct {
    elements: [dynamic]element,
    next_id:  u64,
}

new :: proc() -> document {
    return document{
        elements = make([dynamic]element, 0),
        next_id = 1,
    }
}

clone :: proc(source: ^document) -> document {
    result := new()
    for element in source.elements {
        append(&result.elements, element)
    }
    result.next_id = source.next_id
    return result
}

same :: proc(left, right: ^document) -> bool {
    if left.next_id != right.next_id || len(left.elements) != len(right.elements) {
        return false
    }
    for index in 0 ..< len(left.elements) {
        if left.elements[index] != right.elements[index] {
            return false
        }
    }
    return true
}

destroy :: proc(doc: ^document) {
    delete(doc.elements)
    doc.next_id = 1
}

add :: proc(doc: ^document, kind: element_kind, x, y, width, height: f32, fill: color) -> int {
    id := doc.next_id
    doc.next_id += 1

    append(&doc.elements, element{
        id = id,
        kind = kind,
        x = x,
        y = y,
        width = width,
        height = height,
        fill = fill,
    })
    return len(doc.elements) - 1
}

add_rectangle :: proc(doc: ^document, x, y, width, height: f32, fill: color) -> int {
    return add(doc, .rectangle, x, y, width, height, fill)
}

add_ellipse :: proc(doc: ^document, x, y, width, height: f32, fill: color) -> int {
    return add(doc, .ellipse, x, y, width, height, fill)
}

add_diamond :: proc(doc: ^document, x, y, width, height: f32, fill: color) -> int {
    return add(doc, .diamond, x, y, width, height, fill)
}

add_line :: proc(doc: ^document, x, y, width, height: f32, fill: color) -> int {
    return add(doc, .line, x, y, width, height, fill)
}

add_arrow :: proc(doc: ^document, x, y, width, height: f32, fill: color) -> int {
    return add(doc, .arrow, x, y, width, height, fill)
}

set_bounds :: proc(doc: ^document, index: int, x, y, width, height: f32) {
    if index < 0 || index >= len(doc.elements) {
        return
    }
    doc.elements[index].x = x
    doc.elements[index].y = y
    doc.elements[index].width = width
    doc.elements[index].height = height
}

remove :: proc(doc: ^document, index: int) {
    if index < 0 || index >= len(doc.elements) {
        return
    }
    ordered_remove(&doc.elements, index)
}
