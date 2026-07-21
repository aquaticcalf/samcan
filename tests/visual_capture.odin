package main

import base64 "core:encoding/base64"
import "core:fmt"
import "core:os"
import "core:strings"

import document "../src/document"
import editor "../src/editor"
import platform "../src/platform"
import renderer "../src/renderer"
import storage "../src/storage"
import viewport "../src/viewport"

screen_pair :: struct {
    start:  [2]f32,
    finish: [2]f32,
}

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
        input.mouse = {1110, 180}
        input.pressed[platform.MOUSE_BUTTON_LEFT] = true
        capture(&state, input, "library insertion")
    }

    run_directional_matrix(&state)
    reset_for_lesson(&state)
    run_lesson_board(&state)

    manifest_data := strings.to_string(state.manifest)
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

run_directional_matrix :: proc(state: ^capture_state) {
    pairs := [4]screen_pair{
        {{120, 120}, {340, 240}},
        {{340, 300}, {120, 190}},
        {{220, 430}, {460, 350}},
        {{500, 520}, {280, 650}},
    }
    kinds := [5]document.element_kind{.rectangle, .ellipse, .diamond, .line, .arrow}
    names := [?]string{"rectangle", "ellipse", "diamond", "line", "arrow"}
    for kind_index in 0 ..< len(kinds) {
        for direction in 0 ..< len(pairs) {
            draw_tool(
                state,
                kinds[kind_index],
                pairs[direction],
                fmt.tprintf("%s direction %d", names[kind_index], direction + 1),
            )
        }
    }
    draw_freehand_path(
        state,
        [5][2]f32{{160, 680}, {220, 610}, {280, 680}, {340, 610}, {400, 680}},
        "freehand zigzag left to right",
    )
    draw_freehand_path(
        state,
        [5][2]f32{{600, 680}, {540, 610}, {480, 680}, {420, 610}, {360, 680}},
        "freehand zigzag right to left",
    )

    input: platform.frame_input
    input.select_all_requested = true
    capture(state, input, "direction matrix selected")
    input = {}
    input.undo_requested = true
    capture(state, input, "direction matrix undo")
    input = {}
    input.redo_requested = true
    capture(state, input, "direction matrix redo")
}

draw_tool :: proc(state: ^capture_state, kind: document.element_kind, pair: screen_pair, label: string) {
    input := tool_request(kind)
    capture(state, input, visual_label(label, "tool"))

    input = {}
    input.mouse = pair.start
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    capture(state, input, visual_label(label, "start"))

    input = {}
    input.mouse = pair.finish
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    capture(state, input, visual_label(label, "drag"))

    input = {}
    input.mouse = pair.finish
    input.released[platform.MOUSE_BUTTON_LEFT] = true
    capture(state, input, visual_label(label, "finished"))
}

tool_request :: proc(kind: document.element_kind) -> platform.frame_input {
    input: platform.frame_input
    switch kind {
    case .rectangle:
        input.tool_rectangle_requested = true
    case .ellipse:
        input.tool_ellipse_requested = true
    case .diamond:
        input.tool_diamond_requested = true
    case .line:
        input.tool_line_requested = true
    case .arrow:
        input.tool_arrow_requested = true
    case .frame:
        input.tool_frame_requested = true
    case .text, .freehand, .image:
        // these tools have dedicated visual helpers
    }
    return input
}

draw_freehand_path :: proc(state: ^capture_state, points: [5][2]f32, label: string) {
    input: platform.frame_input
    input.tool_freehand_requested = true
    capture(state, input, visual_label(label, "tool"))
    input = {}
    input.mouse = points[0]
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    capture(state, input, visual_label(label, "start"))
    for point_index in 1 ..< len(points) {
        point := points[point_index]
        input = {}
        input.mouse = point
        input.buttons[platform.MOUSE_BUTTON_LEFT] = true
        capture(state, input, visual_label(label, "drag"))
    }
    input = {}
    input.mouse = points[len(points) - 1]
    input.released[platform.MOUSE_BUTTON_LEFT] = true
    capture(state, input, visual_label(label, "finished"))
}

visual_label :: proc(base, suffix: string) -> string {
    return fmt.tprintf("%s %s", base, suffix)
}

reset_for_lesson :: proc(state: ^capture_state) {
    editor.destroy(&state.editor)
    state.editor = editor.new(f32(state.window.width), f32(state.window.height))
}

