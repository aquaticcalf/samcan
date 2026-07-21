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

    assert(storage.save(path, &original), "could not save storage smoke fixture")

    loaded, ok := storage.load(path)
    assert(ok, "could not load storage smoke fixture")
    defer document.destroy(&loaded)

    assert(len(loaded.rectangles) == 1, "rectangle count did not round-trip")
    rect := loaded.rectangles[0]
    assert(rect.x == -40, "rectangle x did not round-trip")
    assert(rect.y == -20, "rectangle y did not round-trip")
    assert(rect.width == 120, "rectangle width did not round-trip")
    assert(rect.height == 80, "rectangle height did not round-trip")
    assert(rect.fill[0] > 0.24 && rect.fill[0] < 0.26, "rectangle color did not round-trip")

    _ = os.remove(path)
    fmt.println("storage smoke passed")
}
