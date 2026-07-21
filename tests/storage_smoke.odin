package main

import "core:fmt"
import "core:os"
import "core:strings"

import document "../src/document"
import storage "../src/storage"

main :: proc() {
    path := "build/storage-smoke.excalidraw"

    original := document.new()
    defer document.destroy(&original)
    document.add_rectangle(&original, -40, -20, 120, 80, {0.25, 0.50, 0.75, 1.0})
    original.elements[0].stroke = {0.9, 0.1, 0.2, 1.0}
    original.elements[0].stroke_width = 4
    original.elements[0].opacity = 0.5
    original.elements[0].stroke_style = .dashed
    document.add_ellipse(&original, 10, 20, 80, 40, {0.75, 0.50, 0.25, 1.0})
    original.elements[1].fill_style = .none
    document.add_diamond(&original, 30, 40, 60, 60, {0.25, 0.75, 0.50, 1.0})
    original.elements[2].locked = true
    original.elements[2].angle = 0.5
    document.add_line(&original, -80, 60, 120, 50, {0.50, 0.25, 0.75, 1.0})
    document.add_arrow(&original, -100, -80, 140, 30, {0.75, 0.25, 0.50, 1.0})
    group_indices := [?]int{0, 1}
    group_id := document.group(&original, group_indices[:])
    text_index := document.add_text_styled(
        &original,
        5,
        10,
        "hello & <",
        {0.12, 0.12, 0.12, 1.0},
        28,
        5,
        .center,
        .middle,
        false,
        1.25,
    )
    original.elements[text_index].width = 180
    freehand := document.add_freehand(&original, -10, -10, {0.3, 0.3, 0.3, 1.0})
    document.append_point(&original, freehand, {-5, 0})
    document.append_point(&original, freehand, {10, -5})
    image_id := "image-1"
    original.images[image_id] = document.image_asset{
        mime_type = strings.clone("image/png"),
        data_url = strings.clone("data:image/png;base64,abcd"),
    }
    image_index := document.add_image(&original, 140, 80, 160, 120, image_id)
    assert(image_index == 7, "image index was unexpected")

    assert(storage.save(path, &original), "could not save storage smoke fixture")
    scene_data, scene_error := os.read_entire_file(path, context.allocator)
    assert(scene_error == nil, "could not read scene smoke fixture")
    assert(!strings.contains(string(scene_data), "\"id\": \"\""), "scene contained empty placeholder elements")
    delete(scene_data)

    svg_path := "build/storage-smoke.svg"
    assert(storage.save_svg(svg_path, &original), "could not save svg smoke fixture")
    svg_data, svg_error := os.read_entire_file(svg_path, context.allocator)
    assert(svg_error == nil, "could not read svg smoke fixture")
    assert(len(svg_data) > 0, "svg smoke fixture was empty")
    assert(strings.contains(string(svg_data), "<svg"), "svg fixture did not contain a root element")
    assert(strings.contains(string(svg_data), "&amp;"), "svg text was not escaped")
    delete(svg_data)

    loaded, ok := storage.load(path)
    assert(ok, "could not load storage smoke fixture")
    defer document.destroy(&loaded)

    assert(len(loaded.elements) == 8, "element count did not round-trip")
    rect := loaded.elements[0]
    assert(rect.kind == .rectangle, "rectangle kind did not round-trip")
    assert(rect.x == -40, "rectangle x did not round-trip")
    assert(rect.y == -20, "rectangle y did not round-trip")
    assert(rect.width == 120, "rectangle width did not round-trip")
    assert(rect.height == 80, "rectangle height did not round-trip")
    assert(rect.fill[0] > 0.24 && rect.fill[0] < 0.26, "rectangle color did not round-trip")
    assert(rect.stroke[0] > 0.89 && rect.stroke[0] < 0.91, "stroke color did not round-trip")
    assert(rect.stroke_width == 4, "stroke width did not round-trip")
    assert(rect.opacity > 0.49 && rect.opacity < 0.51, "opacity did not round-trip")
    assert(rect.stroke_style == .dashed, "stroke style did not round-trip")
    assert(loaded.elements[1].fill_style == .none, "fill style did not round-trip")
    assert(loaded.elements[1].kind == .ellipse, "ellipse kind did not round-trip")
    assert(loaded.elements[0].group_id == group_id, "group id did not round-trip")
    assert(loaded.elements[1].group_id == group_id, "group membership did not round-trip")
    assert(loaded.elements[2].kind == .diamond, "diamond kind did not round-trip")
    assert(loaded.elements[2].locked, "locked state did not round-trip")
    assert(loaded.elements[2].angle == 0.5, "angle did not round-trip")
    assert(loaded.elements[3].kind == .line, "line kind did not round-trip")
    assert(loaded.elements[4].kind == .arrow, "arrow kind did not round-trip")
    assert(loaded.elements[5].kind == .text, "text kind did not round-trip")
    assert(loaded.elements[5].text == "hello & <", "text content did not round-trip")
    assert(loaded.elements[5].original_text == "hello & <", "original text did not round-trip")
    assert(loaded.elements[5].font_size == 28, "font size did not round-trip")
    assert(loaded.elements[5].font_family == 5, "font family did not round-trip")
    assert(loaded.elements[5].text_align == .center, "text alignment did not round-trip")
    assert(loaded.elements[5].vertical_align == .middle, "vertical alignment did not round-trip")
    assert(!loaded.elements[5].auto_resize, "text auto resize did not round-trip")
    assert(loaded.elements[5].width == 180, "fixed text width did not round-trip")
    assert(loaded.elements[6].kind == .freehand, "freehand kind did not round-trip")
    assert(len(loaded.elements[6].points) == 3, "freehand points did not round-trip")
    assert(loaded.elements[7].kind == .image, "image kind did not round-trip")
    assert(loaded.elements[7].image_id == image_id, "image id did not round-trip")
    assert(len(loaded.images) == 1, "image file did not round-trip")
    loaded_image, image_found := loaded.images[image_id]
    assert(image_found, "image asset was missing")
    assert(loaded_image.mime_type == "image/png", "image mime type did not round-trip")
    assert(loaded_image.data_url == "data:image/png;base64,abcd", "image data did not round-trip")
    _ = os.remove(path)
    _ = os.remove(svg_path)
    fmt.println("storage smoke passed")
}
