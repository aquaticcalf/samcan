package platform

import "core:c"
import "core:fmt"
import "core:strings"
import "base:runtime"

import gl "vendor:OpenGL"
import SDL "vendor:sdl3"

dialog_kind :: enum {
    NONE,
    OPEN,
    SAVE,
    EXPORT_SVG,
    IMPORT_IMAGE,
}

dialog_state :: struct {
    pending:      bool,
    result_ready: bool,
    kind:         dialog_kind,
    path:         string,
    filter:       SDL.DialogFileFilter,
    filter_name:  cstring,
    filter_pattern:cstring,
}

window :: struct {
    handle:  ^SDL.Window,
    ctx:     SDL.GLContext,
    width:   i32,
    height:  i32,
    dialog:  dialog_state,
}

MOUSE_BUTTON_LEFT   :: 1
MOUSE_BUTTON_MIDDLE :: 2
MOUSE_BUTTON_RIGHT  :: 3

frame_input :: struct {
    mouse:          [2]f32,
    mouse_delta:    [2]f32,
    wheel:          f32,
    modifiers:      SDL.Keymod,
    shift:          bool,
    control:        bool,
    save_requested: bool,
    open_requested: bool,
    save_as_requested: bool,
    export_svg_requested: bool,
    import_image_requested: bool,
    undo_requested: bool,
    redo_requested: bool,
    delete_requested: bool,
    duplicate_requested: bool,
    copy_requested: bool,
    cut_requested: bool,
    paste_requested: bool,
    group_requested: bool,
    ungroup_requested: bool,
    toggle_lock_requested: bool,
    align_left_requested: bool,
    align_center_horizontal_requested: bool,
    align_right_requested: bool,
    align_top_requested: bool,
    align_center_vertical_requested: bool,
    align_bottom_requested: bool,
    rotate_left_requested: bool,
    rotate_right_requested: bool,
    select_all_requested: bool,
    bring_forward_requested: bool,
    send_backward_requested: bool,
    bring_to_front_requested: bool,
    send_to_back_requested: bool,
    text_input: string,
    backspace_requested: bool,
    enter_requested: bool,
    escape_requested: bool,
    tool_rectangle_requested: bool,
    tool_ellipse_requested: bool,
    tool_diamond_requested: bool,
    tool_line_requested: bool,
    tool_arrow_requested: bool,
    tool_text_requested: bool,
    tool_freehand_requested: bool,
    tool_select_requested: bool,
    toggle_grid_requested: bool,
    buttons:        [8]bool,
    pressed:        [8]bool,
    released:       [8]bool,
}

open :: proc(title: cstring, width, height: i32) -> (result: window, ok: bool) {
    result = {}

    if !SDL.Init(SDL.INIT_VIDEO) {
        fmt.eprintf("sdl init failed: %s\n", SDL.GetError())
        return
    }
    
    SDL.GL_SetAttribute(SDL.GLAttr.CONTEXT_MAJOR_VERSION, 3)
    SDL.GL_SetAttribute(SDL.GLAttr.CONTEXT_MINOR_VERSION, 3)
    SDL.GL_SetAttribute(SDL.GLAttr.CONTEXT_PROFILE_MASK, c.int(SDL.GLProfile.CORE))
    SDL.GL_SetAttribute(SDL.GLAttr.DOUBLEBUFFER, 1)

    result.handle = SDL.CreateWindow(
        title,
        c.int(width),
        c.int(height),
        SDL.WINDOW_OPENGL | SDL.WINDOW_RESIZABLE | SDL.WINDOW_HIGH_PIXEL_DENSITY,
    )
    if result.handle == nil {
        fmt.eprintf("sdl window creation failed: %s\n", SDL.GetError())
        close(&result)
        return
    }

    result.ctx = SDL.GL_CreateContext(result.handle)
    if result.ctx == nil {
        fmt.eprintf("opengl context creation failed: %s\n", SDL.GetError())
        close(&result)
        return
    }

    if !SDL.GL_MakeCurrent(result.handle, result.ctx) {
        fmt.eprintf("opengl context activation failed: %s\n", SDL.GetError())
        close(&result)
        return
    }

    gl.load_up_to(3, 3, SDL.gl_set_proc_address)
    SDL.GL_SetSwapInterval(1)

    result.width = width
    result.height = height
    result.dialog.filter_name = cstring("excalidraw")
    result.dialog.filter_pattern = cstring("*.excalidraw")
    result.dialog.filter = SDL.DialogFileFilter{
        name = result.dialog.filter_name,
        pattern = result.dialog.filter_pattern,
    }
    ok = true
    return
}