run_lesson_board :: proc(state: ^capture_state) {
    document_ptr := &state.editor.document
    title := add_text_screen(
        state,
        {90, 70},
        "photosynthesis // lesson 04",
        30,
        {0.10, 0.18, 0.32, 1.0},
    )
    subtitle := add_text_screen(
        state,
        {92, 112},
        "how light becomes stored chemical energy",
        17,
        {0.28, 0.35, 0.44, 1.0},
    )

    input_card := add_rect_screen(state, {90, 210}, 220, 130, {0.84, 0.93, 1.0, 1.0})
    light_card := add_rect_screen(state, {370, 210}, 220, 130, {1.0, 0.93, 0.70, 1.0})
    output_card := add_rect_screen(state, {650, 210}, 220, 130, {0.84, 1.0, 0.88, 1.0})
    card_indices := [?]int{input_card, light_card, output_card}
    _ = document.group(document_ptr, card_indices[:])
    add_text_screen(state, {115, 235}, "1  inputs", 21, {0.08, 0.22, 0.40, 1.0})
    add_text_screen(state, {115, 278}, "water + carbon dioxide", 16, {0.12, 0.20, 0.28, 1.0})
    add_text_screen(state, {395, 235}, "2  chloroplast", 21, {0.42, 0.28, 0.06, 1.0})
    add_text_screen(state, {395, 278}, "light energy + chlorophyll", 16, {0.30, 0.24, 0.12, 1.0})
    add_text_screen(state, {675, 235}, "3  outputs", 21, {0.08, 0.34, 0.18, 1.0})
    add_text_screen(state, {675, 278}, "glucose + oxygen", 16, {0.10, 0.28, 0.16, 1.0})

    first_arrow := add_arrow_screen(state, {315, 275}, {365, 275})
    second_arrow := add_arrow_screen(state, {595, 275}, {645, 275})
    editor.bind_arrow(&state.editor, first_arrow)
    editor.bind_arrow(&state.editor, second_arrow)

    decision := add_diamond_screen(state, {440, 405}, 190, 120, {0.96, 0.84, 0.92, 1.0})
    decision_element := &document_ptr.elements[decision]
    decision_element.stroke_style = .dashed
    add_text_screen(state, {475, 445}, "enough light?", 19, {0.30, 0.10, 0.26, 1.0})
    yes_arrow := add_arrow_screen(state, {535, 405}, {740, 405})
    no_arrow := add_arrow_screen(state, {440, 465}, {300, 565})
    editor.bind_arrow(&state.editor, yes_arrow)
    editor.bind_arrow(&state.editor, no_arrow)
    add_text_screen(state, {625, 375}, "yes", 16, {0.12, 0.35, 0.18, 1.0})
    add_text_screen(state, {350, 515}, "no -- move to shade", 16, {0.35, 0.16, 0.16, 1.0})

    result := add_ellipse_screen(state, {690, 350}, 230, 110, {0.88, 0.97, 0.90, 1.0})
    document_ptr.elements[result].stroke_style = .dotted
    add_text_screen(state, {735, 390}, "store energy", 22, {0.08, 0.34, 0.18, 1.0})
    note := add_rect_screen(state, {70, 525}, 250, 110, {1.0, 0.88, 0.82, 1.0})
    document_ptr.elements[note].opacity = 0.86
    document_ptr.elements[note].fill_style = .solid
    add_text_screen(state, {95, 550}, "teacher note", 18, {0.45, 0.14, 0.08, 1.0})
    add_text_screen(state, {95, 582}, "ask: where does oxygen go?", 15, {0.32, 0.18, 0.12, 1.0})

    freehand := document.add_freehand(document_ptr, -480, 195, {0.80, 0.18, 0.20, 1.0})
    document.append_point(document_ptr, freehand, {-430, 180})
    document.append_point(document_ptr, freehand, {-380, 195})
    document.append_point(document_ptr, freehand, {-330, 180})
    document_ptr.elements[freehand].stroke_width = 4
    document_ptr.elements[freehand].roughness = 2

    if write_visual_image(state) {
        image := len(document_ptr.elements) - 1
        document_ptr.elements[image].width = 150
        document_ptr.elements[image].height = 100
        document_ptr.elements[image].x = 360
        document_ptr.elements[image].y = 210
        capture(state, {}, "lesson board with embedded image")
    }

    document_ptr.elements[title].locked = true
    document.set_text(document_ptr, subtitle, "observe -> decide -> store -> explain")
    capture(state, {}, "lesson board locked title and edited subtitle")

    clear(&state.editor.selected_items)
    append(&state.editor.selected_items, input_card)
    append(&state.editor.selected_items, light_card)
    append(&state.editor.selected_items, output_card)
    state.editor.selected = output_card
    input: platform.frame_input
    input.distribute_horizontal_requested = true
    capture(state, input, "lesson cards distributed")
    input = {}
    input.align_top_requested = true
    capture(state, input, "lesson cards aligned")

    clear(&state.editor.selected_items)
    append(&state.editor.selected_items, note)
    state.editor.selected = note
    input = {}
    input.rotate_right_requested = true
    capture(state, input, "rotated teacher note")
    input = {}
    input.mouse = {90, 760}
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    capture(state, input, "properties panel fill change")

    input = {}
    input.select_all_requested = true
    capture(state, input, "lesson select all")
    input = {}
    input.toggle_grid_requested = true
    input.toggle_snap_requested = true
    capture(state, input, "lesson grid and snap")
    input = {}
    input.toggle_theme_requested = true
    capture(state, input, "lesson dark mode")
    input = {}
    input.toggle_theme_requested = true
    capture(state, input, "lesson light mode restored")

    clear(&state.editor.selected_items)
    append(&state.editor.selected_items, note)
    state.editor.selected = note
    input = {}
    input.duplicate_requested = true
    capture(state, input, "duplicated teacher note")
    input = {}
    input.undo_requested = true
    capture(state, input, "undo duplicate")
    input = {}
    input.redo_requested = true
    capture(state, input, "redo duplicate")

    input = {}
    input.tool_select_requested = true
    capture(state, input, "lesson select tool")
    input = {}
    input.mouse = {200, 265}
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    capture(state, input, "lasso left to right start")
    input = {}
    input.mouse = {900, 360}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    capture(state, input, "lasso left to right drag")
    input = {}
    input.mouse = {900, 360}
    input.released[platform.MOUSE_BUTTON_LEFT] = true
    capture(state, input, "lasso left to right finished")
    input = {}
    input.mouse = {900, 360}
    input.pressed[platform.MOUSE_BUTTON_LEFT] = true
    capture(state, input, "lasso right to left start")
    input = {}
    input.mouse = {200, 265}
    input.buttons[platform.MOUSE_BUTTON_LEFT] = true
    capture(state, input, "lasso right to left drag")
    input = {}
    input.mouse = {200, 265}
    input.released[platform.MOUSE_BUTTON_LEFT] = true
    capture(state, input, "lasso right to left finished")
}

