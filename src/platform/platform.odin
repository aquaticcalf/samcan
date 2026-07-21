package platform

import "core:c"
import "core:fmt"

import gl "vendor:OpenGL"
import SDL "vendor:sdl3"

window :: struct {
    handle:  ^SDL.Window,
    ctx:     SDL.GLContext,
    width:   i32,
    height:  i32,
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
    ok = true
    return
}

poll :: proc(window: ^window) -> (quit: bool) {
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
