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
    eraser,
    frame,
    undo,
    redo,
    open,
    save,
    grid,
    export_svg,
    import_image,
    theme,
    export_png,
    library,
}

toolbar_button_width :: f32(34.0)
toolbar_button_gap :: f32(6.0)
toolbar_x :: f32(124.0)
toolbar_y :: f32(10.0)
toolbar_height :: f32(34.0)
tool_rail_x :: f32(10.0)
tool_rail_y :: f32(64.0)
tool_rail_button_size :: f32(38.0)
tool_rail_gap :: f32(4.0)
library_panel_width :: f32(286.0)
library_panel_top :: f32(158.0)
library_item_height :: f32(94.0)
library_item_width :: f32(126.0)
library_item_gap :: f32(8.0)

state :: struct {
    document:        doc.document,
    clipboard:       doc.document,
    viewport:        viewport.viewport,
    show_grid:       bool,
    snap_to_grid:    bool,
    dark_mode:       bool,
    dirty:           bool,
    library_open:    bool,
    library_items:   [dynamic]storage.library_item,
    drawing:         bool,
    erasing:         bool,
    eraser_last:     [2]f32,
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
        snap_to_grid = false,
        dark_mode = false,
        dirty = false,
        library_open = false,
        library_items = make([dynamic]storage.library_item, 0),
        erasing = false,
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
    storage.destroy_library_items(&editor.library_items)
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
    editor.dirty = false
    return true
}

save :: proc(editor: ^state, path: string) -> bool {
    if !storage.save(path, &editor.document) {
        return false
    }
    editor.dirty = false
    _ = storage.clear_autosave(path)
    return true
}

autosave :: proc(editor: ^state, path: string) -> bool {
    return storage.save_autosave(path, &editor.document)
}

save_svg :: proc(editor: ^state, path: string) -> bool {
    return storage.save_svg(path, &editor.document)
}

load_library :: proc(editor: ^state, path: string) -> bool {
    loaded, ok := storage.load_library(path)
    if !ok {
        return false
    }
    storage.destroy_library_items(&editor.library_items)
    editor.library_items = loaded
    editor.library_open = len(editor.library_items) > 0
    return true
}

save_library :: proc(editor: ^state, path: string) -> bool {
    return storage.save_library(path, editor.library_items[:])
}

insert_library_item :: proc(editor: ^state, index: int, screen_point: [2]f32) -> bool {
    if index < 0 || index >= len(editor.library_items) {
        return false
    }
    center := viewport.screen_to_world(editor.viewport, screen_point)
    finish_transaction(editor)
    begin_transaction(editor)
    previous_count := len(editor.document.elements)
    if !storage.insert_library_item(&editor.document, editor.library_items[index], center[0], center[1]) {
        doc.destroy(&editor.before)
        editor.before_valid = false
        return false
    }
    clear_selection(editor)
    for element_index in previous_count ..< len(editor.document.elements) {
        append(&editor.selected_items, element_index)
        editor.selected = element_index
    }
    finish_transaction(editor)
    return true
}

import_image :: proc(editor: ^state, path: string) -> bool {
    return import_image_at(editor, path, {editor.viewport.width * 0.5, editor.viewport.height * 0.5})
}

