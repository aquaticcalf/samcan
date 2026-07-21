package main

import "core:fmt"

import doc "../src/document"
import editor_pkg "../src/editor"
import platform "../src/platform"

main :: proc() {
    editor := editor_pkg.new(800, 600)
    defer editor_pkg.destroy(&editor)
    doc.add_rectangle(&editor.document, -50, -40, 100, 80, {0.2, 0.4, 0.6, 1.0})

    input: platform.frame_input
    input.mouse = {400, 300}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)
    assert(editor.selected == 0, "selection did not hit the rectangle")

    input = {}
    input.mouse = {420, 320}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)

    input = {}
    input.mouse = {420, 320}
    input.released[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)
    assert(editor.document.elements[0].x == -30, "move did not update x")
    assert(editor.document.elements[0].y == -20, "move did not update y")

    input = {}
    input.undo_requested = true
    editor_pkg.update(&editor, &input)
    assert(editor.document.elements[0].x == -50, "undo did not restore x")
    assert(editor.document.elements[0].y == -40, "undo did not restore y")

    input = {}
    input.redo_requested = true
    editor_pkg.update(&editor, &input)
    assert(editor.document.elements[0].x == -30, "redo did not restore x")
    assert(editor.document.elements[0].y == -20, "redo did not restore y")

    fmt.println("editor smoke passed")
}
