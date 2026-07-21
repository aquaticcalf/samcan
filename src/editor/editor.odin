package editor

import "core:math"

import doc "../document"
import history_pkg "../history"
import platform "../platform"
import storage "../storage"
import viewport "../viewport"

interaction_kind :: enum {
    none,
    move,
    resize_top_left,
    resize_top_right,
    resize_bottom_right,
    resize_bottom_left,
}

state :: struct {
    document:        doc.document,
    viewport:        viewport.viewport,
    drawing:         bool,
    active_rect:     int,
    active_kind:     doc.element_kind,
    select_mode:     bool,
    selected:        int,
    interaction:     interaction_kind,
    drag_start:      [2]f32,
    start_bounds:    [4]f32,
    draw_start:      [2]f32,
    history:         history_pkg.state,
    before:          doc.document,
    before_valid:    bool,
}

new :: proc(width, height: f32) -> state {
    return state{
        document = doc.new(),
        viewport = viewport.new(width, height),
        active_rect = -1,
        active_kind = .rectangle,
        select_mode = true,
        selected = -1,
        interaction = .none,
        history = history_pkg.new(),
    }
}

destroy :: proc(editor: ^state) {
    if editor.before_valid {
        doc.destroy(&editor.before)
    }
    history_pkg.destroy(&editor.history)
    doc.destroy(&editor.document)
}

load :: proc(editor: ^state, path: string) -> bool {
    loaded, ok := storage.load(path)
    if !ok {
        return false
    }
    doc.destroy(&editor.document)
    editor.document = loaded
    editor.drawing = false
    editor.active_rect = -1
    editor.selected = -1
    editor.interaction = .none
    if editor.before_valid {
        doc.destroy(&editor.before)
        editor.before_valid = false
    }
    history_pkg.reset(&editor.history)
    return true
}

save :: proc(editor: ^state, path: string) -> bool {
    return storage.save(path, &editor.document)
}

resize :: proc(editor: ^state, width, height: f32) {
    viewport.resize(&editor.viewport, width, height)
}

update :: proc(editor: ^state, input: ^platform.frame_input) {
    if input.undo_requested || input.redo_requested {
        finish_transaction(editor)
        editor.drawing = false
        editor.active_rect = -1
        if input.undo_requested {
            _ = history_pkg.undo(&editor.history, &editor.document)
        } else {
            _ = history_pkg.redo(&editor.history, &editor.document)
        }
        return
    }

    if input.delete_requested && editor.selected >= 0 && editor.selected < len(editor.document.elements) {
        finish_transaction(editor)
        begin_transaction(editor)
        doc.remove(&editor.document, editor.selected)
        editor.selected = -1
        editor.interaction = .none
        finish_transaction(editor)
        return
    }

    if input.duplicate_requested && editor.selected >= 0 && editor.selected < len(editor.document.elements) {
        finish_transaction(editor)
        begin_transaction(editor)
        source := editor.document.elements[editor.selected]
        editor.selected = doc.add(
            &editor.document,
            source.kind,
            source.x + 20,
            source.y + 20,
            source.width,
            source.height,
            source.fill,
        )
        finish_transaction(editor)
        return
    }

    if input.tool_select_requested {
        editor.select_mode = true
    }
    if input.tool_rectangle_requested {
        editor.select_mode = false
        editor.active_kind = .rectangle
    }
    if input.tool_ellipse_requested {
        editor.select_mode = false
        editor.active_kind = .ellipse
    }
    if input.tool_diamond_requested {
        editor.select_mode = false
        editor.active_kind = .diamond
    }
    if input.tool_line_requested {
        editor.select_mode = false
        editor.active_kind = .line
    }
    if input.tool_arrow_requested {
        editor.select_mode = false
        editor.active_kind = .arrow
    }

    if input.wheel != 0 {
        factor: f32 = 1.1
        if input.wheel < 0 {
            factor = 1.0 / factor
        }
        viewport.zoom_at(&editor.viewport, input.mouse, factor)
    }

    if input.buttons[platform.MOUSE_BUTTON_MIDDLE] || input.buttons[platform.MOUSE_BUTTON_RIGHT] {
        viewport.pan(&editor.viewport, input.mouse_delta)
    }

    if editor.select_mode {
        update_selection(editor, input)
        return
    }

    if input.pressed[platform.MOUSE_BUTTON_LEFT] {
        world := viewport.screen_to_world(editor.viewport, input.mouse)
        begin_transaction(editor)
        editor.active_rect = doc.add(
            &editor.document,
            editor.active_kind,
            world[0],
            world[1],
            0,
            0,
            {0.98, 0.80, 0.42, 1.0},
        )
        editor.draw_start = world
        editor.drawing = true
    }

    if editor.drawing && editor.active_rect >= 0 {
        world := viewport.screen_to_world(editor.viewport, input.mouse)
        element := editor.document.elements[editor.active_rect]
        x := min(editor.draw_start[0], world[0])
        y := min(editor.draw_start[1], world[1])
        width := math.abs(world[0] - editor.draw_start[0])
        height := math.abs(world[1] - editor.draw_start[1])
        doc.set_bounds(&editor.document, editor.active_rect, x, y, width, height)
    }

    if input.released[platform.MOUSE_BUTTON_LEFT] {
        editor.drawing = false
        if editor.active_rect >= 0 {
            element := editor.document.elements[editor.active_rect]
            if element.width < 2 || element.height < 2 {
                doc.remove(&editor.document, editor.active_rect)
            }
        }
        editor.active_rect = -1
        finish_transaction(editor)
    }
}

