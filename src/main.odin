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
    document_path_owned := false
    if len(os.args) > 1 {
        document_path = os.args[1]
        if editor.load(&app_editor, document_path) {
            fmt.printf("loaded %s\n", document_path)
        }
    }
    defer if document_path_owned {
        delete(document_path)
    }

    canvas_renderer, renderer_ok := renderer.open()
    if !renderer_ok {
        return
    }
    defer renderer.destroy(&canvas_renderer)

    input: platform.frame_input
    defer platform.destroy_input(&input)

    fmt.println("samcan native shell")

    for {
        was_text_editing := app_editor.text_editing
        if platform.poll(&app_window, &input) {
            break
        }

        editor.resize(&app_editor, f32(app_window.width), f32(app_window.height))
        editor.update(&app_editor, &input)

        if input.tool_text_requested {
            platform.start_text_input(&app_window)
        }
        if input.escape_requested {
            if was_text_editing {
                platform.stop_text_input(&app_window)
            } else {
                break
            }
        }

        if input.open_requested {
            platform.show_open_dialog(&app_window)
        }
        if input.save_as_requested {
            platform.show_save_dialog(&app_window)
        }

        dialog_kind, dialog_path, dialog_ready := platform.take_dialog_result(&app_window)
        if dialog_ready && dialog_path != "" {
            switch dialog_kind {
            case .NONE:
                delete(dialog_path)
            case .OPEN:
                if editor.load(&app_editor, dialog_path) {
                    if document_path_owned {
                        delete(document_path)
                    }
                    document_path = dialog_path
                    document_path_owned = true
                    fmt.printf("loaded %s\n", document_path)
                } else {
                    fmt.printf("open failed: %s\n", dialog_path)
                    delete(dialog_path)
                }
            case .SAVE:
                if editor.save(&app_editor, dialog_path) {
                    if document_path_owned {
                        delete(document_path)
                    }
                    document_path = dialog_path
                    document_path_owned = true
                    fmt.printf("saved %s\n", document_path)
                } else {
                    fmt.printf("save failed: %s\n", dialog_path)
                    delete(dialog_path)
                }
            }
        }

        if input.save_requested {
            if document_path == "" {
                platform.show_save_dialog(&app_window)
            } else if editor.save(&app_editor, document_path) {
                fmt.printf("saved %s\n", document_path)
            } else {
                fmt.printf("save failed: %s\n", document_path)
            }
        }

        platform.begin_frame(&app_window)
        renderer.draw(
            &canvas_renderer,
            &app_editor.document,
            app_editor.viewport,
            app_editor.selected,
            app_editor.selected_items[:],
            app_editor.lassoing,
            app_editor.lasso_start,
            app_editor.lasso_current,
            app_editor.select_mode,
            app_editor.active_kind,
            app_editor.show_grid,
        )
        platform.end_frame(&app_window)
    }
}
