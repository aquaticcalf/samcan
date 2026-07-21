package main

import "core:fmt"
import "core:os"

import editor "editor"
import platform "platform"
import renderer "renderer"

main :: proc() {
    app_window, ok := platform.open("samcan", 1280, 800)
    if !ok {
        return
    }
    defer platform.close(&app_window)

    app_editor := editor.new(f32(app_window.width), f32(app_window.height))
    defer editor.destroy(&app_editor)

    document_path := ""
    if len(os.args) > 1 {
        document_path = os.args[1]
        if editor.load(&app_editor, document_path) {
            fmt.printf("loaded %s\n", document_path)
        }
    }

    canvas_renderer, renderer_ok := renderer.open()
    if !renderer_ok {
        return
    }
    defer renderer.destroy(&canvas_renderer)

    input: platform.frame_input

    fmt.println("samcan native shell")

    for {
        if platform.poll(&app_window, &input) {
            break
        }

        editor.resize(&app_editor, f32(app_window.width), f32(app_window.height))
        editor.update(&app_editor, &input)

        if input.save_requested {
            if document_path == "" {
                fmt.println("save skipped: pass a .excalidraw path as the first argument")
            } else if editor.save(&app_editor, document_path) {
                fmt.printf("saved %s\n", document_path)
            } else {
                fmt.printf("save failed: %s\n", document_path)
            }
        }

        platform.begin_frame(&app_window)
        renderer.draw(&canvas_renderer, &app_editor.document, app_editor.viewport)
        platform.end_frame(&app_window)
    }
}