update_selection :: proc(editor: ^state, input: ^platform.frame_input) {
    if input.pressed[platform.MOUSE_BUTTON_LEFT] {
        world := viewport.screen_to_world(editor.viewport, input.mouse)
        hit := -1
        action := interaction_kind.none

        if editor.selected >= 0 && editor.selected < len(editor.document.elements) {
            action = hit_handle(editor.document.elements[editor.selected], world, editor.viewport.zoom)
            if action != .none {
                hit = editor.selected
            }
        }
        if hit < 0 {
            hit = hit_test(&editor.document, world)
            if hit >= 0 {
                action = .move
            }
        }

        if hit >= 0 {
            editor.selected = hit
            editor.interaction = action
            element := editor.document.elements[hit]
            editor.drag_start = world
            editor.start_bounds = {element.x, element.y, element.width, element.height}
            begin_transaction(editor)
        } else {
            editor.selected = -1
            editor.interaction = .none
        }
    }

    if editor.interaction != .none && input.buttons[platform.MOUSE_BUTTON_LEFT] {
        world := viewport.screen_to_world(editor.viewport, input.mouse)
        apply_interaction(editor, world)
    }

    if input.released[platform.MOUSE_BUTTON_LEFT] {
        if editor.interaction != .none {
            finish_transaction(editor)
        }
        editor.interaction = .none
    }
}

hit_test :: proc(doc: ^doc.document, point: [2]f32) -> int {
    index := len(doc.elements) - 1
    for index >= 0 {
        element := doc.elements[index]
        if contains(element, point) {
            return index
        }
        index -= 1
    }
    return -1
}

contains :: proc(element: doc.element, point: [2]f32) -> bool {
    if element.width <= 0 || element.height <= 0 {
        return false
    }

    center: [2]f32 = {element.x + element.width * 0.5, element.y + element.height * 0.5}
    normalized: [2]f32 = {
        (point[0] - center[0]) / (element.width * 0.5),
        (point[1] - center[1]) / (element.height * 0.5),
    }

    switch element.kind {
    case .ellipse:
        return normalized[0] * normalized[0] + normalized[1] * normalized[1] <= 1.0
    case .diamond:
        return math.abs(normalized[0]) + math.abs(normalized[1]) <= 1.0
    case .line, .arrow:
        endpoint: [2]f32 = {element.x + element.width, element.y + element.height}
        segment := endpoint - [2]f32{element.x, element.y}
        length_squared := segment[0] * segment[0] + segment[1] * segment[1]
        if length_squared <= 0 {
            return false
        }
        relative := point - [2]f32{element.x, element.y}
        amount := (relative[0] * segment[0] + relative[1] * segment[1]) / length_squared
        amount = max(0.0, min(1.0, amount))
        closest := [2]f32{element.x, element.y} + segment * amount
        distance := point - closest
        return distance[0] * distance[0] + distance[1] * distance[1] <= 64.0
    case .rectangle:
        return point[0] >= element.x && point[0] <= element.x + element.width &&
            point[1] >= element.y && point[1] <= element.y + element.height
    }
    return false
}

hit_handle :: proc(element: doc.element, point: [2]f32, zoom: f32) -> interaction_kind {
    size := 8.0 / zoom
    left := element.x
    top := element.y
    right := element.x + element.width
    bottom := element.y + element.height

    if math.abs(point[0] - left) <= size && math.abs(point[1] - top) <= size {
        return .resize_top_left
    }
    if math.abs(point[0] - right) <= size && math.abs(point[1] - top) <= size {
        return .resize_top_right
    }
    if math.abs(point[0] - right) <= size && math.abs(point[1] - bottom) <= size {
        return .resize_bottom_right
    }
    if math.abs(point[0] - left) <= size && math.abs(point[1] - bottom) <= size {
        return .resize_bottom_left
    }
    return .none
}

apply_interaction :: proc(editor: ^state, point: [2]f32) {
    delta := point - editor.drag_start
    x := editor.start_bounds[0]
    y := editor.start_bounds[1]
    width := editor.start_bounds[2]
    height := editor.start_bounds[3]

    switch editor.interaction {
    case .move:
        x += delta[0]
        y += delta[1]
    case .resize_top_left:
        x = min(point[0], editor.start_bounds[0] + editor.start_bounds[2] - 1.0)
        y = min(point[1], editor.start_bounds[1] + editor.start_bounds[3] - 1.0)
        width = max(1.0, editor.start_bounds[0] + editor.start_bounds[2] - x)
        height = max(1.0, editor.start_bounds[1] + editor.start_bounds[3] - y)
    case .resize_top_right:
        y = min(point[1], editor.start_bounds[1] + editor.start_bounds[3] - 1.0)
        width = max(1.0, point[0] - editor.start_bounds[0])
        height = max(1.0, editor.start_bounds[1] + editor.start_bounds[3] - y)
    case .resize_bottom_right:
        width = max(1.0, point[0] - editor.start_bounds[0])
        height = max(1.0, point[1] - editor.start_bounds[1])
    case .resize_bottom_left:
        x = min(point[0], editor.start_bounds[0] + editor.start_bounds[2] - 1.0)
        width = max(1.0, editor.start_bounds[0] + editor.start_bounds[2] - x)
        height = max(1.0, point[1] - editor.start_bounds[1])
    case .none:
        return
    }

    doc.set_bounds(&editor.document, editor.selected, x, y, width, height)
}

begin_transaction :: proc(editor: ^state) {
    if editor.before_valid {
        doc.destroy(&editor.before)
    }
    editor.before = doc.clone(&editor.document)
    editor.before_valid = true
}

finish_transaction :: proc(editor: ^state) {
    if !editor.before_valid {
        return
    }
    history_pkg.record(&editor.history, &editor.before, &editor.document)
    doc.destroy(&editor.before)
    editor.before_valid = false
}
