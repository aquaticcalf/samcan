package main

import "core:fmt"

import doc "../src/document"
import history_pkg "../src/history"

main :: proc() {
    history := history_pkg.new()
    defer history_pkg.destroy(&history)

    before := doc.new()
    defer doc.destroy(&before)

    after := doc.clone(&before)
    doc.add_ellipse(&after, 10, 20, 80, 40, {0.2, 0.4, 0.6, 1.0})
    history_pkg.record(&history, &before, &after)

    current := doc.clone(&after)
    doc.destroy(&after)
    assert(history_pkg.undo(&history, &current), "undo did not apply")
    assert(len(current.elements) == 0, "undo did not restore the previous document")
    assert(history_pkg.redo(&history, &current), "redo did not apply")
    assert(len(current.elements) == 1, "redo did not restore the edited document")
    assert(current.elements[0].kind == .ellipse, "redo restored the wrong element kind")
    doc.destroy(&current)

    fmt.println("history smoke passed")
}
