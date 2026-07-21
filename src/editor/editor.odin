package editor

import "core:math"

import doc "../document"
import history_pkg "../history"
import platform "../platform"
import storage "../storage"
import viewport "../viewport"

state :: struct {
    document:    doc.document,
    viewport:    viewport.viewport,
    drawing:     bool,
    active_rect: int,
    active_kind: doc.element_kind,
    history:     history_pkg.state,
    before:      doc.document,
    before_valid: bool,
}

new :: proc(width, height: f32) -> state {
    return state{
        document = doc.new(),
        viewport = viewport.new(width, height),
        active_rect = -1,
        active_kind = .rectangle,
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

    if input.tool_rectangle_requested {
        editor.active_kind = .rectangle
    }
    if input.tool_ellipse_requested {
        editor.active_kind = .ellipse
    }
    if input.tool_diamond_requested {
        editor.active_kind = .diamond
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
        editor.drawing = true
    }

    if editor.drawing && editor.active_rect >= 0 {
        world := viewport.screen_to_world(editor.viewport, input.mouse)
        element := editor.document.elements[editor.active_rect]
        x := min(element.x, world[0])
        y := min(element.y, world[1])
        width := math.abs(world[0] - element.x)
        height := math.abs(world[1] - element.y)
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
