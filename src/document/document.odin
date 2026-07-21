package document

color :: [4]f32

rectangle :: struct {
    id:     u64,
    x:      f32,
    y:      f32,
    width:  f32,
    height: f32,
    fill:   color,
}

document :: struct {
    rectangles: [dynamic]rectangle,
    next_id:    u64,
}

new :: proc() -> document {
    return document{
        rectangles = make([dynamic]rectangle, 0),
        next_id = 1,
    }
}

destroy :: proc(doc: ^document) {
    delete(doc.rectangles)
    doc.next_id = 1
}

add_rectangle :: proc(doc: ^document, x, y, width, height: f32, fill: color) -> int {
    id := doc.next_id
    doc.next_id += 1

    append(&doc.rectangles, rectangle{
        id = id,
        x = x,
        y = y,
        width = width,
        height = height,
        fill = fill,
    })
    return len(doc.rectangles) - 1
}

set_rectangle_bounds :: proc(doc: ^document, index: int, x, y, width, height: f32) {
    if index < 0 || index >= len(doc.rectangles) {
        return
    }
    doc.rectangles[index].x = x
    doc.rectangles[index].y = y
    doc.rectangles[index].width = width
    doc.rectangles[index].height = height
}

remove_rectangle :: proc(doc: ^document, index: int) {
    if index < 0 || index >= len(doc.rectangles) {
        return
    }
    ordered_remove(&doc.rectangles, index)
}