poll :: proc(window: ^window, input: ^frame_input) -> (quit: bool) {
    input.mouse_delta = {}
    input.wheel = 0
    input.modifiers = SDL.GetModState()
    input.shift = (input.modifiers & SDL.KMOD_SHIFT) != {}
    input.control = (input.modifiers & SDL.KMOD_CTRL) != {}
    input.save_requested = false
    input.open_requested = false
    input.save_as_requested = false
    input.export_svg_requested = false
    input.import_image_requested = false
    input.undo_requested = false
    input.redo_requested = false
    input.delete_requested = false
    input.duplicate_requested = false
    input.copy_requested = false
    input.cut_requested = false
    input.paste_requested = false
    input.group_requested = false
    input.ungroup_requested = false
    input.toggle_lock_requested = false
    input.align_left_requested = false
    input.align_center_horizontal_requested = false
    input.align_right_requested = false
    input.align_top_requested = false
    input.align_center_vertical_requested = false
    input.align_bottom_requested = false
    input.rotate_left_requested = false
    input.rotate_right_requested = false
    input.select_all_requested = false
    input.bring_forward_requested = false
    input.send_backward_requested = false
    input.bring_to_front_requested = false
    input.send_to_back_requested = false
    delete(input.text_input)
    input.text_input = ""
    input.backspace_requested = false
    input.enter_requested = false
    input.escape_requested = false
    input.tool_rectangle_requested = false
    input.tool_ellipse_requested = false
    input.tool_diamond_requested = false
    input.tool_line_requested = false
    input.tool_arrow_requested = false
    input.tool_text_requested = false
    input.tool_freehand_requested = false
    input.tool_select_requested = false
    input.toggle_grid_requested = false
    input.pressed = {}
    input.released = {}

    event: SDL.Event
    for SDL.PollEvent(&event) {
        #partial switch event.type {
        case .QUIT, .WINDOW_CLOSE_REQUESTED:
            quit = true
        case .WINDOW_RESIZED, .WINDOW_PIXEL_SIZE_CHANGED:
            if event.window.windowID == SDL.GetWindowID(window.handle) {
                window.width = i32(event.window.data1)
                window.height = i32(event.window.data2)
            }
        case .MOUSE_MOTION:
            input.mouse = {event.motion.x, event.motion.y}
            input.mouse_delta += {event.motion.xrel, event.motion.yrel}
        case .MOUSE_BUTTON_DOWN, .MOUSE_BUTTON_UP:
            index := int(event.button.button)
            if index >= 0 && index < len(input.buttons) {
                input.buttons[index] = event.button.down
                if event.button.down {
                    input.pressed[index] = true
                } else {
                    input.released[index] = true
                }
            }
        case .MOUSE_WHEEL:
            input.wheel += event.wheel.y
            input.mouse = {event.wheel.mouse_x, event.wheel.mouse_y}
        case .KEY_DOWN:
            if event.key.key == SDL.K_ESCAPE {
                input.escape_requested = true
            }
            if event.key.key == SDL.K_S && (event.key.mod & SDL.KMOD_CTRL) != {} {
                if (event.key.mod & SDL.KMOD_SHIFT) != {} {
                    input.save_as_requested = true
                } else {
                    input.save_requested = true
                }
            }
            if event.key.key == SDL.K_E && (event.key.mod & SDL.KMOD_CTRL) != {} {
                input.export_svg_requested = true
            }
            if event.key.key == SDL.K_I && (event.key.mod & SDL.KMOD_CTRL) != {} && (event.key.mod & SDL.KMOD_SHIFT) != {} {
                input.import_image_requested = true
            }
            if event.key.key == SDL.K_O && (event.key.mod & SDL.KMOD_CTRL) != {} {
                input.open_requested = true
            }
            if event.key.key == SDL.K_Z && (event.key.mod & SDL.KMOD_CTRL) != {} {
                if (event.key.mod & SDL.KMOD_SHIFT) != {} {
                    input.redo_requested = true
                } else {
                    input.undo_requested = true
                }
            }
            if event.key.key == SDL.K_Y && (event.key.mod & SDL.KMOD_CTRL) != {} {
                input.redo_requested = true
            }
            if event.key.key == SDL.K_DELETE || event.key.key == SDL.K_BACKSPACE {
                input.delete_requested = true
            }
            if event.key.key == SDL.K_BACKSPACE {
                input.backspace_requested = true
            }
            if event.key.key == SDL.K_RETURN {
                input.enter_requested = true
            }
            if event.key.key == SDL.K_D && (event.key.mod & SDL.KMOD_CTRL) != {} {
                input.duplicate_requested = true
            }
            if event.key.key == SDL.K_C && (event.key.mod & SDL.KMOD_CTRL) != {} {
                input.copy_requested = true
            }
            if event.key.key == SDL.K_X && (event.key.mod & SDL.KMOD_CTRL) != {} {
                input.cut_requested = true
            }
            if event.key.key == SDL.K_V && (event.key.mod & SDL.KMOD_CTRL) != {} {
                input.paste_requested = true
            }
            if event.key.key == SDL.K_G && (event.key.mod & SDL.KMOD_CTRL) != {} {
                if (event.key.mod & SDL.KMOD_SHIFT) != {} {
                    input.ungroup_requested = true
                } else {
                    input.group_requested = true
                }
            }
            if event.key.key == SDL.K_L && (event.key.mod & SDL.KMOD_CTRL) != {} && (event.key.mod & SDL.KMOD_SHIFT) != {} {
                input.toggle_lock_requested = true
            }
            if (event.key.mod & SDL.KMOD_CTRL) != {} && (event.key.mod & SDL.KMOD_ALT) != {} {
                if event.key.key == SDL.K_LEFT {
                    if (event.key.mod & SDL.KMOD_SHIFT) != {} {
                        input.align_center_horizontal_requested = true
                    } else {
                        input.align_left_requested = true
                    }
                }
                if event.key.key == SDL.K_RIGHT {
                    if (event.key.mod & SDL.KMOD_SHIFT) != {} {
                        input.align_center_horizontal_requested = true
                    } else {
                        input.align_right_requested = true
                    }
                }
                if event.key.key == SDL.K_UP {
                    if (event.key.mod & SDL.KMOD_SHIFT) != {} {
                        input.align_center_vertical_requested = true
                    } else {
                        input.align_top_requested = true
                    }
                }
                if event.key.key == SDL.K_DOWN {
                    if (event.key.mod & SDL.KMOD_SHIFT) != {} {
                        input.align_center_vertical_requested = true
                    } else {
                        input.align_bottom_requested = true
                    }
                }
                if event.key.key == SDL.K_LEFTBRACKET {
                    input.rotate_left_requested = true
                }
                if event.key.key == SDL.K_RIGHTBRACKET {
                    input.rotate_right_requested = true
                }
            }
            if event.key.key == SDL.K_A && (event.key.mod & SDL.KMOD_CTRL) != {} {
                input.select_all_requested = true
            }
            if event.key.key == SDL.K_RIGHTBRACKET && (event.key.mod & SDL.KMOD_CTRL) != {} {
                if (event.key.mod & SDL.KMOD_SHIFT) != {} {
                    input.bring_to_front_requested = true
                } else {
                    input.bring_forward_requested = true
                }
            }
            if event.key.key == SDL.K_LEFTBRACKET && (event.key.mod & SDL.KMOD_CTRL) != {} {
                if (event.key.mod & SDL.KMOD_SHIFT) != {} {
                    input.send_to_back_requested = true
                } else {
                    input.send_backward_requested = true
                }
            }
            if event.key.key == SDL.K_R && event.key.mod == {} {
                input.tool_rectangle_requested = true
            }
            if event.key.key == SDL.K_E && event.key.mod == {} {
                input.tool_ellipse_requested = true
            }
            if event.key.key == SDL.K_D && event.key.mod == {} {
                input.tool_diamond_requested = true
            }
            if event.key.key == SDL.K_V && event.key.mod == {} {
                input.tool_select_requested = true
            }
            if event.key.key == SDL.K_L && event.key.mod == {} {
                input.tool_line_requested = true
            }
            if event.key.key == SDL.K_A && event.key.mod == {} {
                input.tool_arrow_requested = true
            }
            if event.key.key == SDL.K_T && event.key.mod == {} {
                input.tool_text_requested = true
            }
            if event.key.key == SDL.K_F && event.key.mod == {} {
                input.tool_freehand_requested = true
            }
            if event.key.key == SDL.K_G && event.key.mod == {} {
                input.toggle_grid_requested = true
            }
        case .TEXT_INPUT:
            if event.text.text != nil {
                incoming := string(event.text.text)
                if input.text_input == "" {
                    input.text_input = strings.clone(incoming)
                } else {
                    parts := [2]string{input.text_input, incoming}
                    combined := strings.concatenate(parts[:])
                    delete(input.text_input)
                    input.text_input = combined
                }
            }
        }
    }
    input.modifiers = SDL.GetModState()
    input.shift = (input.modifiers & SDL.KMOD_SHIFT) != {}
    input.control = (input.modifiers & SDL.KMOD_CTRL) != {}
    return
}

