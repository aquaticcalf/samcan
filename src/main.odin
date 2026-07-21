package main

import "core:fmt"
import "core:os"

import editor "editor"
import platform "platform"
import renderer "renderer"
import storage "storage"

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
            if storage.has_autosave(document_path) {
                fmt.printf("recovery available at %s\n", storage.autosave_path(document_path))
            }
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
    last_autosave_tick := platform.ticks_ms()

    for {
        was_text_editing := app_editor.text_editing
        if platform.poll(&app_window, &input) {
            break
        }

        if input.paste_requested && app_editor.text_editing && platform.has_clipboard_text() {
            delete(input.text_input)
            input.text_input = platform.get_clipboard_text()
        }

        editor.resize(&app_editor, f32(app_window.width), f32(app_window.height))
        editor.update(&app_editor, &input)

        if input.dropped_file != "" {
            if editor.import_image_at(&app_editor, input.dropped_file, input.drop_position) {
                fmt.printf("imported %s\n", input.dropped_file)
            } else {
                fmt.printf("drop import failed: %s\n", input.dropped_file)
            }
        }

        if document_path != "" && app_editor.dirty {
            now := platform.ticks_ms()
            if now - last_autosave_tick >= 5000 {
                if editor.autosave(&app_editor, document_path) {
                    fmt.printf("autosaved %s\n", storage.autosave_path(document_path))
                    last_autosave_tick = now
                }
            }
        }

        if input.copy_requested {
            copied_text := editor.selected_text(&app_editor)
            if copied_text != "" {
                _ = platform.set_clipboard_text(copied_text)
            }
            delete(copied_text)
        }
        if input.paste_requested && !was_text_editing && len(app_editor.clipboard.elements) == 0 && platform.has_clipboard_text() {
            pasted_text := platform.get_clipboard_text()
            _ = editor.paste_text(&app_editor, pasted_text)
            delete(pasted_text)
        }

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
        if input.export_svg_requested {
            platform.show_svg_dialog(&app_window)
        }
        if input.import_image_requested {
            platform.show_image_dialog(&app_window)
        }
        if input.export_png_requested {
            platform.show_png_dialog(&app_window)
        }
        if input.open_library_requested {
            platform.show_library_open_dialog(&app_window)
        }
        if input.save_library_requested {
            platform.show_library_save_dialog(&app_window)
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
            case .EXPORT_SVG:
                if editor.save_svg(&app_editor, dialog_path) {
                    fmt.printf("exported %s\n", dialog_path)
                } else {
                    fmt.printf("svg export failed: %s\n", dialog_path)
                }
                delete(dialog_path)
            case .IMPORT_IMAGE:
                if editor.import_image(&app_editor, dialog_path) {
                    fmt.printf("imported %s\n", dialog_path)
                } else {
                    fmt.printf("image import failed: %s\n", dialog_path)
                }
                delete(dialog_path)
            case .EXPORT_PNG:
                if renderer.save_png(dialog_path, app_window.width, app_window.height) {
                    fmt.printf("exported %s\n", dialog_path)
                } else {
                    fmt.printf("png export failed: %s\n", dialog_path)
                }
                delete(dialog_path)
            case .OPEN_LIBRARY:
                if editor.load_library(&app_editor, dialog_path) {
                    fmt.printf("loaded library %s\n", dialog_path)
                } else {
                    fmt.printf("library load failed: %s\n", dialog_path)
                }
                delete(dialog_path)
            case .SAVE_LIBRARY:
                if editor.save_library(&app_editor, dialog_path) {
                    fmt.printf("saved library %s\n", dialog_path)
                } else {
                    fmt.printf("library save failed: %s\n", dialog_path)
                }
                delete(dialog_path)
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

        platform.begin_frame(&app_window, app_editor.dark_mode)
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
            app_editor.dark_mode,
            app_editor.erasing,
            app_editor.library_open,
            len(app_editor.library_items),
        )
        platform.end_frame(&app_window)
    }
}
