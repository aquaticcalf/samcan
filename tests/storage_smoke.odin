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
    document.add_text(&original, 5, 10, "hello", {0.12, 0.12, 0.12, 1.0})

    assert(storage.save(path, &original), "could not save storage smoke fixture")

    loaded, ok := storage.load(path)
    assert(ok, "could not load storage smoke fixture")
    defer document.destroy(&loaded)

    assert(len(loaded.elements) == 6, "element count did not round-trip")
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

    _ = os.remove(path)
    fmt.println("storage smoke passed")
}