import_image_at :: proc(editor: ^state, path: string, screen_point: [2]f32) -> bool {
    center := viewport.screen_to_world(editor.viewport, screen_point)
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
            if history_pkg.undo(&editor.history, &editor.document) {
                editor.dirty = true
            }
        } else {
            if history_pkg.redo(&editor.history, &editor.document) {
                editor.dirty = true
            }
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

    if input.pressed[platform.MOUSE_BUTTON_LEFT] && editor.library_open {
        library_index := library_item_at(editor, input.mouse)
        if library_index >= 0 {
            _ = insert_library_item(editor, library_index, input.mouse)
            return
        }
    }

    if editor.selected >= 0 && len(editor.selected_items) == 0 {
        append(&editor.selected_items, editor.selected)
    }

    if input.pressed[platform.MOUSE_BUTTON_LEFT] {
        row, color_index, property_hit := property_action_at(editor.viewport, input.mouse)
        if property_hit && len(editor.selected_items) > 0 {
            if selection_has_locked(editor) {
                return
            }
            finish_transaction(editor)
            begin_transaction(editor)
            palette := doc.palette_colors
            for index in editor.selected_items {
                if index < 0 || index >= len(editor.document.elements) {
                    continue
                }
                element := &editor.document.elements[index]
                if row == 0 {
                    element.fill = palette[color_index]
                    element.fill_style = .solid
                    if element.kind == .text {
                        element.stroke = element.fill
                    }
                } else {
                    element.stroke = palette[color_index]
                    if element.kind == .text {
                        element.fill = element.stroke
                    }
                }
            }
            finish_transaction(editor)
            return
        }
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

    if len(editor.selected_items) > 2 &&
        (input.distribute_horizontal_requested || input.distribute_vertical_requested) {
        if selection_has_locked(editor) {
            return
        }
        finish_transaction(editor)
        begin_transaction(editor)
        distribute_selection(editor, input.distribute_horizontal_requested)
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
        editor.erasing = false
    }
    if input.tool_ellipse_requested {
        editor.select_mode = false
        editor.active_kind = .ellipse
        editor.erasing = false
    }
    if input.tool_diamond_requested {
        editor.select_mode = false
        editor.active_kind = .diamond
        editor.erasing = false
    }
    if input.tool_line_requested {
        editor.select_mode = false
        editor.active_kind = .line
        editor.erasing = false
    }
    if input.tool_arrow_requested {
        editor.select_mode = false
        editor.active_kind = .arrow
        editor.erasing = false
    }
    if input.tool_text_requested {
        editor.select_mode = false
        editor.active_kind = .text
        editor.erasing = false
    }
    if input.tool_freehand_requested {
        editor.select_mode = false
        editor.active_kind = .freehand
        editor.erasing = false
    }
    if input.tool_eraser_requested {
        editor.select_mode = false
        editor.erasing = true
    }
    if input.tool_frame_requested {
        editor.select_mode = false
        editor.active_kind = .frame
        editor.erasing = false
    }
    if input.toggle_grid_requested {
        editor.show_grid = !editor.show_grid
    }
    if input.toggle_snap_requested {
        editor.snap_to_grid = !editor.snap_to_grid
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
            world = snap_point(editor, world, -1, false)
            existing := hit_test(&editor.document, world)
            if existing >= 0 && editor.document.elements[existing].kind == .text && !editor.document.elements[existing].locked {
                begin_transaction(editor)
                clear_selection(editor)
                editor.selected = existing
                append(&editor.selected_items, existing)
                editor.text_index = existing
                editor.text_editing = true
            } else {
                begin_transaction(editor)
                editor.text_index = doc.add_text(&editor.document, world[0], world[1], "", {0.12, 0.12, 0.12, 1.0})
                editor.text_editing = true
            }
        }
        return
    }

    if editor.erasing {
        if input.pressed[platform.MOUSE_BUTTON_LEFT] {
            world := viewport.screen_to_world(editor.viewport, input.mouse)
            begin_transaction(editor)
            erase_at(editor, world)
            editor.eraser_last = world
        } else if input.buttons[platform.MOUSE_BUTTON_LEFT] {
            world := viewport.screen_to_world(editor.viewport, input.mouse)
            erase_at(editor, world)
            editor.eraser_last = world
        }
        if input.released[platform.MOUSE_BUTTON_LEFT] {
            editor.erasing = false
            finish_transaction(editor)
        }
        return
    }

    if editor.select_mode && input.pressed[platform.MOUSE_BUTTON_LEFT] && input.double_click {
        world := viewport.screen_to_world(editor.viewport, input.mouse)
        existing := hit_test(&editor.document, world)
        if existing >= 0 && editor.document.elements[existing].kind == .text && !editor.document.elements[existing].locked {
            begin_transaction(editor)
            clear_selection(editor)
            editor.selected = existing
            append(&editor.selected_items, existing)
            editor.text_index = existing
            editor.text_editing = true
            editor.select_mode = false
            return
        }
    }

    if editor.select_mode {
        update_selection(editor, input)
        return
    }

    if input.pressed[platform.MOUSE_BUTTON_LEFT] {
        world := viewport.screen_to_world(editor.viewport, input.mouse)
        if editor.active_kind == .freehand {
            // freehand keeps the raw pointer path
        } else if editor.active_kind == .line || editor.active_kind == .arrow {
            world = snap_point(editor, world, -1, true)
        } else {
            world = snap_point(editor, world, -1, false)
        }
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
        if editor.active_kind == .freehand {
            // freehand keeps the raw pointer path
        } else if editor.active_kind == .line || editor.active_kind == .arrow {
            world = snap_point(editor, world, editor.active_rect, true)
        } else {
            world = snap_point(editor, world, editor.active_rect, false)
        }
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
            } else if element.kind == .arrow {
                bind_arrow(editor, editor.active_rect)
            }
        }
        editor.active_rect = -1
        finish_transaction(editor)
    }
}

