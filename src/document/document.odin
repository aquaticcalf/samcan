package document

import "core:strings"

color :: [4]f32

element_kind :: enum {
    rectangle,
    ellipse,
    diamond,
    line,
    arrow,
    text,
    freehand,
}

element :: struct {
    id:     u64,
    kind:   element_kind,
    x:      f32,
    y:      f32,
    width:  f32,
    height: f32,
    fill:   color,
    text:   string,
    points: [dynamic][2]f32,
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
    for &source_element in source.elements {
        element := source_element
        if element.text != "" {
            element.text = strings.clone(element.text)
        }
        if len(source_element.points) > 0 {
            element.points = make([dynamic][2]f32, 0)
            for point in source_element.points {
                append(&element.points, point)
            }
        }
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
        left_element := left.elements[index]
        right_element := right.elements[index]
        if left_element.id != right_element.id ||
            left_element.kind != right_element.kind ||
            left_element.x != right_element.x ||
            left_element.y != right_element.y ||
            left_element.width != right_element.width ||
            left_element.height != right_element.height ||
            left_element.fill != right_element.fill ||
            left_element.text != right_element.text ||
            len(left_element.points) != len(right_element.points) {
            return false
        }
        for point_index in 0 ..< len(left_element.points) {
            if left_element.points[point_index] != right_element.points[point_index] {
                return false
            }
        }
    }
    return true
}

destroy :: proc(doc: ^document) {
    for &element in doc.elements {
        delete(element.text)
        delete(element.points)
    }
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
        text = "",
        points = nil,
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

add_text :: proc(doc: ^document, x, y: f32, text: string, fill: color) -> int {
    width, height := text_dimensions(text)
    index := add(doc, .text, x, y, width, height, fill)
    doc.elements[index].text = strings.clone(text)
    return index
}

add_freehand :: proc(doc: ^document, x, y: f32, fill: color) -> int {
    index := add(doc, .freehand, x, y, 0, 0, fill)
    append(&doc.elements[index].points, [2]f32{x, y})
    return index
}

append_point :: proc(doc: ^document, index: int, point: [2]f32) {
    if index < 0 || index >= len(doc.elements) || doc.elements[index].kind != .freehand {
        return
    }
    append(&doc.elements[index].points, point)
    recalculate_bounds(doc, index)
}

recalculate_bounds :: proc(doc: ^document, index: int) {
    if index < 0 || index >= len(doc.elements) || len(doc.elements[index].points) == 0 {
        return
    }
    points := doc.elements[index].points
    min_x, min_y := points[0][0], points[0][1]
    max_x, max_y := min_x, min_y
    for point in points[1:] {
        min_x = min(min_x, point[0])
        min_y = min(min_y, point[1])
        max_x = max(max_x, point[0])
        max_y = max(max_y, point[1])
    }
    doc.elements[index].x = min_x
    doc.elements[index].y = min_y
    doc.elements[index].width = max_x - min_x
    doc.elements[index].height = max_y - min_y
}

set_text :: proc(doc: ^document, index: int, text: string) {
    if index < 0 || index >= len(doc.elements) || doc.elements[index].kind != .text {
        return
    }
    replacement := strings.clone(text)
    delete(doc.elements[index].text)
    doc.elements[index].text = replacement
    doc.elements[index].width, doc.elements[index].height = text_dimensions(text)
}

text_dimensions :: proc(text: string) -> (width, height: f32) {
    current_width: f32 = 0
    max_width: f32 = 0
    lines := 1
    for character in text {
        if character == '\n' {
            max_width = max(max_width, current_width)
            current_width = 0
            lines += 1
        } else {
            current_width += 6
        }
    }
    max_width = max(max_width, current_width)
    width = max(6.0, max_width)
    height = f32(lines) * 12.0
    return
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

translate :: proc(doc: ^document, index: int, delta_x, delta_y: f32) {
    if index < 0 || index >= len(doc.elements) {
        return
    }
    doc.elements[index].x += delta_x
    doc.elements[index].y += delta_y
    for &point in doc.elements[index].points {
        point[0] += delta_x
        point[1] += delta_y
    }
}

remove :: proc(doc: ^document, index: int) {
    if index < 0 || index >= len(doc.elements) {
        return
    }
    delete(doc.elements[index].text)
    delete(doc.elements[index].points)
    ordered_remove(&doc.elements, index)
}
