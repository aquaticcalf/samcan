package main

import "core:fmt"
import "core:os"
import "core:strings"

import document "../src/document"
import editor "../src/editor"
import platform "../src/platform"
import renderer "../src/renderer"

capture_state :: struct {
    window:   platform.window,
    editor:   editor.state,
    renderer: renderer.renderer,
    output:   string,
    frame:    int,
    manifest: strings.Builder,
}

main :: proc() {
    output := "build/visual-test"
    if len(os.args) > 1 && os.args[1] != "" {
        output = os.args[1]
    }
    if err := os.make_directory_all(output); err != nil {
        fmt.eprintf("could not create visual output folder: %s\n", err)
        return
    }

    window, window_ok := platform.open("samcan visual test", 1280, 800)
    if !window_ok {
        return
    }
    defer platform.close(&window)

    state := capture_state{
        window = window,
        editor = editor.new(f32(window.width), f32(window.height)),
        output = output,
    }
    defer editor.destroy(&state.editor)

    canvas_renderer, renderer_ok := renderer.open()
    if !renderer_ok {
        return
    }
    state.renderer = canvas_renderer
    defer renderer.destroy(&state.renderer)
    state.manifest, _ = strings.builder_make()
    defer strings.builder_destroy(&state.manifest)

    capture(&state, {}, "empty canvas")

    input: platform.frame_input
    input.tool_rectangle_requested = true
    capture(&state, input, "rectangle tool")
    input = {}
    input.mouse = {260, 220}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    capture(&state, input, "rectangle start")
    input = {}
    input.mouse = {520, 390}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    capture(&state, input, "rectangle drag")
    input = {}
    input.mouse = {520, 390}
    input.released[platform.MOUSE_BUTTON_LEFT] = true
    capture(&state, input, "rectangle finished")

    input = {}
    input.tool_ellipse_requested = true
    capture(&state, input, "ellipse tool")
    input = {}
    input.mouse = {580, 220}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    capture(&state, input, "ellipse start")
    input = {}
    input.mouse = {780, 360}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    capture(&state, input, "ellipse drag")
    input = {}
    input.mouse = {780, 360}
    input.released[platform.MOUSE_BUTTON_LEFT] = true
    capture(&state, input, "ellipse finished")

    input = {}
    input.tool_diamond_requested = true
    capture(&state, input, "diamond tool")
    input = {}
    input.mouse = {760, 440}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    capture(&state, input, "diamond start")
    input = {}
    input.mouse = {980, 610}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    capture(&state, input, "diamond drag")
    input = {}
    input.mouse = {980, 610}
    input.released[platform.MOUSE_BUTTON_LEFT] = true
    capture(&state, input, "diamond finished")

    input = {}
    input.tool_arrow_requested = true
    capture(&state, input, "arrow tool")
    input = {}
    input.mouse = {520, 305}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    capture(&state, input, "arrow start")
    input = {}
    input.mouse = {780, 290}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    capture(&state, input, "arrow drag")
    input = {}
    input.mouse = {780, 290}
    input.released[platform.MOUSE_BUTTON_LEFT] = true
    capture(&state, input, "arrow finished")

    input = {}
    input.tool_text_requested = true
    capture(&state, input, "text tool")
    input = {}
    input.mouse = {300, 125}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    capture(&state, input, "text editing")
    input = {}
    input.text_input = "native text\nvisual test"
    capture(&state, input, "multiline text")
    input = {}
    input.escape_requested = true
    capture(&state, input, "text committed")

    input = {}
    input.tool_freehand_requested = true
    capture(&state, input, "freehand tool")
    input = {}
    input.mouse = {280, 540}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    capture(&state, input, "freehand start")
    points := [4][2]f32{
        {340, 480},
        {410, 560},
        {480, 490},
        {540, 540},
    }
    for point in points {
        input = {}
        input.mouse = point
        input.buttons[platform.MOUSE_BUTTON_LEFT] = true
        capture(&state, input, "freehand stroke")
    }
    input = {}
    input.mouse = {540, 540}
    input.released[platform.MOUSE_BUTTON_LEFT] = true
    capture(&state, input, "freehand finished")

    input = {}
    input.select_all_requested = true
    capture(&state, input, "select all")
    input = {}
    input.toggle_theme_requested = true
    capture(&state, input, "dark theme")
    input = {}
    input.toggle_grid_requested = true
    input.toggle_snap_requested = true
    capture(&state, input, "dark grid and snap")

    library_path := "temp/excalidraw/packages/excalidraw/tests/fixtures/fixture_library.excalidrawlib"
    if editor.load_library(&state.editor, library_path) {
        input = {}
        capture(&state, input, "library panel")
        input = {}
        input.mouse = {1110, 120}
        input.pressed[platform.MOUSE_BUTTON_LEFT] = true
        capture(&state, input, "library insertion")
    }

    manifest_data := strings.to_string(state.manifest)
    defer delete(manifest_data)
    manifest_path := fmt.tprintf("%s/manifest.txt", output)
    _ = os.write_entire_file_from_string(manifest_path, manifest_data)
    fmt.printf("visual frames written to %s\n", output)
}

capture :: proc(state: ^capture_state, input: platform.frame_input, label: string) {
    local_input := input
    editor.update(&state.editor, &local_input)
    platform.begin_frame(&state.window, state.editor.dark_mode)
    renderer.draw(
        &state.renderer,
        &state.editor.document,
        state.editor.viewport,
        state.editor.selected,
        state.editor.selected_items[:],
        state.editor.lassoing,
        state.editor.lasso_start,
        state.editor.lasso_current,
        state.editor.select_mode,
        state.editor.active_kind,
        state.editor.show_grid,
        state.editor.dark_mode,
        state.editor.erasing,
        state.editor.library_open,
        len(state.editor.library_items),
    )
    frame_path := fmt.tprintf("%s/frame-%04d.png", state.output, state.frame)
    if !renderer.save_png(frame_path, state.window.width, state.window.height) {
        fmt.eprintf("could not write %s\n", frame_path)
    }
    fmt.sbprintf(&state.manifest, "%04d %s\n", state.frame, label)
    platform.end_frame(&state.window)
    state.frame += 1
}
