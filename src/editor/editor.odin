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

toolbar_action :: enum {
    none,
    select,
    rectangle,
    ellipse,
    diamond,
    line,
    arrow,
    text,
    freehand,
    undo,
    redo,
    open,
    save,
    grid,
    export_svg,
    import_image,
    theme,
}

toolbar_button_width :: f32(38.0)
toolbar_button_gap :: f32(4.0)
toolbar_x :: f32(8.0)
toolbar_y :: f32(8.0)
toolbar_height :: f32(32.0)

state :: struct {
    document:        doc.document,
    clipboard:       doc.document,
    viewport:        viewport.viewport,
    show_grid:       bool,
    dark_mode:       bool,
    drawing:         bool,
    active_rect:     int,
    active_kind:     doc.element_kind,
    select_mode:     bool,
    selected:        int,
    selected_items:  [dynamic]int,
    interaction:     interaction_kind,
    lassoing:        bool,
    lasso_start:     [2]f32,
    lasso_current:   [2]f32,
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
        clipboard = doc.new(),
        viewport = viewport.new(width, height),
        show_grid = false,
        dark_mode = false,
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
    doc.destroy(&editor.clipboard)
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

save_svg :: proc(editor: ^state, path: string) -> bool {
    return storage.save_svg(path, &editor.document)
}

import_image :: proc(editor: ^state, path: string) -> bool {
    center := viewport.screen_to_world(editor.viewport, {editor.viewport.width * 0.5, editor.viewport.height * 0.5})
    finish_transaction(editor)
    begin_transaction(editor)
    if !storage.import_image(&editor.document, path, center[0], center[1]) {
        doc.destroy(&editor.before)
        editor.before_valid = false
        return false
    }
    clear_selection(editor)
    editor.selected = len(editor.document.elements) - 1
    append(&editor.selected_items, editor.selected)
    finish_transaction(editor)
    return true
}

selected_text :: proc(editor: ^state) -> string {
    if len(editor.selected_items) != 1 {
        return ""
    }
    index := editor.selected_items[0]
    if index < 0 || index >= len(editor.document.elements) || editor.document.elements[index].kind != .text {
        return ""
    }
    return strings.clone(editor.document.elements[index].text)
}

paste_text :: proc(editor: ^state, text: string) -> bool {
    if text == "" {
        return false
    }
    center := viewport.screen_to_world(editor.viewport, {editor.viewport.width * 0.5, editor.viewport.height * 0.5})
    finish_transaction(editor)
    begin_transaction(editor)
    index := doc.add_text(&editor.document, center[0], center[1], text, {0.12, 0.12, 0.12, 1.0})
    clear_selection(editor)
    editor.selected = index
    append(&editor.selected_items, index)
    finish_transaction(editor)
    return true
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

    if input.toggle_theme_requested {
        editor.dark_mode = !editor.dark_mode
        return
    }

    if input.zoom_reset_requested {
        viewport.reset(&editor.viewport)
        return
    }
    if input.zoom_to_content_requested {
        fit_document(editor, false)
        return
    }
    if input.zoom_to_selection_requested {
        fit_document(editor, true)
        return
    }

    if input.pressed[platform.MOUSE_BUTTON_LEFT] {
        action := toolbar_action_at(input.mouse)
        if action != .none {
            handle_toolbar_action(editor, input, action)
            return
        }
    }

    if editor.selected >= 0 && len(editor.selected_items) == 0 {
        append(&editor.selected_items, editor.selected)
    }

    if input.select_all_requested {
        select_all(editor)
        return
    }

    if input.copy_requested && len(editor.selected_items) > 0 {
        copy_selection(editor)
        return
    }

    if input.cut_requested && len(editor.selected_items) > 0 && !selection_has_locked(editor) {
        copy_selection(editor)
        finish_transaction(editor)
        begin_transaction(editor)
        remove_selected_elements(editor)
        finish_transaction(editor)
        return
    }

    if input.paste_requested && len(editor.clipboard.elements) > 0 {
        finish_transaction(editor)
        begin_transaction(editor)
        clear_selection(editor)
        for source in editor.clipboard.elements {
            pasted := doc.append_element_copy(&editor.document, source, 20, 20)
            append(&editor.selected_items, pasted)
            editor.selected = pasted
        }
        finish_transaction(editor)
        return
    }

    if len(editor.selected_items) > 1 && input.group_requested && !selection_has_locked(editor) {
        finish_transaction(editor)
        begin_transaction(editor)
        _ = doc.group(&editor.document, editor.selected_items[:])
        finish_transaction(editor)
        return
    }

    if len(editor.selected_items) > 0 && input.ungroup_requested && !selection_has_locked(editor) {
        finish_transaction(editor)
        begin_transaction(editor)
        doc.ungroup(&editor.document, editor.selected_items[:])
        finish_transaction(editor)
        return
    }

    if len(editor.selected_items) > 0 && input.toggle_lock_requested {
        finish_transaction(editor)
        begin_transaction(editor)
        should_lock := !selection_has_locked(editor)
        doc.set_locked(&editor.document, editor.selected_items[:], should_lock)
        finish_transaction(editor)
        return
    }

    if len(editor.selected_items) > 1 && (
        input.align_left_requested ||
        input.align_center_horizontal_requested ||
        input.align_right_requested ||
        input.align_top_requested ||
        input.align_center_vertical_requested ||
        input.align_bottom_requested
    ) {
        if selection_has_locked(editor) {
            return
        }
        finish_transaction(editor)
        begin_transaction(editor)
        mode := align_mode.left
        if input.align_center_horizontal_requested {
            mode = .center_horizontal
        } else if input.align_right_requested {
            mode = .right
        } else if input.align_top_requested {
            mode = .top
        } else if input.align_center_vertical_requested {
            mode = .center_vertical
        } else if input.align_bottom_requested {
            mode = .bottom
        }
        align_selection(editor, mode)
        finish_transaction(editor)
        return
    }

    if len(editor.selected_items) > 0 && (input.rotate_left_requested || input.rotate_right_requested) {
        if selection_has_locked(editor) {
            return
        }
        finish_transaction(editor)
        begin_transaction(editor)
        rotation: f32 = 0.2617994
        if input.rotate_left_requested {
            rotation = -rotation
        }
        for index in editor.selected_items {
            if index >= 0 && index < len(editor.document.elements) {
                editor.document.elements[index].angle += rotation
            }
        }
        finish_transaction(editor)
        return
    }

    if input.delete_requested && len(editor.selected_items) > 0 {
        if selection_has_locked(editor) {
            return
        }
        finish_transaction(editor)
        begin_transaction(editor)
        remove_selected_elements(editor)
        editor.interaction = .none
        finish_transaction(editor)
        return
    }

    if input.duplicate_requested && len(editor.selected_items) > 0 {
        if selection_has_locked(editor) {
            return
        }
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

    if len(editor.selected_items) > 0 && (
        input.bring_forward_requested ||
        input.send_backward_requested ||
        input.bring_to_front_requested ||
        input.send_to_back_requested
    ) {
        if selection_has_locked(editor) {
            return
        }
        finish_transaction(editor)
        begin_transaction(editor)
        if input.bring_forward_requested {
            move_selection_forward(editor)
        } else if input.send_backward_requested {
            move_selection_backward(editor)
        } else if input.bring_to_front_requested {
            move_selection_to_front(editor)
        } else {
            move_selection_to_back(editor)
        }
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
    if input.toggle_grid_requested {
        editor.show_grid = !editor.show_grid
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

fit_document :: proc(editor: ^state, selection_only: bool) {
    has_bounds := false
    min_point: [2]f32
    max_point: [2]f32

    if selection_only && len(editor.selected_items) > 0 {
        for index in editor.selected_items {
            include_element_bounds(
                editor.document.elements[:],
                index,
                &has_bounds,
                &min_point,
                &max_point,
            )
        }
    } else if selection_only && editor.selected >= 0 {
        include_element_bounds(
            editor.document.elements[:],
            editor.selected,
            &has_bounds,
            &min_point,
            &max_point,
        )
    } else {
        for index in 0 ..< len(editor.document.elements) {
            include_element_bounds(
                editor.document.elements[:],
                index,
                &has_bounds,
                &min_point,
                &max_point,
            )
        }
    }

    if has_bounds {
        _ = viewport.fit_bounds(&editor.viewport, min_point, max_point)
    } else {
        viewport.reset(&editor.viewport)
    }
}

include_element_bounds :: proc(
    elements: []doc.element,
    index: int,
    has_bounds: ^bool,
    min_point, max_point: ^[2]f32,
) {
    if index < 0 || index >= len(elements) {
        return
    }
    element := elements[index]
    element_min: [2]f32 = {element.x, element.y}
    element_max: [2]f32 = {element.x + element.width, element.y + element.height}
    for point in element.points {
        element_min[0] = min(element_min[0], point[0])
        element_min[1] = min(element_min[1], point[1])
        element_max[0] = max(element_max[0], point[0])
        element_max[1] = max(element_max[1], point[1])
    }
    if !has_bounds^ {
        min_point^ = element_min
        max_point^ = element_max
        has_bounds^ = true
    } else {
        min_point^[0] = min(min_point^[0], element_min[0])
        min_point^[1] = min(min_point^[1], element_min[1])
        max_point^[0] = max(max_point^[0], element_max[0])
        max_point^[1] = max(max_point^[1], element_max[1])
    }
}

toolbar_action_at :: proc(point: [2]f32) -> toolbar_action {
    if point[1] < toolbar_y || point[1] > toolbar_y + toolbar_height {
        return .none
    }
    index := int((point[0] - toolbar_x) / (toolbar_button_width + toolbar_button_gap))
    if index < 0 {
        return .none
    }
    actions := [?]toolbar_action{
        .select, .rectangle, .ellipse, .diamond, .line, .arrow, .text, .freehand,
        .undo, .redo, .open, .save, .grid, .export_svg, .import_image, .theme,
    }
    if index >= len(actions) {
        return .none
    }
    button_left := toolbar_x + f32(index) * (toolbar_button_width + toolbar_button_gap)
    if point[0] < button_left || point[0] > button_left + toolbar_button_width {
        return .none
    }
    return actions[index]
}

handle_toolbar_action :: proc(editor: ^state, input: ^platform.frame_input, action: toolbar_action) {
    switch action {
    case .select:
        editor.select_mode = true
    case .rectangle:
        editor.select_mode = false
        editor.active_kind = .rectangle
    case .ellipse:
        editor.select_mode = false
        editor.active_kind = .ellipse
    case .diamond:
        editor.select_mode = false
        editor.active_kind = .diamond
    case .line:
        editor.select_mode = false
        editor.active_kind = .line
    case .arrow:
        editor.select_mode = false
        editor.active_kind = .arrow
    case .text:
        editor.select_mode = false
        editor.active_kind = .text
    case .freehand:
        editor.select_mode = false
        editor.active_kind = .freehand
    case .undo:
        finish_transaction(editor)
        _ = history_pkg.undo(&editor.history, &editor.document)
    case .redo:
        finish_transaction(editor)
        _ = history_pkg.redo(&editor.history, &editor.document)
    case .open:
        input.open_requested = true
    case .save:
        input.save_requested = true
    case .export_svg:
        input.export_svg_requested = true
    case .import_image:
        input.import_image_requested = true
    case .theme:
        editor.dark_mode = !editor.dark_mode
    case .grid:
        editor.show_grid = !editor.show_grid
    case .none:
        return
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

    if input.enter_requested {
        if input.control {
            finish_text(editor, false)
        } else {
            current := editor.document.elements[editor.text_index].text
            parts := [2]string{current, "\n"}
            combined := strings.concatenate(parts[:])
            doc.set_text(&editor.document, editor.text_index, combined)
        }
    }

    if input.escape_requested {
        finish_text(editor, false)
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
            if editor.document.elements[hit].group_id != 0 {
                group_id := editor.document.elements[hit].group_id
                clear_selection(editor)
                for group_index in 0 ..< len(editor.document.elements) {
                    group_element := editor.document.elements[group_index]
                    if group_element.group_id == group_id {
                        append(&editor.selected_items, group_index)
                    }
                }
            }
            editor.selected = hit
            if selection_has_locked(editor) {
                editor.interaction = .none
                return
            }
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
            editor.lassoing = true
            editor.lasso_start = world
            editor.lasso_current = world
            editor.interaction = .none
        }
    }

    if editor.interaction != .none && input.buttons[platform.MOUSE_BUTTON_LEFT] {
        world := viewport.screen_to_world(editor.viewport, input.mouse)
        apply_interaction(editor, world)
    }

    if editor.lassoing && input.buttons[platform.MOUSE_BUTTON_LEFT] {
        editor.lasso_current = viewport.screen_to_world(editor.viewport, input.mouse)
    }

    if input.released[platform.MOUSE_BUTTON_LEFT] {
        if editor.lassoing {
            lasso_select(editor, editor.lasso_start, editor.lasso_current, input.shift)
            editor.lassoing = false
        }
        if editor.interaction != .none {
            finish_transaction(editor)
        }
        editor.interaction = .none
        clear(&editor.drag_items)
        clear(&editor.drag_bounds)
    }
}

lasso_select :: proc(editor: ^state, start, finish: [2]f32, additive: bool) {
    if !additive {
        clear_selection(editor)
    }
    left := min(start[0], finish[0])
    top := min(start[1], finish[1])
    right := max(start[0], finish[0])
    bottom := max(start[1], finish[1])
    contains_mode := finish[0] >= start[0]
    for index in 0 ..< len(editor.document.elements) {
        element := editor.document.elements[index]
        element_left := element.x
        element_top := element.y
        element_right := element.x + element.width
        element_bottom := element.y + element.height
        selected := false
        if contains_mode {
            selected = element_left >= left && element_top >= top &&
                element_right <= right && element_bottom <= bottom
        } else {
            selected = element_right >= left && element_left <= right &&
                element_bottom >= top && element_top <= bottom
        }
        if selected && !is_selected(editor, index) {
            append(&editor.selected_items, index)
            editor.selected = index
        }
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

copy_selection :: proc(editor: ^state) {
    doc.destroy(&editor.clipboard)
    editor.clipboard = doc.new()
    for index in editor.selected_items {
        if index >= 0 && index < len(editor.document.elements) {
            doc.append_element_copy(&editor.clipboard, editor.document.elements[index], 0, 0)
        }
    }
}

move_selection_forward :: proc(editor: ^state) {
    for index := len(editor.document.elements) - 2; index >= 0; index -= 1 {
        if !is_selected(editor, index) || is_selected(editor, index + 1) {
            continue
        }
        doc.swap_elements(&editor.document, index, index + 1)
        update_selection_index(editor, index, index + 1)
    }
}

move_selection_backward :: proc(editor: ^state) {
    for index := 1; index < len(editor.document.elements); index += 1 {
        if !is_selected(editor, index) || is_selected(editor, index - 1) {
            continue
        }
        doc.swap_elements(&editor.document, index, index - 1)
        update_selection_index(editor, index, index - 1)
    }
}

move_selection_to_front :: proc(editor: ^state) {
    for pass := 0; pass < len(editor.document.elements); pass += 1 {
        move_selection_forward(editor)
    }
}

move_selection_to_back :: proc(editor: ^state) {
    for pass := 0; pass < len(editor.document.elements); pass += 1 {
        move_selection_backward(editor)
    }
}

update_selection_index :: proc(editor: ^state, old_index, new_index: int) {
    for &selected_index in editor.selected_items {
        if selected_index == old_index {
            selected_index = new_index
        }
    }
    if editor.selected == old_index {
        editor.selected = new_index
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

    local_point := unrotate_point(element, point)
    center: [2]f32 = {element.x + element.width * 0.5, element.y + element.height * 0.5}
    normalized: [2]f32 = {
        (local_point[0] - center[0]) / (element.width * 0.5),
        (local_point[1] - center[1]) / (element.height * 0.5),
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
        relative := local_point - [2]f32{element.x, element.y}
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
            relative := local_point - start
            amount := (relative[0] * segment[0] + relative[1] * segment[1]) / length_squared
            amount = max(0.0, min(1.0, amount))
            closest := start + segment * amount
            distance := point - closest
            if distance[0] * distance[0] + distance[1] * distance[1] <= 64.0 {
                return true
            }
        }
        return false
    case .rectangle, .text, .image:
        return local_point[0] >= element.x && local_point[0] <= element.x + element.width &&
            local_point[1] >= element.y && local_point[1] <= element.y + element.height
    }
    return false
}

hit_handle :: proc(element: doc.element, point: [2]f32, zoom: f32) -> interaction_kind {
    local_point := unrotate_point(element, point)
    size := 8.0 / zoom
    left := element.x
    top := element.y
    right := element.x + element.width
    bottom := element.y + element.height

    if math.abs(local_point[0] - left) <= size && math.abs(local_point[1] - top) <= size {
        return .resize_top_left
    }
    if math.abs(local_point[0] - right) <= size && math.abs(local_point[1] - top) <= size {
        return .resize_top_right
    }
    if math.abs(local_point[0] - right) <= size && math.abs(local_point[1] - bottom) <= size {
        return .resize_bottom_right
    }
    if math.abs(local_point[0] - left) <= size && math.abs(local_point[1] - bottom) <= size {
        return .resize_bottom_left
    }
    return .none
}

unrotate_point :: proc(element: doc.element, point: [2]f32) -> [2]f32 {
    if element.angle == 0 {
        return point
    }
    center: [2]f32 = {element.x + element.width * 0.5, element.y + element.height * 0.5}
    relative := point - center
    sine := math.sin(-element.angle)
    cosine := math.cos(-element.angle)
    return center + [2]f32{
        relative[0] * cosine - relative[1] * sine,
        relative[0] * sine + relative[1] * cosine,
    }
}

apply_interaction :: proc(editor: ^state, point: [2]f32) {
    if selection_has_locked(editor) {
        return
    }
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

selection_has_locked :: proc(editor: ^state) -> bool {
    for index in editor.selected_items {
        if index >= 0 && index < len(editor.document.elements) && editor.document.elements[index].locked {
            return true
        }
    }
    return false
}

align_mode :: enum {
    left,
    center_horizontal,
    right,
    top,
    center_vertical,
    bottom,
}

align_selection :: proc(editor: ^state, mode: align_mode) {
    if len(editor.selected_items) == 0 {
        return
    }
    first := editor.document.elements[editor.selected_items[0]]
    min_x := first.x
    min_y := first.y
    max_x := first.x + first.width
    max_y := first.y + first.height
    for index in editor.selected_items[1:] {
        element := editor.document.elements[index]
        min_x = min(min_x, element.x)
        min_y = min(min_y, element.y)
        max_x = max(max_x, element.x + element.width)
        max_y = max(max_y, element.y + element.height)
    }
    center_x := (min_x + max_x) * 0.5
    center_y := (min_y + max_y) * 0.5
    for index in editor.selected_items {
        element := editor.document.elements[index]
        x := element.x
        y := element.y
        switch mode {
        case .left:
            x = min_x
        case .center_horizontal:
            x = center_x - element.width * 0.5
        case .right:
            x = max_x - element.width
        case .top:
            y = min_y
        case .center_vertical:
            y = center_y - element.height * 0.5
        case .bottom:
            y = max_y - element.height
        }
        if element.kind == .freehand {
            doc.translate(&editor.document, index, x - element.x, y - element.y)
        } else {
            doc.set_bounds(&editor.document, index, x, y, element.width, element.height)
        }
    }
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