start_text_input :: proc(window: ^window) -> bool {
    return SDL.StartTextInput(window.handle)
}

stop_text_input :: proc(window: ^window) -> bool {
    return SDL.StopTextInput(window.handle)
}

destroy_input :: proc(input: ^frame_input) {
    delete(input.text_input)
    input.text_input = ""
}

begin_frame :: proc(window: ^window) {
    gl.Viewport(0, 0, window.width, window.height)
    gl.ClearColor(0.97, 0.97, 0.97, 1.0)
    gl.Clear(u32(gl.GL_Enum.COLOR_BUFFER_BIT))
}

end_frame :: proc(window: ^window) {
    SDL.GL_SwapWindow(window.handle)
}

close :: proc(window: ^window) {
    delete(window.dialog.path)
    if window.ctx != nil {
        SDL.GL_DestroyContext(window.ctx)
        window.ctx = nil
    }
    if window.handle != nil {
        SDL.DestroyWindow(window.handle)
        window.handle = nil
    }
    SDL.Quit()
}

show_open_dialog :: proc(window: ^window) -> bool {
    return show_dialog(window, .OPEN)
}

show_save_dialog :: proc(window: ^window) -> bool {
    return show_dialog(window, .SAVE)
}

show_svg_dialog :: proc(window: ^window) -> bool {
    return show_dialog(window, .EXPORT_SVG)
}

