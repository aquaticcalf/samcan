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
    input.toggle_grid_requested = true
    editor_pkg.update(&editor, &input)
    assert(editor.show_grid, "grid shortcut did not enable the grid")

    input = {}
    input.zoom_to_content_requested = true
    editor_pkg.update(&editor, &input)
    assert(editor.viewport.zoom > 1.0, "fit content did not zoom in")
    input = {}
    input.zoom_reset_requested = true
    editor_pkg.update(&editor, &input)
    assert(editor.viewport.zoom == 1.0, "zoom reset did not restore 100 percent")

    input = {}
    input.toggle_theme_requested = true
    editor_pkg.update(&editor, &input)
    assert(editor.dark_mode, "theme toggle did not enable dark mode")
    input = {}
    input.toggle_theme_requested = true
    editor_pkg.update(&editor, &input)
    assert(!editor.dark_mode, "theme toggle did not restore light mode")

    input = {}
    input.mouse = {722, 20}
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)
    assert(input.export_png_requested, "png export toolbar button did not request export")

    input = {}
    input.mouse = {400, 300}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)
    assert(editor.selected == 0, "selection did not hit the rectangle")

    input = {}
    input.mouse = {90, 540}
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)
    assert(editor.document.elements[0].fill[0] > 0.89, "fill property swatch did not update the selection")

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
    assert(editor_pkg.hit_test(&editor.document, {55, 35}) == 2, "text hit test did not find existing text")

    input = {}
    input.mouse = {455, 335}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    input.double_click = true
    editor_pkg.update(&editor, &input)
    assert(editor.text_editing && editor.text_index == 2, "text tool did not reopen existing text")
    input = {}
    input.text_input = "!"
    editor_pkg.update(&editor, &input)
    input = {}
    input.escape_requested = true
    editor_pkg.update(&editor, &input)
    assert(editor.document.elements[2].text == "hell\n!", "reopened text did not accept input")

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

    clear(&editor.selected_items)
    append(&editor.selected_items, 2)
    editor.selected = 2
    copied_text := editor_pkg.selected_text(&editor)
    assert(copied_text == "hell\n!", "selected text did not reach the clipboard adapter")
    delete(copied_text)
    assert(editor_pkg.paste_text(&editor, "pasted"), "external text paste did not create an element")
    assert(editor.document.elements[4].text == "pasted", "external text paste content was wrong")

    input = {}
    input.tool_eraser_requested = true
    input.mouse = {400, 300}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)
    input = {}
    input.mouse = {400, 300}
    input.released[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)
    assert(len(editor.document.elements) == 4, "eraser did not remove the topmost element")

    fmt.println("editor smoke passed")
}
