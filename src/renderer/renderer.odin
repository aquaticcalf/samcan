package renderer

import "core:fmt"
import "core:math"

import gl "vendor:OpenGL"
import font "vendor:stb/easy_font"
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
    case .line:
        append_segment(
            vertices,
            view,
            {left, top},
            {right, bottom},
            element.fill,
            3.0 / view.zoom,
        )
    case .arrow:
        start := [2]f32{left, top}
        finish := [2]f32{right, bottom}
        append_segment(vertices, view, start, finish, element.fill, 3.0 / view.zoom)
        append_arrowhead(vertices, view, start, finish, element.fill)
    case .text:
        append_text(vertices, view, element)
    case .freehand:
        if len(element.points) >= 2 {
            for point_index in 1 ..< len(element.points) {
                append_segment(
                    vertices,
                    view,
                    element.points[point_index - 1],
                    element.points[point_index],
                    element.fill,
                    3.0 / view.zoom,
                )
            }
        }
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

append_text :: proc(vertices: ^[dynamic]vertex, view: viewport.viewport, element: document.element) {
    if element.text == "" {
        return
    }

    quad_capacity := max(1, len(element.text) * 8)
    quads := make([]font.Quad, quad_capacity)
    defer delete(quads)

    color: font.Color = {
        u8(max(0, min(255, int(element.fill[0] * 255.0)))),
        u8(max(0, min(255, int(element.fill[1] * 255.0)))),
        u8(max(0, min(255, int(element.fill[2] * 255.0)))),
        u8(max(0, min(255, int(element.fill[3] * 255.0)))),
    }
    count := font.print_quad_buffer(element.x, element.y, element.text, color, quads)
    for quad in quads[:count] {
        top_left := screen_to_clip(view, {quad.tl.v[0], quad.tl.v[1]})
        top_right := screen_to_clip(view, {quad.tr.v[0], quad.tr.v[1]})
        bottom_right := screen_to_clip(view, {quad.br.v[0], quad.br.v[1]})
        bottom_left := screen_to_clip(view, {quad.bl.v[0], quad.bl.v[1]})
        append_triangle(vertices, top_left, top_right, bottom_right, element.fill)
        append_triangle(vertices, top_left, bottom_right, bottom_left, element.fill)
    }
}

append_segment :: proc(vertices: ^[dynamic]vertex, view: viewport.viewport, a, b: [2]f32, color: [4]f32, thickness: f32) {
    delta := b - a
    length := math.sqrt(delta[0] * delta[0] + delta[1] * delta[1])
    if length <= 0 {
        return
    }
    offset: [2]f32 = {-delta[1] / length * thickness * 0.5, delta[0] / length * thickness * 0.5}
    a_left := screen_to_clip(view, a + offset)
    a_right := screen_to_clip(view, a - offset)
    b_left := screen_to_clip(view, b + offset)
    b_right := screen_to_clip(view, b - offset)
    append_triangle(vertices, a_left, b_left, b_right, color)
    append_triangle(vertices, a_left, b_right, a_right, color)
}

append_arrowhead :: proc(vertices: ^[dynamic]vertex, view: viewport.viewport, start, finish: [2]f32, color: [4]f32) {
    delta := finish - start
    length := math.sqrt(delta[0] * delta[0] + delta[1] * delta[1])
    if length <= 0 {
        return
    }
    direction := delta / length
    normal: [2]f32 = {-direction[1], direction[0]}
    base := finish - direction * (14.0 / view.zoom)
    left := base + normal * (7.0 / view.zoom)
    right := base - normal * (7.0 / view.zoom)
    append_triangle(
        vertices,
        screen_to_clip(view, finish),
        screen_to_clip(view, left),
        screen_to_clip(view, right),
        color,
    )
}

append_handle :: proc(vertices: ^[dynamic]vertex, view: viewport.viewport, center: [2]f32, size: f32, color: [4]f32) {
    half := size * 0.5
    top_left := screen_to_clip(view, {center[0] - half, center[1] - half})
    top_right := screen_to_clip(view, {center[0] + half, center[1] - half})
    bottom_right := screen_to_clip(view, {center[0] + half, center[1] + half})
    bottom_left := screen_to_clip(view, {center[0] - half, center[1] + half})
    append_triangle(vertices, top_left, top_right, bottom_right, color)
    append_triangle(vertices, top_left, bottom_right, bottom_left, color)
}

