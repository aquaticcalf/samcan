package main

import "core:fmt"

import doc "../src/document"
import editor_pkg "../src/editor"
import platform "../src/platform"

main :: proc() {
    editor := editor_pkg.new(800, 600)
    defer editor_pkg.destroy(&editor)
    doc.add_rectangle(&editor.document, -100, -50, 40, 40, {0.2, 0.3, 0.4, 1.0})
    doc.add_ellipse(&editor.document, 0, -50, 40, 40, {0.4, 0.3, 0.2, 1.0})
    doc.add_diamond(&editor.document, 100, -50, 40, 40, {0.3, 0.4, 0.2, 1.0})

    input: platform.frame_input
    input.mouse = {280, 230}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)
    input = {}
    input.mouse = {450, 300}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)
    input = {}
    input.mouse = {450, 300}
    input.released[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)
    assert(len(editor.selected_items) == 2, "left-to-right lasso did not contain both elements")

    input = {}
    input.select_all_requested = true
    editor_pkg.update(&editor, &input)
    assert(len(editor.selected_items) == 3, "select all did not select every element")

    input = {}
    input.duplicate_requested = true
    editor_pkg.update(&editor, &input)
    assert(len(editor.document.elements) == 6, "multi-duplicate did not copy every element")
    assert(len(editor.selected_items) == 3, "multi-duplicate did not select every copy")

    input = {}
    input.delete_requested = true
    editor_pkg.update(&editor, &input)
    assert(len(editor.document.elements) == 3, "multi-delete did not remove every selected element")

    input = {}
    input.undo_requested = true
    editor_pkg.update(&editor, &input)
    assert(len(editor.document.elements) == 6, "undo did not restore the multi-delete")

    fmt.println("multiselect smoke passed")
}