show_image_dialog :: proc(window: ^window) -> bool {
    return show_dialog(window, .IMPORT_IMAGE)
}

show_dialog :: proc(window: ^window, kind: dialog_kind) -> bool {
    if window.dialog.pending {
        return false
    }

    delete(window.dialog.path)
    window.dialog.path = ""
    window.dialog.pending = true
    window.dialog.result_ready = false
    window.dialog.kind = kind

    if kind == .EXPORT_SVG {
        window.dialog.filter_name = cstring("svg")
        window.dialog.filter_pattern = cstring("*.svg")
    } else if kind == .IMPORT_IMAGE {
        window.dialog.filter_name = cstring("images")
        window.dialog.filter_pattern = cstring("*.png;*.jpg;*.jpeg;*.gif;*.bmp;*.tga;*.hdr")
    } else {
        window.dialog.filter_name = cstring("excalidraw")
        window.dialog.filter_pattern = cstring("*.excalidraw")
    }
    window.dialog.filter = SDL.DialogFileFilter{
        name = window.dialog.filter_name,
        pattern = window.dialog.filter_pattern,
    }

    switch kind {
    case .NONE:
        return false
    case .OPEN:
        SDL.ShowOpenFileDialog(
            file_dialog_callback,
            rawptr(window),
            window.handle,
            &window.dialog.filter,
            1,
            nil,
            false,
        )
    case .SAVE, .EXPORT_SVG:
        SDL.ShowSaveFileDialog(
            file_dialog_callback,
            rawptr(window),
            window.handle,
            &window.dialog.filter,
            1,
            nil,
        )
    case .IMPORT_IMAGE:
        SDL.ShowOpenFileDialog(
            file_dialog_callback,
            rawptr(window),
            window.handle,
            &window.dialog.filter,
            1,
            nil,
            false,
        )
    }
    return true
}

file_dialog_callback :: proc "c" (userdata: rawptr, filelist: [^]cstring, filter: c.int) {
    context = runtime.default_context()
    window := (^window)(userdata)
    window.dialog.pending = false
    window.dialog.result_ready = true
    delete(window.dialog.path)

    if filelist != nil && filelist[0] != nil {
        window.dialog.path = strings.clone(string(filelist[0]))
    }
}

take_dialog_result :: proc(window: ^window) -> (kind: dialog_kind, path: string, ready: bool) {
    if !window.dialog.result_ready {
        return
    }

    kind = window.dialog.kind
    path = window.dialog.path
    window.dialog.path = ""
    window.dialog.kind = .NONE
    window.dialog.result_ready = false
    ready = true
    return
}
