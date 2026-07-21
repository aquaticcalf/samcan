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
    for &element in doc.elements {
        delete(element.text)
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

remove :: proc(doc: ^document, index: int) {
    if index < 0 || index >= len(doc.elements) {
        return
    }
    delete(doc.elements[index].text)
    ordered_remove(&doc.elements, index)
}
