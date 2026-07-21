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

text_align :: enum {
    left,
    center,
    right,
}

vertical_align :: enum {
    top,
    middle,
    bottom,
}

default_font_size :: f32(20.0)
default_font_family :: i32(5)
default_line_height :: f32(1.25)

element :: struct {
    id:     u64,
    group_id: u64,
    locked: bool,
    kind:   element_kind,
    x:      f32,
    y:      f32,
    width:  f32,
    height: f32,
    angle:  f32,
    fill:   color,
    stroke: color,
    stroke_width: f32,
    opacity: f32,
    text:   string,
    original_text: string,
    font_size: f32,
    font_family: i32,
    text_align: text_align,
    vertical_align: vertical_align,
    auto_resize: bool,
    line_height: f32,
    points: [dynamic][2]f32,
}

document :: struct {
    elements: [dynamic]element,
    next_id:  u64,
    next_group_id: u64,
}

new :: proc() -> document {
    return document{
        elements = make([dynamic]element, 0),
        next_id = 1,
        next_group_id = 1,
    }
}

clone :: proc(source: ^document) -> document {
    result := new()
    for &source_element in source.elements {
        element := source_element
        if element.text != "" {
            element.text = strings.clone(element.text)
        }
        if element.original_text != "" {
            element.original_text = strings.clone(element.original_text)
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
    result.next_group_id = source.next_group_id
    return result
}

same :: proc(left, right: ^document) -> bool {
    if left.next_id != right.next_id || left.next_group_id != right.next_group_id || len(left.elements) != len(right.elements) {
        return false
    }
    for index in 0 ..< len(left.elements) {
        left_element := left.elements[index]
        right_element := right.elements[index]
        if left_element.id != right_element.id ||
            left_element.group_id != right_element.group_id ||
            left_element.locked != right_element.locked ||
            left_element.kind != right_element.kind ||
            left_element.x != right_element.x ||
            left_element.y != right_element.y ||
            left_element.width != right_element.width ||
            left_element.height != right_element.height ||
            left_element.angle != right_element.angle ||
            left_element.fill != right_element.fill ||
            left_element.stroke != right_element.stroke ||
            left_element.stroke_width != right_element.stroke_width ||
            left_element.opacity != right_element.opacity ||
            left_element.text != right_element.text ||
            left_element.original_text != right_element.original_text ||
            left_element.font_size != right_element.font_size ||
            left_element.font_family != right_element.font_family ||
            left_element.text_align != right_element.text_align ||
            left_element.vertical_align != right_element.vertical_align ||
            left_element.auto_resize != right_element.auto_resize ||
            left_element.line_height != right_element.line_height ||
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
        delete(element.original_text)
        delete(element.points)
    }
    delete(doc.elements)
    doc.next_id = 1
    doc.next_group_id = 1
}

add :: proc(doc: ^document, kind: element_kind, x, y, width, height: f32, fill: color) -> int {
    id := doc.next_id
    doc.next_id += 1

    background := fill
    stroke: color = {0.12, 0.12, 0.12, 1.0}
    if kind == .line || kind == .arrow || kind == .freehand {
        background = {0, 0, 0, 0}
        stroke = fill
    }

    append(&doc.elements, element{
        id = id,
        group_id = 0,
        locked = false,
        kind = kind,
        x = x,
        y = y,
        width = width,
        height = height,
        angle = 0,
        fill = background,
        stroke = stroke,
        stroke_width = 2.0,
        opacity = 1.0,
        text = "",
        original_text = "",
        font_size = default_font_size,
        font_family = default_font_family,
        text_align = .left,
        vertical_align = .top,
        auto_resize = true,
        line_height = default_line_height,
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
    return add_text_styled(
        doc,
        x,
        y,
        text,
        fill,
        default_font_size,
        default_font_family,
        .left,
        .top,
        true,
        default_line_height,
    )
}

add_text_styled :: proc(
    doc: ^document,
    x, y: f32,
    text: string,
    fill: color,
    font_size: f32,
    font_family: i32,
    align: text_align,
    valign: vertical_align,
    auto_resize: bool,
    line_height: f32,
) -> int {
    normalized_font_size := font_size
    if normalized_font_size <= 0 {
        normalized_font_size = default_font_size
    }
    normalized_line_height := line_height
    if normalized_line_height <= 0 {
        normalized_line_height = default_line_height
    }
    width, height := text_dimensions(text, normalized_font_size, normalized_line_height)
    index := add(doc, .text, x, y, width, height, fill)
    doc.elements[index].text = strings.clone(text)
    doc.elements[index].original_text = strings.clone(text)
    doc.elements[index].stroke = fill
    doc.elements[index].font_size = normalized_font_size
    doc.elements[index].font_family = font_family
    doc.elements[index].text_align = align
    doc.elements[index].vertical_align = valign
    doc.elements[index].auto_resize = auto_resize
    doc.elements[index].line_height = normalized_line_height
    return index
}

add_freehand :: proc(doc: ^document, x, y: f32, fill: color) -> int {
    index := add(doc, .freehand, x, y, 0, 0, fill)
    append(&doc.elements[index].points, [2]f32{x, y})
    return index
}

duplicate :: proc(doc: ^document, index: int, delta_x, delta_y: f32) -> int {
    if index < 0 || index >= len(doc.elements) {
        return -1
    }

    return append_element_copy(doc, doc.elements[index], delta_x, delta_y)
}

append_element_copy :: proc(doc: ^document, source: element, delta_x, delta_y: f32) -> int {
    copy := source
    copy.id = doc.next_id
    doc.next_id += 1
    copy.x += delta_x
    copy.y += delta_y
    if source.text != "" {
        copy.text = strings.clone(source.text)
    }
    if source.original_text != "" {
        copy.original_text = strings.clone(source.original_text)
    }
    if len(source.points) > 0 {
        copy.points = make([dynamic][2]f32, 0)
        for point in source.points {
            append(&copy.points, [2]f32{point[0] + delta_x, point[1] + delta_y})
        }
    }
    append(&doc.elements, copy)
    return len(doc.elements) - 1
}

group :: proc(doc: ^document, indices: []int) -> u64 {
    if len(indices) == 0 {
        return 0
    }
    group_id := doc.next_group_id
    doc.next_group_id += 1
    for index in indices {
        if index >= 0 && index < len(doc.elements) {
            doc.elements[index].group_id = group_id
        }
    }
    return group_id
}

ungroup :: proc(doc: ^document, indices: []int) {
    for index in indices {
        if index >= 0 && index < len(doc.elements) {
            doc.elements[index].group_id = 0
        }
    }
}

set_locked :: proc(doc: ^document, indices: []int, locked: bool) {
    for index in indices {
        if index >= 0 && index < len(doc.elements) {
            doc.elements[index].locked = locked
        }
    }
}

swap_elements :: proc(doc: ^document, left, right: int) {
    if left < 0 || right < 0 || left >= len(doc.elements) || right >= len(doc.elements) || left == right {
        return
    }
    doc.elements[left], doc.elements[right] = doc.elements[right], doc.elements[left]
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
    if doc.elements[index].original_text == "" {
        doc.elements[index].original_text = strings.clone(text)
    }
    width, height := text_dimensions(
        text,
        doc.elements[index].font_size,
        doc.elements[index].line_height,
    )
    if doc.elements[index].auto_resize {
        doc.elements[index].width = width
    }
    doc.elements[index].height = height
}

text_dimensions :: proc(text: string, font_size: f32 = default_font_size, line_height: f32 = default_line_height) -> (width, height: f32) {
    normalized_font_size := font_size
    if normalized_font_size <= 0 {
        normalized_font_size = default_font_size
    }
    normalized_line_height := line_height
    if normalized_line_height <= 0 {
        normalized_line_height = default_line_height
    }
    current_width: f32 = 0
    max_width: f32 = 0
    lines := 1
    for character in text {
        if character == '\n' {
            max_width = max(max_width, current_width)
            current_width = 0
            lines += 1
        } else {
            current_width += approximate_character_width(character, normalized_font_size)
        }
    }
    max_width = max(max_width, current_width)
    width = max(normalized_font_size * 0.25, max_width)
    height = f32(lines) * normalized_font_size * normalized_line_height
    return
}

approximate_character_width :: proc(character: rune, font_size: f32) -> f32 {
    switch character {
    case ' ', '\t':
        return font_size * 0.3
    case 'i', 'j', 'l', 'I', '.', ',', ':', ';', '!', '|', '\'', '"':
        return font_size * 0.28
    case 'm', 'w', 'M', 'W', '@', '#', '%':
        return font_size * 0.8
    }
    return font_size * 0.5
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
    delete(doc.elements[index].original_text)
    delete(doc.elements[index].points)
    ordered_remove(&doc.elements, index)
}
