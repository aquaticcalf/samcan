package main

import "core:fmt"

import doc "../src/document"
import editor_pkg "../src/editor"
import platform "../src/platform"

main :: proc() {
    editor := editor_pkg.new(800, 600)
    defer editor_pkg.destroy(&editor)
    doc.add_diamond(&editor.document, -30, -20, 60, 40, {0.4, 0.5, 0.6, 1.0})

    editor.selected = 0
    input: platform.frame_input
    input.duplicate_requested = true
    editor_pkg.update(&editor, &input)
    assert(len(editor.document.elements) == 2, "duplicate did not create an element")
    assert(editor.selected == 1, "duplicate did not select the new element")
    assert(editor.document.elements[1].kind == .diamond, "duplicate changed the element kind")
    assert(editor.document.elements[1].x == -10, "duplicate did not offset x")

    input = {}
    input.delete_requested = true
    editor_pkg.update(&editor, &input)
    assert(len(editor.document.elements) == 1, "delete did not remove the selected element")
    assert(editor.selected == -1, "delete did not clear selection")

    input = {}
    input.undo_requested = true
    editor_pkg.update(&editor, &input)
    assert(len(editor.document.elements) == 2, "undo did not restore the deleted element")

    fmt.println("commands smoke passed")
}
