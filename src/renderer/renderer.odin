package renderer

import "core:fmt"
import "core:math"

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

append_shape :: proc(vertices: ^[dynamic]vertex, element: document.element, view: viewport.viewport) {
    left := element.x
    top := element.y
    right := element.x + element.width
    bottom := element.y + element.height

    switch element.kind {
    case .rectangle:
        top_left := screen_to_clip(view, {left, top})
        top_right := screen_to_clip(view, {right, top})
        bottom_right := screen_to_clip(view, {right, bottom})
        bottom_left := screen_to_clip(view, {left, bottom})

        append_triangle(vertices, top_left, top_right, bottom_right, element.fill)
        append_triangle(vertices, top_left, bottom_right, bottom_left, element.fill)
    case .diamond:
        center := screen_to_clip(view, {(left + right) * 0.5, (top + bottom) * 0.5})
        top_point := screen_to_clip(view, {(left + right) * 0.5, top})
        right_point := screen_to_clip(view, {right, (top + bottom) * 0.5})
        bottom_point := screen_to_clip(view, {(left + right) * 0.5, bottom})
        left_point := screen_to_clip(view, {left, (top + bottom) * 0.5})

        append_triangle(vertices, center, top_point, right_point, element.fill)
        append_triangle(vertices, center, right_point, bottom_point, element.fill)
        append_triangle(vertices, center, bottom_point, left_point, element.fill)
        append_triangle(vertices, center, left_point, top_point, element.fill)
    case .ellipse:
        center := screen_to_clip(view, {(left + right) * 0.5, (top + bottom) * 0.5})
        radius_x := element.width * 0.5
        radius_y := element.height * 0.5
        segments :: 32
        tau: f32 = 6.283185307179586
        previous := screen_to_clip(view, {
            (left + right) * 0.5 + math.cos(f32(0)) * radius_x,
            (top + bottom) * 0.5 + math.sin(f32(0)) * radius_y,
        })

        for segment in 1 ..= segments {
            angle := tau * f32(segment) / f32(segments)
            current := screen_to_clip(view, {
                (left + right) * 0.5 + math.cos(angle) * radius_x,
                (top + bottom) * 0.5 + math.sin(angle) * radius_y,
            })
            append_triangle(vertices, center, previous, current, element.fill)
            previous = current
        }
    }
}

draw :: proc(renderer: ^renderer, doc: ^document.document, view: viewport.viewport) {
    clear(&renderer.vertices)

    for element in doc.elements {
        append_shape(&renderer.vertices, element, view)
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
