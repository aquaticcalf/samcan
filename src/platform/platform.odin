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
    save_requested: bool,
    open_requested: bool,
    save_as_requested: bool,
    undo_requested: bool,
    redo_requested: bool,
    tool_rectangle_requested: bool,
    tool_ellipse_requested: bool,
    tool_diamond_requested: bool,
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
    input.save_requested = false
    input.open_requested = false
    input.save_as_requested = false
    input.undo_requested = false
    input.redo_requested = false
    input.tool_rectangle_requested = false
    input.tool_ellipse_requested = false
    input.tool_diamond_requested = false
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
                quit = true
            }
            if event.key.key == SDL.K_S && (event.key.mod & SDL.KMOD_CTRL) != {} {
                if (event.key.mod & SDL.KMOD_SHIFT) != {} {
                    input.save_as_requested = true
                } else {
                    input.save_requested = true
                }
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
            if event.key.key == SDL.K_R && event.key.mod == {} {
                input.tool_rectangle_requested = true
            }
            if event.key.key == SDL.K_E && event.key.mod == {} {
                input.tool_ellipse_requested = true
            }
            if event.key.key == SDL.K_D && event.key.mod == {} {
                input.tool_diamond_requested = true
            }
        }
    }
    return
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

show_dialog :: proc(window: ^window, kind: dialog_kind) -> bool {
    if window.dialog.pending {
        return false
    }

    delete(window.dialog.path)
    window.dialog.path = ""
    window.dialog.pending = true
    window.dialog.result_ready = false
    window.dialog.kind = kind

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
    case .SAVE:
        SDL.ShowSaveFileDialog(
            file_dialog_callback,
            rawptr(window),
            window.handle,
            &window.dialog.filter,
            1,
            nil,
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
