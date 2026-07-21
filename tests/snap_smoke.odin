package main

import "core:fmt"

import document "../src/document"
import editor "../src/editor"
import platform "../src/platform"

main :: proc() {
    state := editor.new(800, 600)
    defer editor.destroy(&state)

    input: platform.frame_input
    input.toggle_snap_requested = true
    editor.update(&state, &input)
    assert(state.snap_to_grid, "snap toggle did not enable grid snapping")

    input = {}
    input.tool_rectangle_requested = true
    editor.update(&state, &input)
    input = {}
    input.mouse = {413, 317}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    editor.update(&state, &input)
    input = {}
    input.mouse = {463, 367}
    input.released[platform.MOUSE_BUTTON_LEFT] = true
    editor.update(&state, &input)
    assert(len(state.document.elements) == 1, "snapped rectangle was not created")
    snapped := state.document.elements[0]
    assert(snapped.x == 20 && snapped.y == 20, "rectangle start did not snap to the grid")
    assert(snapped.width == 40 && snapped.height == 40, "rectangle size did not snap to the grid")

    document.add_rectangle(&state.document, 100, 100, 40, 40, {0.3, 0.5, 0.7, 1.0})
    input = {}
    input.tool_arrow_requested = true
    editor.update(&state, &input)
    input = {}
    input.mouse = {495, 420}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    editor.update(&state, &input)
    input = {}
    input.mouse = {543, 435}
    input.released[platform.MOUSE_BUTTON_LEFT] = true
    editor.update(&state, &input)
    assert(len(state.document.elements) == 3, "snapped arrow was not created")
    arrow := state.document.elements[2]
    assert(arrow.kind == .arrow, "object snapping created the wrong element")
    assert(arrow.x == 100 && arrow.y == 120, "arrow start did not snap to the shape midpoint")
    assert(arrow.width == 40 && arrow.height == 20, "arrow end did not snap to the shape corner")

    fmt.println("snap smoke passed")
}
