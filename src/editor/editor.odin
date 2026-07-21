package editor

import "core:math"
import "core:strings"

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
    selected_items:  [dynamic]int,
    interaction:     interaction_kind,
    drag_start:      [2]f32,
    start_bounds:    [4]f32,
    drag_items:      [dynamic]int,
    drag_bounds:     [dynamic][4]f32,
    draw_start:      [2]f32,
    text_editing:    bool,
    text_index:      int,
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
        selected_items = make([dynamic]int, 0),
        interaction = .none,
        drag_items = make([dynamic]int, 0),
        drag_bounds = make([dynamic][4]f32, 0),
        text_index = -1,
        history = history_pkg.new(),
    }
}

destroy :: proc(editor: ^state) {
    if editor.before_valid {
        doc.destroy(&editor.before)
    }
    history_pkg.destroy(&editor.history)
    delete(editor.selected_items)
    delete(editor.drag_items)
    delete(editor.drag_bounds)
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
    clear_selection(editor)
    editor.interaction = .none
    editor.text_editing = false
    editor.text_index = -1
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

    if editor.text_editing {
        update_text(editor, input)
        return
    }

    if editor.selected >= 0 && len(editor.selected_items) == 0 {
        append(&editor.selected_items, editor.selected)
    }

    if input.select_all_requested {
        select_all(editor)
        return
    }

    if input.delete_requested && len(editor.selected_items) > 0 {
        finish_transaction(editor)
        begin_transaction(editor)
        remove_selected_elements(editor)
        editor.interaction = .none
        finish_transaction(editor)
        return
    }

    if input.duplicate_requested && len(editor.selected_items) > 0 {
        finish_transaction(editor)
        begin_transaction(editor)
        originals := make([dynamic]int, 0)
        for index in editor.selected_items {
            append(&originals, index)
        }
        clear_selection(editor)
        for index in originals {
            duplicate := doc.duplicate(&editor.document, index, 20, 20)
            append(&editor.selected_items, duplicate)
            editor.selected = duplicate
        }
        delete(originals)
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
    if input.tool_text_requested {
        editor.select_mode = false
        editor.active_kind = .text
    }
    if input.tool_freehand_requested {
        editor.select_mode = false
        editor.active_kind = .freehand
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

    if editor.active_kind == .text && !editor.select_mode {
        if input.pressed[platform.MOUSE_BUTTON_LEFT] {
            world := viewport.screen_to_world(editor.viewport, input.mouse)
            begin_transaction(editor)
            editor.text_index = doc.add_text(&editor.document, world[0], world[1], "", {0.12, 0.12, 0.12, 1.0})
            editor.text_editing = true
        }
        return
    }

    if editor.select_mode {
        update_selection(editor, input)
        return
    }

    if input.pressed[platform.MOUSE_BUTTON_LEFT] {
        world := viewport.screen_to_world(editor.viewport, input.mouse)
        begin_transaction(editor)
        if editor.active_kind == .freehand {
            editor.active_rect = doc.add_freehand(&editor.document, world[0], world[1], {0.12, 0.12, 0.12, 1.0})
        } else {
            editor.active_rect = doc.add(
                &editor.document,
                editor.active_kind,
                world[0],
                world[1],
                0,
                0,
                {0.98, 0.80, 0.42, 1.0},
            )
        }
        editor.draw_start = world
        editor.drawing = true
    }

    if editor.drawing && editor.active_rect >= 0 {
        world := viewport.screen_to_world(editor.viewport, input.mouse)
        element := editor.document.elements[editor.active_rect]
        if element.kind == .freehand {
            if len(element.points) == 0 || element.points[len(element.points) - 1] != world {
                doc.append_point(&editor.document, editor.active_rect, world)
            }
        } else {
            x := min(editor.draw_start[0], world[0])
            y := min(editor.draw_start[1], world[1])
            width := math.abs(world[0] - editor.draw_start[0])
            height := math.abs(world[1] - editor.draw_start[1])
            doc.set_bounds(&editor.document, editor.active_rect, x, y, width, height)
        }
    }

    if input.released[platform.MOUSE_BUTTON_LEFT] {
        editor.drawing = false
        if editor.active_rect >= 0 {
            element := editor.document.elements[editor.active_rect]
            if (element.kind == .freehand && len(element.points) < 2) ||
                (element.kind != .freehand && (element.width < 2 || element.height < 2)) {
                doc.remove(&editor.document, editor.active_rect)
            }
        }
        editor.active_rect = -1
        finish_transaction(editor)
    }
}

update_text :: proc(editor: ^state, input: ^platform.frame_input) {
    if editor.text_index < 0 || editor.text_index >= len(editor.document.elements) {
        editor.text_editing = false
        editor.text_index = -1
        finish_transaction(editor)
        return
    }

    if input.text_input != "" {
        current := editor.document.elements[editor.text_index].text
        parts := [2]string{current, input.text_input}
        combined := strings.concatenate(parts[:])
        doc.set_text(&editor.document, editor.text_index, combined)
    }

    if input.backspace_requested {
        current := editor.document.elements[editor.text_index].text
        count := strings.rune_count(current)
        if count > 0 {
            shortened := strings.cut_clone(current, 0, count - 1)
            doc.set_text(&editor.document, editor.text_index, shortened)
            delete(shortened)
        }
    }

    if input.enter_requested || input.escape_requested {
        finish_text(editor, input.escape_requested)
    }
}

finish_text :: proc(editor: ^state, cancel: bool) {
    if editor.text_index >= 0 && editor.text_index < len(editor.document.elements) {
        text := editor.document.elements[editor.text_index].text
        if cancel || text == "" {
            doc.remove(&editor.document, editor.text_index)
            editor.selected = -1
        } else {
            editor.selected = editor.text_index
        }
    }
    editor.text_editing = false
    editor.text_index = -1
    editor.select_mode = true
    finish_transaction(editor)
}

update_selection :: proc(editor: ^state, input: ^platform.frame_input) {
    if input.pressed[platform.MOUSE_BUTTON_LEFT] {
        world := viewport.screen_to_world(editor.viewport, input.mouse)
        hit := -1
        action := interaction_kind.none
        shift := input.shift

        if !shift && editor.selected >= 0 && editor.selected < len(editor.document.elements) {
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
            if shift && is_selected(editor, hit) && action == .none {
                remove_from_selection(editor, hit)
                editor.interaction = .none
                return
            }
            if !shift {
                clear_selection(editor)
            }
            if !is_selected(editor, hit) {
                append(&editor.selected_items, hit)
            }
            editor.selected = hit
            editor.interaction = action
            if editor.interaction == .none {
                editor.interaction = .move
            }
            element := editor.document.elements[hit]
            editor.drag_start = world
            editor.start_bounds = {element.x, element.y, element.width, element.height}
            clear(&editor.drag_items)
            clear(&editor.drag_bounds)
            for index in editor.selected_items {
                append(&editor.drag_items, index)
                selected_element := editor.document.elements[index]
                append(&editor.drag_bounds, [4]f32{selected_element.x, selected_element.y, selected_element.width, selected_element.height})
            }
            begin_transaction(editor)
        } else {
            if !shift {
                clear_selection(editor)
            }
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
        clear(&editor.drag_items)
        clear(&editor.drag_bounds)
    }
}

is_selected :: proc(editor: ^state, index: int) -> bool {
    for selected_index in editor.selected_items {
        if selected_index == index {
            return true
        }
    }
    return false
}

clear_selection :: proc(editor: ^state) {
    clear(&editor.selected_items)
    editor.selected = -1
}

remove_from_selection :: proc(editor: ^state, index: int) {
    for selected_position in 0 ..< len(editor.selected_items) {
        if editor.selected_items[selected_position] == index {
            ordered_remove(&editor.selected_items, selected_position)
            break
        }
    }
    if len(editor.selected_items) == 0 {
        editor.selected = -1
    } else if !is_selected(editor, editor.selected) {
        editor.selected = editor.selected_items[len(editor.selected_items) - 1]
    }
}

select_all :: proc(editor: ^state) {
    clear_selection(editor)
    for index in 0 ..< len(editor.document.elements) {
        append(&editor.selected_items, index)
        editor.selected = index
    }
}

remove_selected_elements :: proc(editor: ^state) {
    for len(editor.selected_items) > 0 {
        max_position := 0
        max_index := editor.selected_items[0]
        for position in 1 ..< len(editor.selected_items) {
            if editor.selected_items[position] > max_index {
                max_index = editor.selected_items[position]
                max_position = position
            }
        }
        if max_index >= 0 && max_index < len(editor.document.elements) {
            doc.remove(&editor.document, max_index)
        }
        ordered_remove(&editor.selected_items, max_position)
    }
    editor.selected = -1
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
    case .freehand:
        if len(element.points) < 2 {
            return false
        }
        for point_index in 1 ..< len(element.points) {
            start := element.points[point_index - 1]
            finish := element.points[point_index]
            segment := finish - start
            length_squared := segment[0] * segment[0] + segment[1] * segment[1]
            if length_squared <= 0 {
                continue
            }
            relative := point - start
            amount := (relative[0] * segment[0] + relative[1] * segment[1]) / length_squared
            amount = max(0.0, min(1.0, amount))
            closest := start + segment * amount
            distance := point - closest
            if distance[0] * distance[0] + distance[1] * distance[1] <= 64.0 {
                return true
            }
        }
        return false
    case .rectangle, .text:
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

    if editor.interaction == .move {
        for position in 0 ..< len(editor.drag_items) {
            index := editor.drag_items[position]
            if index < 0 || index >= len(editor.document.elements) {
                continue
            }
            bounds := editor.drag_bounds[position]
            target_x := bounds[0] + delta[0]
            target_y := bounds[1] + delta[1]
            if editor.document.elements[index].kind == .freehand {
                current := editor.document.elements[index]
                doc.translate(&editor.document, index, target_x - current.x, target_y - current.y)
            } else {
                doc.set_bounds(&editor.document, index, target_x, target_y, bounds[2], bounds[3])
            }
        }
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
