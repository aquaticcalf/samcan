package main

import "core:fmt"
import "core:os"

import document "../src/document"
import storage "../src/storage"

main :: proc() {
    fixture_path := "temp/excalidraw/packages/excalidraw/tests/fixtures/fixture_library.excalidrawlib"
    legacy_items, legacy_ok := storage.load_library(fixture_path)
    assert(legacy_ok, "could not load the reference library fixture")
    assert(len(legacy_items) == 1, "legacy library item count was unexpected")
    assert(len(legacy_items[0].elements) == 1, "legacy library element count was unexpected")
    assert(legacy_items[0].elements[0].type == "rectangle", "legacy library element type was unexpected")
    assert(legacy_items[0].elements[0].backgroundColor == "#e64980", "legacy library fill did not load")
    storage.destroy_library_items(&legacy_items)

    source := document.new()
    defer document.destroy(&source)
    rectangle := document.add_rectangle(&source, 10, 20, 120, 80, {0.25, 0.50, 0.75, 1.0})
    source.elements[rectangle].stroke_width = 4
    item := storage.library_item_from_document(&source, "test item")
    defer storage.destroy_library_item(&item)

    path := "build/library-smoke.excalidrawlib"
    items := [1]storage.library_item{item}
    assert(storage.save_library(path, items[:]), "could not save a library file")
    saved_items, saved_ok := storage.load_library(path)
    assert(saved_ok, "could not load the saved library file")
    assert(len(saved_items) == 1, "saved library item count was unexpected")
    assert(saved_items[0].name == "test item", "saved library item name was unexpected")
    assert(saved_items[0].elements[0].type == "rectangle", "saved library element type was unexpected")
    assert(saved_items[0].elements[0].strokeWidth == 4, "saved library stroke width was unexpected")

    inserted := document.new()
    defer document.destroy(&inserted)
    assert(storage.insert_library_item(&inserted, saved_items[0], 100, 120), "could not insert a library item")
    assert(len(inserted.elements) == 1, "inserted library element count was unexpected")
    assert(inserted.elements[0].x == 40, "inserted library x was not centered")
    assert(inserted.elements[0].y == 80, "inserted library y was not centered")
    storage.destroy_library_items(&saved_items)
    _ = os.remove(path)

    fmt.println("library smoke passed")
}