snap_grid_size :: f32(20.0)

snap_point :: proc(editor: ^state, point: [2]f32, exclude_index: int, object_snap: bool) -> [2]f32 {
    result := point
    if editor.snap_to_grid {
        result[0] = math.round(result[0] / snap_grid_size) * snap_grid_size
        result[1] = math.round(result[1] / snap_grid_size) * snap_grid_size
    }
    if !object_snap {
        return result
    }

    threshold := 14.0 / max(0.1, editor.viewport.zoom)
    threshold_squared := threshold * threshold
    best_squared := threshold_squared
    for index in 0 ..< len(editor.document.elements) {
        element := editor.document.elements[index]
        if index == exclude_index || element.locked {
            continue
        }
        if element.kind != .rectangle && element.kind != .ellipse &&
            element.kind != .diamond && element.kind != .image {
            continue
        }
        center_x := element.x + element.width * 0.5
        center_y := element.y + element.height * 0.5
        candidates := [9][2]f32{
            {element.x, element.y},
            {center_x, element.y},
            {element.x + element.width, element.y},
            {element.x, center_y},
            {center_x, center_y},
            {element.x + element.width, center_y},
            {element.x, element.y + element.height},
            {center_x, element.y + element.height},
            {element.x + element.width, element.y + element.height},
        }
        for candidate in candidates {
            delta := result - candidate
            distance_squared := delta[0] * delta[0] + delta[1] * delta[1]
            if distance_squared < best_squared {
                best_squared = distance_squared
                result = candidate
            }
        }
    }
    return result
}

property_action_at :: proc(view: viewport.viewport, point: [2]f32) -> (row, color_index: int, hit: bool) {
    top := view.height - 76.0
    if point[0] < 52 || point[0] > 52 + 5 * 34 || point[1] < top + 4 || point[1] > top + 72 {
        return
    }
    if point[1] < top + 34 {
        row = 0
    } else {
        row = 1
    }
    color_index = int((point[0] - 52) / 34)
    if color_index < 0 || color_index >= len(doc.palette_colors) {
        return 0, 0, false
    }
    swatch_left := 52.0 + f32(color_index) * 34.0
    swatch_top := top + 4.0 + f32(row) * 34.0
    if point[0] < swatch_left || point[0] > swatch_left + 28 || point[1] < swatch_top || point[1] > swatch_top + 28 {
        return 0, 0, false
    }
    return row, color_index, true
}

erase_at :: proc(editor: ^state, point: [2]f32) {
    hit := hit_test(&editor.document, point)
    if hit < 0 || editor.document.elements[hit].locked {
        return
    }
    doc.remove(&editor.document, hit)
    clear_selection(editor)
}

