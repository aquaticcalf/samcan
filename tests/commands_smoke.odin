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

    doc.add_rectangle(&editor.document, 30, 30, 20, 20, {0.1, 0.2, 0.3, 1.0})
    editor.selected = 1
    input = {}
    input.bring_forward_requested = true
    editor_pkg.update(&editor, &input)
    assert(editor.selected == 2, "bring forward did not update the selected index")
    assert(editor.document.elements[2].x == -10, "bring forward did not preserve element data")

    input = {}
    input.send_to_back_requested = true
    editor_pkg.update(&editor, &input)
    assert(editor.selected == 0, "send to back did not update the selected index")
    assert(editor.document.elements[0].x == -10, "send to back did not move the selected element")

    input = {}
    input.undo_requested = true
    editor_pkg.update(&editor, &input)
    assert(editor.document.elements[2].x == -10, "z-order undo did not restore the element order")

    input = {}
    input.copy_requested = true
    editor_pkg.update(&editor, &input)
    assert(len(editor.clipboard.elements) == 1, "copy did not capture the selected element")

    input = {}
    input.paste_requested = true
    editor_pkg.update(&editor, &input)
    assert(len(editor.document.elements) == 4, "paste did not create a copied element")
    assert(editor.document.elements[3].x == -10, "paste did not offset the copied element")

    input = {}
    input.cut_requested = true
    editor_pkg.update(&editor, &input)
    assert(len(editor.document.elements) == 3, "cut did not remove the pasted element")
    assert(len(editor.clipboard.elements) == 1, "cut did not retain clipboard data")

    doc.add_rectangle(&editor.document, 100, 100, 20, 20, {0.1, 0.1, 0.1, 1.0})
    doc.add_ellipse(&editor.document, 140, 100, 20, 20, {0.2, 0.2, 0.2, 1.0})
    editor.selected_items = make([dynamic]int, 0)
    append(&editor.selected_items, 3)
    append(&editor.selected_items, 4)
    editor.selected = 4
    input = {}
    input.group_requested = true
    editor_pkg.update(&editor, &input)
    assert(editor.document.elements[3].group_id != 0, "group did not assign a group id")
    assert(editor.document.elements[3].group_id == editor.document.elements[4].group_id, "group did not join both elements")

    editor.selected = -1
    clear(&editor.selected_items)
    input = {}
    input.mouse = {510, 410}
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    editor_pkg.update(&editor, &input)
    assert(len(editor.selected_items) == 2, "clicking a group did not select the whole group")

    input = {}
    input.ungroup_requested = true
    editor_pkg.update(&editor, &input)
    assert(editor.document.elements[3].group_id == 0, "ungroup did not clear the group id")

    fmt.println("commands smoke passed")
}
