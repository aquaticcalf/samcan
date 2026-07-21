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
    input.mouse = {55, 20}
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)
    assert(!editor.select_mode && editor.active_kind == .rectangle, "toolbar rectangle button did not activate")

    input = {}
    input.mouse = {20, 20}
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)
    assert(editor.select_mode, "toolbar select button did not activate")

    input = {}
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

    input = {}
    input.tool_rectangle_requested = true
    input.mouse = {500, 350}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)

    input = {}
    input.mouse = {400, 300}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)

    input = {}
    input.mouse = {400, 300}
    input.released[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)
    reverse := editor.document.elements[1]
    assert(reverse.x == 0, "right-to-left draw did not preserve the left edge")
    assert(reverse.y == 0, "right-to-left draw did not preserve the top edge")
    assert(reverse.width == 100, "right-to-left draw did not preserve width")
    assert(reverse.height == 50, "right-to-left draw did not preserve height")

    input = {}
    input.tool_text_requested = true
    editor_pkg.update(&editor, &input)

    input = {}
    input.mouse = {450, 330}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)
    assert(editor.text_editing, "text tool did not enter editing mode")

    input = {}
    input.text_input = "hello"
    editor_pkg.update(&editor, &input)
    input = {}
    input.backspace_requested = true
    editor_pkg.update(&editor, &input)
    assert(editor.document.elements[editor.text_index].text == "hell", "text backspace did not remove the last rune")

    input = {}
    input.enter_requested = true
    editor_pkg.update(&editor, &input)
    assert(editor.text_editing, "text tool did not keep editing after a newline")
    assert(editor.document.elements[editor.text_index].text == "hell\n", "text tool did not insert a newline")

    input = {}
    input.escape_requested = true
    editor_pkg.update(&editor, &input)
    assert(!editor.text_editing, "text tool did not finish editing")
    assert(editor.document.elements[2].text == "hell\n", "text content did not persist")

    input = {}
    input.tool_freehand_requested = true
    editor_pkg.update(&editor, &input)

    input = {}
    input.mouse = {450, 330}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)

    input = {}
    input.mouse = {460, 340}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)
    input = {}
    input.mouse = {470, 320}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)

    input = {}
    input.mouse = {470, 320}
    input.released[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)
    assert(editor.document.elements[3].kind == .freehand, "freehand tool did not create a path")
    assert(len(editor.document.elements[3].points) == 3, "freehand tool did not keep the drawn points")

    fmt.println("editor smoke passed")
}