bind_arrow :: proc(editor: ^state, arrow_index: int) {
    if arrow_index < 0 || arrow_index >= len(editor.document.elements) {
        return
    }
    arrow := &editor.document.elements[arrow_index]
    if arrow.kind != .arrow {
        return
    }
    start: [2]f32 = {arrow.x, arrow.y}
    finish: [2]f32 = {arrow.x + arrow.width, arrow.y + arrow.height}
    arrow.start_binding_id = nearest_bindable_id(&editor.document, arrow_index, start)
    arrow.end_binding_id = nearest_bindable_id(&editor.document, arrow_index, finish)
}

nearest_bindable_id :: proc(doc: ^doc.document, excluded_index: int, point: [2]f32, tolerance: f32 = 16.0) -> u64 {
    best_id: u64 = 0
    best_distance := tolerance * tolerance
    for index in 0 ..< len(doc.elements) {
        if index == excluded_index {
            continue
        }
        element := doc.elements[index]
        if element.kind != .rectangle && element.kind != .ellipse && element.kind != .diamond && element.kind != .image {
            continue
        }
        left := element.x - tolerance
        top := element.y - tolerance
        right := element.x + element.width + tolerance
        bottom := element.y + element.height + tolerance
        if point[0] < left || point[0] > right || point[1] < top || point[1] > bottom {
            continue
        }
        center: [2]f32 = {element.x + element.width * 0.5, element.y + element.height * 0.5}
        delta := point - center
        distance := delta[0] * delta[0] + delta[1] * delta[1]
        if best_id == 0 || distance < best_distance {
            best_id = element.id
            best_distance = distance
        }
    }
    return best_id
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
    if point[0] >= tool_rail_x && point[0] <= tool_rail_x + tool_rail_button_size {
        if point[1] >= tool_rail_y {
            index := int((point[1] - tool_rail_y) / (tool_rail_button_size + tool_rail_gap))
            actions := [?]toolbar_action{.select, .rectangle, .ellipse, .diamond, .line, .arrow, .text, .freehand, .eraser, .frame}
            if index >= 0 && index < len(actions) {
                button_top := tool_rail_y + f32(index) * (tool_rail_button_size + tool_rail_gap)
                if point[1] <= button_top + tool_rail_button_size {
                    return actions[index]
                }
            }
        }
    }

    if point[1] < toolbar_y || point[1] > toolbar_y + toolbar_height || point[0] < toolbar_x {
        return .none
    }
    index := int((point[0] - toolbar_x) / (toolbar_button_width + toolbar_button_gap))
    actions := [?]toolbar_action{.undo, .redo, .open, .save, .grid, .export_svg, .import_image, .theme, .export_png, .library}
    if index < 0 || index >= len(actions) {
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
    case .eraser:
        editor.select_mode = false
        editor.erasing = true
    case .frame:
        editor.select_mode = false
        editor.active_kind = .frame
        editor.erasing = false
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
    case .export_png:
        input.export_png_requested = true
    case .library:
        if input.control && len(editor.library_items) > 0 {
            input.save_library_requested = true
        } else if input.shift || len(editor.library_items) == 0 {
            input.open_library_requested = true
        } else {
            editor.library_open = !editor.library_open
        }
    case .grid:
        editor.show_grid = !editor.show_grid
    case .none:
        return
    }
}

