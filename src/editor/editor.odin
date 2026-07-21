package editor

import "core:math"

import doc "../document"
import platform "../platform"
import storage "../storage"
import viewport "../viewport"

state :: struct {
    document:    doc.document,
    viewport:    viewport.viewport,
    drawing:     bool,
    active_rect: int,
    active_kind: doc.element_kind,
}

new :: proc(width, height: f32) -> state {
    return state{
        document = doc.new(),
        viewport = viewport.new(width, height),
        active_rect = -1,
        active_kind = .rectangle,
    }
}

destroy :: proc(editor: ^state) {
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
    return true
}

save :: proc(editor: ^state, path: string) -> bool {
    return storage.save(path, &editor.document)
}

resize :: proc(editor: ^state, width, height: f32) {
    viewport.resize(&editor.viewport, width, height)
}

update :: proc(editor: ^state, input: ^platform.frame_input) {
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
    }
}
