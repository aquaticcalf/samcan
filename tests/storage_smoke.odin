package main

import "core:fmt"
import "core:os"

import document "../src/document"
import storage "../src/storage"

main :: proc() {
    path := "build/storage-smoke.excalidraw"

    original := document.new()
    defer document.destroy(&original)
    document.add_rectangle(&original, -40, -20, 120, 80, {0.25, 0.50, 0.75, 1.0})
    document.add_ellipse(&original, 10, 20, 80, 40, {0.75, 0.50, 0.25, 1.0})
    document.add_diamond(&original, 30, 40, 60, 60, {0.25, 0.75, 0.50, 1.0})
    document.add_line(&original, -80, 60, 120, 50, {0.50, 0.25, 0.75, 1.0})
    document.add_arrow(&original, -100, -80, 140, 30, {0.75, 0.25, 0.50, 1.0})
    text_index := document.add_text_styled(
        &original,
        5,
        10,
        "hello",
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

    assert(storage.save(path, &original), "could not save storage smoke fixture")

    loaded, ok := storage.load(path)
    assert(ok, "could not load storage smoke fixture")
    defer document.destroy(&loaded)

    assert(len(loaded.elements) == 7, "element count did not round-trip")
    rect := loaded.elements[0]
    assert(rect.kind == .rectangle, "rectangle kind did not round-trip")
    assert(rect.x == -40, "rectangle x did not round-trip")
    assert(rect.y == -20, "rectangle y did not round-trip")
    assert(rect.width == 120, "rectangle width did not round-trip")
    assert(rect.height == 80, "rectangle height did not round-trip")
    assert(rect.fill[0] > 0.24 && rect.fill[0] < 0.26, "rectangle color did not round-trip")
    assert(loaded.elements[1].kind == .ellipse, "ellipse kind did not round-trip")
    assert(loaded.elements[2].kind == .diamond, "diamond kind did not round-trip")
    assert(loaded.elements[3].kind == .line, "line kind did not round-trip")
    assert(loaded.elements[4].kind == .arrow, "arrow kind did not round-trip")
    assert(loaded.elements[5].kind == .text, "text kind did not round-trip")
    assert(loaded.elements[5].text == "hello", "text content did not round-trip")
    assert(loaded.elements[5].original_text == "hello", "original text did not round-trip")
    assert(loaded.elements[5].font_size == 28, "font size did not round-trip")
    assert(loaded.elements[5].font_family == 5, "font family did not round-trip")
    assert(loaded.elements[5].text_align == .center, "text alignment did not round-trip")
    assert(loaded.elements[5].vertical_align == .middle, "vertical alignment did not round-trip")
    assert(!loaded.elements[5].auto_resize, "text auto resize did not round-trip")
    assert(loaded.elements[5].width == 180, "fixed text width did not round-trip")
    assert(loaded.elements[6].kind == .freehand, "freehand kind did not round-trip")
    assert(len(loaded.elements[6].points) == 3, "freehand points did not round-trip")

    _ = os.remove(path)
    fmt.println("storage smoke passed")
}