library_item_at :: proc(editor: ^state, point: [2]f32) -> int {
    left := editor.viewport.width - library_panel_width
    if point[0] < left || point[1] < library_panel_top {
        return -1
    }
    relative_x := point[0] - (left + 12.0)
    if relative_x < 0 {
        return -1
    }
    column := int(relative_x / (library_item_width + library_item_gap))
    column_left := f32(column) * (library_item_width + library_item_gap)
    if column < 0 || column >= 2 || relative_x > column_left + library_item_width {
        return -1
    }
    row := int((point[1] - library_panel_top) / library_item_height)
    row_top := library_panel_top + f32(row) * library_item_height
    if point[1] > row_top + library_item_height - library_item_gap {
        return -1
    }
    index := row * 2 + column
    if index < 0 || index >= len(editor.library_items) {
        return -1
    }
    return index
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
    case .rectangle, .text, .image, .frame:
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
    snapped_point := point
    if editor.interaction != .move {
        snapped_point = snap_point(editor, snapped_point, -1, false)
    }
    delta := snapped_point - editor.drag_start
    x := editor.start_bounds[0]
    y := editor.start_bounds[1]
    width := editor.start_bounds[2]
    height := editor.start_bounds[3]

    switch editor.interaction {
    case .move:
        x += delta[0]
        y += delta[1]
    case .resize_top_left:
        x = min(snapped_point[0], editor.start_bounds[0] + editor.start_bounds[2] - 1.0)
        y = min(snapped_point[1], editor.start_bounds[1] + editor.start_bounds[3] - 1.0)
        width = max(1.0, editor.start_bounds[0] + editor.start_bounds[2] - x)
        height = max(1.0, editor.start_bounds[1] + editor.start_bounds[3] - y)
    case .resize_top_right:
        y = min(snapped_point[1], editor.start_bounds[1] + editor.start_bounds[3] - 1.0)
        width = max(1.0, snapped_point[0] - editor.start_bounds[0])
        height = max(1.0, editor.start_bounds[1] + editor.start_bounds[3] - y)
    case .resize_bottom_right:
        width = max(1.0, snapped_point[0] - editor.start_bounds[0])
        height = max(1.0, snapped_point[1] - editor.start_bounds[1])
    case .resize_bottom_left:
        x = min(snapped_point[0], editor.start_bounds[0] + editor.start_bounds[2] - 1.0)
        width = max(1.0, editor.start_bounds[0] + editor.start_bounds[2] - x)
        height = max(1.0, snapped_point[1] - editor.start_bounds[1])
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
            if editor.snap_to_grid {
                target_x = math.round(target_x / snap_grid_size) * snap_grid_size
                target_y = math.round(target_y / snap_grid_size) * snap_grid_size
            }
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

distribute_selection :: proc(editor: ^state, horizontal: bool) {
    ordered := make([dynamic]int, 0, len(editor.selected_items))
    defer delete(ordered)
    for index in editor.selected_items {
        append(&ordered, index)
    }
    for left in 1 ..< len(ordered) {
        current := ordered[left]
        current_element := editor.document.elements[current]
        current_position := current_element.y
        if horizontal {
            current_position = current_element.x
        }
        right := left
        for right > 0 {
            previous_element := editor.document.elements[ordered[right - 1]]
            previous_position := previous_element.y
            if horizontal {
                previous_position = previous_element.x
            }
            if previous_position <= current_position {
                break
            }
            ordered[right] = ordered[right - 1]
            right -= 1
        }
        ordered[right] = current
    }

    first := editor.document.elements[ordered[0]]
    last := editor.document.elements[ordered[len(ordered) - 1]]
    first_center := first.y + first.height * 0.5
    last_center := last.y + last.height * 0.5
    if horizontal {
        first_center = first.x + first.width * 0.5
        last_center = last.x + last.width * 0.5
    }
    span := last_center - first_center
    for order in 1 ..< len(ordered) - 1 {
        index := ordered[order]
        element := editor.document.elements[index]
        target_center := first_center + span * f32(order) / f32(len(ordered) - 1)
        x := element.x
        y := element.y
        if horizontal {
            x = target_center - element.width * 0.5
        } else {
            y = target_center - element.height * 0.5
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
    changed := !doc.same(&editor.before, &editor.document)
    history_pkg.record(&editor.history, &editor.before, &editor.document)
    if changed {
        editor.dirty = true
    }
    doc.destroy(&editor.before)
    editor.before_valid = false
}