append_selection_overlay :: proc(vertices: ^[dynamic]vertex, element: document.element, view: viewport.viewport) {
    selection_color: [4]f32 = {0.15, 0.35, 0.95, 1.0}
    left := element.x
    top := element.y
    right := element.x + element.width
    bottom := element.y + element.height
    thickness: f32 = 2.0 / view.zoom

    switch element.kind {
    case .rectangle:
        append_segment(vertices, view, {left, top}, {right, top}, selection_color, thickness)
        append_segment(vertices, view, {right, top}, {right, bottom}, selection_color, thickness)
        append_segment(vertices, view, {right, bottom}, {left, bottom}, selection_color, thickness)
        append_segment(vertices, view, {left, bottom}, {left, top}, selection_color, thickness)
    case .diamond:
        center_x := (left + right) * 0.5
        center_y := (top + bottom) * 0.5
        top_point := [2]f32{center_x, top}
        right_point := [2]f32{right, center_y}
        bottom_point := [2]f32{center_x, bottom}
        left_point := [2]f32{left, center_y}
        append_segment(vertices, view, top_point, right_point, selection_color, thickness)
        append_segment(vertices, view, right_point, bottom_point, selection_color, thickness)
        append_segment(vertices, view, bottom_point, left_point, selection_color, thickness)
        append_segment(vertices, view, left_point, top_point, selection_color, thickness)
    case .line:
        append_segment(vertices, view, {left, top}, {right, bottom}, selection_color, thickness)
    case .arrow:
        start := [2]f32{left, top}
        finish := [2]f32{right, bottom}
        append_segment(vertices, view, start, finish, selection_color, thickness)
        append_arrowhead(vertices, view, start, finish, selection_color)
    case .text:
        append_segment(vertices, view, {left, top}, {right, top}, selection_color, thickness)
        append_segment(vertices, view, {right, top}, {right, bottom}, selection_color, thickness)
        append_segment(vertices, view, {right, bottom}, {left, bottom}, selection_color, thickness)
        append_segment(vertices, view, {left, bottom}, {left, top}, selection_color, thickness)
    case .freehand:
        if len(element.points) >= 2 {
            for point_index in 1 ..< len(element.points) {
                append_segment(
                    vertices,
                    view,
                    element.points[point_index - 1],
                    element.points[point_index],
                    selection_color,
                    thickness,
                )
            }
        }
    case .ellipse:
        center := [(2)]f32{(left + right) * 0.5, (top + bottom) * 0.5}
        radius_x := element.width * 0.5
        radius_y := element.height * 0.5
        segments :: 32
        tau: f32 = 6.283185307179586
        previous: [2]f32 = {
            center[0] + math.cos(f32(0)) * radius_x,
            center[1] + math.sin(f32(0)) * radius_y,
        }
        for segment in 1 ..= segments {
            angle := tau * f32(segment) / f32(segments)
            current: [2]f32 = {
                center[0] + math.cos(angle) * radius_x,
                center[1] + math.sin(angle) * radius_y,
            }
            append_segment(vertices, view, previous, current, selection_color, thickness)
            previous = current
        }
    }

    handle_size := 10.0 / view.zoom
    append_handle(vertices, view, {left, top}, handle_size, selection_color)
    append_handle(vertices, view, {right, top}, handle_size, selection_color)
    append_handle(vertices, view, {right, bottom}, handle_size, selection_color)
    append_handle(vertices, view, {left, bottom}, handle_size, selection_color)
}

draw :: proc(renderer: ^renderer, doc: ^document.document, view: viewport.viewport, selected: int = -1) {
    clear(&renderer.vertices)

    for element in doc.elements {
        append_shape(&renderer.vertices, element, view)
    }

    if selected >= 0 && selected < len(doc.elements) {
        append_selection_overlay(&renderer.vertices, doc.elements[selected], view)
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