world_from_screen :: proc(state: ^capture_state, point: [2]f32) -> [2]f32 {
    return viewport.screen_to_world(state.editor.viewport, point)
}

add_rect_screen :: proc(state: ^capture_state, top_left: [2]f32, width, height: f32, fill: document.color) -> int {
    point := world_from_screen(state, top_left)
    return document.add_rectangle(&state.editor.document, point[0], point[1], width, height, fill)
}

add_ellipse_screen :: proc(state: ^capture_state, top_left: [2]f32, width, height: f32, fill: document.color) -> int {
    point := world_from_screen(state, top_left)
    return document.add_ellipse(&state.editor.document, point[0], point[1], width, height, fill)
}

add_diamond_screen :: proc(state: ^capture_state, top_left: [2]f32, width, height: f32, fill: document.color) -> int {
    point := world_from_screen(state, top_left)
    return document.add_diamond(&state.editor.document, point[0], point[1], width, height, fill)
}

add_arrow_screen :: proc(state: ^capture_state, start, finish: [2]f32) -> int {
    first := world_from_screen(state, start)
    last := world_from_screen(state, finish)
    return document.add_arrow(
        &state.editor.document,
        first[0],
        first[1],
        last[0] - first[0],
        last[1] - first[1],
        {0.12, 0.25, 0.42, 1.0},
    )
}

add_text_screen :: proc(state: ^capture_state, top_left: [2]f32, text: string, size: f32, fill: document.color) -> int {
    point := world_from_screen(state, top_left)
    return document.add_text_styled(
        &state.editor.document,
        point[0],
        point[1],
        text,
        fill,
        size,
        document.default_font_family,
        .left,
        .top,
        true,
        1.25,
    )
}

write_visual_image :: proc(state: ^capture_state) -> bool {
    png_data, decode_error := base64.decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    )
    if decode_error != nil {
        return false
    }
    path := fmt.tprintf("%s/embedded-image.png", state.output)
    defer delete(png_data)
    if os.write_entire_file(path, png_data) != nil {
        return false
    }
    point := world_from_screen(state, {1000, 220})
    if !storage.import_image(&state.editor.document, path, point[0], point[1]) {
        return false
    }
    return true
}
