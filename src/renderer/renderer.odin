package renderer

import "core:fmt"

import gl "vendor:OpenGL"
import document "../document"
import viewport "../viewport"

vertex :: struct {
    position: [2]f32,
    color:    [4]f32,
}

renderer :: struct {
    program:  u32,
    vao:      u32,
    vbo:      u32,
    vertices: [dynamic]vertex,
}

vertex_shader :: `#version 330 core
layout (location = 0) in vec2 a_position;
layout (location = 1) in vec4 a_color;
out vec4 v_color;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_color = a_color;
}`

fragment_shader :: `#version 330 core
in vec4 v_color;
out vec4 color;
void main() {
    color = v_color;
}`

open :: proc() -> (result: renderer, ok: bool) {
    result.vertices = make([dynamic]vertex, 0)

    result.program, ok = gl.load_shaders_source(vertex_shader, fragment_shader)
    if !ok {
        compile_message, _, link_message, _ := gl.get_last_error_messages()
        fmt.eprintf("shader setup failed: %s %s\n", compile_message, link_message)
        return
    }

    gl.GenVertexArrays(1, &result.vao)
    gl.GenBuffers(1, &result.vbo)
    gl.BindVertexArray(result.vao)
    gl.BindBuffer(gl.ARRAY_BUFFER, result.vbo)

    stride := i32(size_of(vertex))
    gl.VertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0)
    gl.EnableVertexAttribArray(0)
    gl.VertexAttribPointer(1, 4, gl.FLOAT, false, stride, uintptr(size_of([2]f32)))
    gl.EnableVertexAttribArray(1)

    ok = true
    return
}

destroy :: proc(renderer: ^renderer) {
    if renderer.vbo != 0 {
        gl.DeleteBuffers(1, &renderer.vbo)
    }
    if renderer.vao != 0 {
        gl.DeleteVertexArrays(1, &renderer.vao)
    }
    if renderer.program != 0 {
        gl.DeleteProgram(renderer.program)
    }
    delete(renderer.vertices)
    renderer^ = {}
}

screen_to_clip :: proc(view: viewport.viewport, point: [2]f32) -> [2]f32 {
    screen := viewport.world_to_screen(view, point)
    return {
        (screen[0] / view.width) * 2.0 - 1.0,
        1.0 - (screen[1] / view.height) * 2.0,
    }
}

append_triangle :: proc(vertices: ^[dynamic]vertex, a, b, c: [2]f32, color: [4]f32) {
    append(vertices, vertex{position = a, color = color})
    append(vertices, vertex{position = b, color = color})
    append(vertices, vertex{position = c, color = color})
}

draw :: proc(renderer: ^renderer, doc: ^document.document, view: viewport.viewport) {
    clear(&renderer.vertices)

    for rect in doc.rectangles {
        top_left := screen_to_clip(view, {rect.x, rect.y})
        top_right := screen_to_clip(view, {rect.x + rect.width, rect.y})
        bottom_right := screen_to_clip(view, {rect.x + rect.width, rect.y + rect.height})
        bottom_left := screen_to_clip(view, {rect.x, rect.y + rect.height})

        append_triangle(&renderer.vertices, top_left, top_right, bottom_right, rect.fill)
        append_triangle(&renderer.vertices, top_left, bottom_right, bottom_left, rect.fill)
    }

    if len(renderer.vertices) == 0 {
        return
    }

    gl.UseProgram(renderer.program)
    gl.BindVertexArray(renderer.vao)
    gl.BindBuffer(gl.ARRAY_BUFFER, renderer.vbo)
    gl.BufferData(
        gl.ARRAY_BUFFER,
        len(renderer.vertices) * size_of(vertex),
        raw_data(renderer.vertices),
        gl.DYNAMIC_DRAW,
    )
    gl.DrawArrays(gl.TRIANGLES, 0, i32(len(renderer.vertices)))
}
