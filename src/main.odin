package main

import "core:fmt"

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

        platform.begin_frame(&app_window)
        renderer.draw(&canvas_renderer, &app_editor.document, app_editor.viewport)
        platform.end_frame(&app_window)
    }
}
