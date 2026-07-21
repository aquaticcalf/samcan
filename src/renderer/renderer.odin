package renderer

import "core:c"
import "core:fmt"
import "core:math"
import "core:os"

import gl "vendor:OpenGL"
import stb "vendor:stb/truetype"
import document "../document"
import viewport "../viewport"

vertex :: struct {
    position: [2]f32,
    color:    [4]f32,
}

text_vertex :: struct {
    position: [2]f32,
    uv:       [2]f32,
    color:    [4]f32,
}

text_font :: struct {
    texture: u32,
    chars:   [96]stb.bakedchar,
    pixel_height: f32,
    baseline: f32,
    ready:   bool,
}

renderer :: struct {
    program:       u32,
    vao:           u32,
    vbo:           u32,
    vertices:      [dynamic]vertex,
    text_program:  u32,
    text_vao:      u32,
    text_vbo:      u32,
    text_vertices: [dynamic]text_vertex,
    text_font:     text_font,
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

text_vertex_shader :: `#version 330 core
layout (location = 0) in vec2 a_position;
layout (location = 1) in vec2 a_uv;
layout (location = 2) in vec4 a_color;
out vec2 v_uv;
out vec4 v_color;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_uv = a_uv;
    v_color = a_color;
}`

text_fragment_shader :: `#version 330 core
in vec2 v_uv;
in vec4 v_color;
uniform sampler2D u_font;
out vec4 color;
void main() {
    float alpha = texture(u_font, v_uv).r;
    color = vec4(v_color.rgb, v_color.a * alpha);
}`

open :: proc() -> (result: renderer, ok: bool) {
    result.vertices = make([dynamic]vertex, 0)
    result.text_vertices = make([dynamic]text_vertex, 0)

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

    text_program, text_ok := gl.load_shaders_source(text_vertex_shader, text_fragment_shader)
    result.text_program = text_program
    if !text_ok {
        compile_message, _, link_message, _ := gl.get_last_error_messages()
        fmt.eprintf("text shader setup failed: %s %s\n", compile_message, link_message)
    } else {
        gl.GenVertexArrays(1, &result.text_vao)
        gl.GenBuffers(1, &result.text_vbo)
        gl.BindVertexArray(result.text_vao)
        gl.BindBuffer(gl.ARRAY_BUFFER, result.text_vbo)
        text_stride := i32(size_of(text_vertex))
        gl.VertexAttribPointer(0, 2, gl.FLOAT, false, text_stride, 0)
        gl.EnableVertexAttribArray(0)
        gl.VertexAttribPointer(1, 2, gl.FLOAT, false, text_stride, uintptr(size_of([2]f32)))
        gl.EnableVertexAttribArray(1)
        gl.VertexAttribPointer(2, 4, gl.FLOAT, false, text_stride, uintptr(size_of([2]f32) * 2))
        gl.EnableVertexAttribArray(2)
        result.text_font.ready = load_text_font(&result.text_font)
    }

    ok = true
    return
}

destroy :: proc(renderer: ^renderer) {
    if renderer.text_font.texture != 0 {
        gl.DeleteTextures(1, &renderer.text_font.texture)
    }
    if renderer.text_vbo != 0 {
        gl.DeleteBuffers(1, &renderer.text_vbo)
    }
    if renderer.text_vao != 0 {
        gl.DeleteVertexArrays(1, &renderer.text_vao)
    }
    if renderer.text_program != 0 {
        gl.DeleteProgram(renderer.text_program)
    }
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
    delete(renderer.text_vertices)
    renderer^ = {}
}

load_text_font :: proc(font: ^text_font) -> bool {
    paths := [?]string{
        "fonts/excalifont-regular.ttf",
        "../assets/fonts/excalifont-regular.ttf",
        "assets/fonts/excalifont-regular.ttf",
    }
    data: []byte
    for path in paths {
        loaded, err := os.read_entire_file(path, context.allocator)
        if err == nil {
            data = loaded
            break
        }
    }
    if len(data) == 0 {
        fmt.eprintf("could not load excalifont-regular.ttf\n")
        return false
    }
    defer delete(data)

    atlas_size :: 512
    bitmap := make([]byte, atlas_size * atlas_size)
    defer delete(bitmap)
    baked := stb.BakeFontBitmap(
        &data[0],
        0,
        32,
        &bitmap[0],
        atlas_size,
        atlas_size,
        32,
        len(font.chars),
        &font.chars[0],
    )
    if baked <= 0 {
        fmt.eprintf("could not bake excalifont glyph atlas\n")
        return false
    }

    font.pixel_height = 32.0
    font.baseline = 28.0

    gl.GenTextures(1, &font.texture)
    gl.BindTexture(gl.TEXTURE_2D, font.texture)
    gl.PixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.TexImage2D(
        gl.TEXTURE_2D,
        0,
        i32(gl.RED),
        atlas_size,
        atlas_size,
        0,
        gl.RED,
        gl.UNSIGNED_BYTE,
        raw_data(bitmap),
    )
    gl.TexParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, i32(gl.LINEAR))
    gl.TexParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, i32(gl.LINEAR))
    gl.TexParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, i32(gl.CLAMP_TO_EDGE))
    gl.TexParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, i32(gl.CLAMP_TO_EDGE))
    return true
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

rotate_point :: proc(element: document.element, point: [2]f32) -> [2]f32 {
    if element.angle == 0 {
        return point
    }
    center: [2]f32 = {element.x + element.width * 0.5, element.y + element.height * 0.5}
    relative := point - center
    sine := math.sin(element.angle)
    cosine := math.cos(element.angle)
    return center + [2]f32{
        relative[0] * cosine - relative[1] * sine,
        relative[0] * sine + relative[1] * cosine,
    }
}

append_shape :: proc(vertices: ^[dynamic]vertex, element: document.element, view: viewport.viewport) {
    left := element.x
    top := element.y
    right := element.x + element.width
    bottom := element.y + element.height

    switch element.kind {
    case .rectangle:
        top_left_world := rotate_point(element, {left, top})
        top_right_world := rotate_point(element, {right, top})
        bottom_right_world := rotate_point(element, {right, bottom})
        bottom_left_world := rotate_point(element, {left, bottom})
        top_left := screen_to_clip(view, top_left_world)
        top_right := screen_to_clip(view, top_right_world)
        bottom_right := screen_to_clip(view, bottom_right_world)
        bottom_left := screen_to_clip(view, bottom_left_world)

        fill := element_color(element.fill, element.opacity)
        if fill[3] > 0 {
            append_triangle(vertices, top_left, top_right, bottom_right, fill)
            append_triangle(vertices, top_left, bottom_right, bottom_left, fill)
        }
        append_segment(vertices, view, top_left_world, top_right_world, element_color(element.stroke, element.opacity), element.stroke_width / view.zoom)
        append_segment(vertices, view, top_right_world, bottom_right_world, element_color(element.stroke, element.opacity), element.stroke_width / view.zoom)
        append_segment(vertices, view, bottom_right_world, bottom_left_world, element_color(element.stroke, element.opacity), element.stroke_width / view.zoom)
        append_segment(vertices, view, bottom_left_world, top_left_world, element_color(element.stroke, element.opacity), element.stroke_width / view.zoom)
    case .diamond:
        center_world := rotate_point(element, {(left + right) * 0.5, (top + bottom) * 0.5})
        top_world := rotate_point(element, {(left + right) * 0.5, top})
        right_world := rotate_point(element, {right, (top + bottom) * 0.5})
        bottom_world := rotate_point(element, {(left + right) * 0.5, bottom})
        left_world := rotate_point(element, {left, (top + bottom) * 0.5})
        center := screen_to_clip(view, center_world)
        top_point := screen_to_clip(view, top_world)
        right_point := screen_to_clip(view, right_world)
        bottom_point := screen_to_clip(view, bottom_world)
        left_point := screen_to_clip(view, left_world)

        fill := element_color(element.fill, element.opacity)
        if fill[3] > 0 {
            append_triangle(vertices, center, top_point, right_point, fill)
            append_triangle(vertices, center, right_point, bottom_point, fill)
            append_triangle(vertices, center, bottom_point, left_point, fill)
            append_triangle(vertices, center, left_point, top_point, fill)
        }
        stroke := element_color(element.stroke, element.opacity)
        thickness := element.stroke_width / view.zoom
        append_segment(vertices, view, top_world, right_world, stroke, thickness)
        append_segment(vertices, view, right_world, bottom_world, stroke, thickness)
        append_segment(vertices, view, bottom_world, left_world, stroke, thickness)
        append_segment(vertices, view, left_world, top_world, stroke, thickness)
    case .line:
        append_segment(
            vertices,
            view,
            rotate_point(element, {left, top}),
            rotate_point(element, {right, bottom}),
            element_color(element.stroke, element.opacity),
            element.stroke_width / view.zoom,
        )
    case .arrow:
        start := rotate_point(element, {left, top})
        finish := rotate_point(element, {right, bottom})
        stroke := element_color(element.stroke, element.opacity)
        append_segment(vertices, view, start, finish, stroke, element.stroke_width / view.zoom)
        append_arrowhead(vertices, view, start, finish, stroke)
    case .text:
        // text is rendered in the alpha-atlas pass after opaque geometry
    case .freehand:
        if len(element.points) >= 2 {
            for point_index in 1 ..< len(element.points) {
                append_segment(
                    vertices,
                    view,
                    rotate_point(element, element.points[point_index - 1]),
                    rotate_point(element, element.points[point_index]),
                    element_color(element.stroke, element.opacity),
                    element.stroke_width / view.zoom,
                )
            }
        }
    case .ellipse:
        center_world := rotate_point(element, {(left + right) * 0.5, (top + bottom) * 0.5})
        center := screen_to_clip(view, center_world)
        radius_x := element.width * 0.5
        radius_y := element.height * 0.5
        segments :: 32
        tau: f32 = 6.283185307179586
        previous_world := rotate_point(element, {
            (left + right) * 0.5 + math.cos(f32(0)) * radius_x,
            (top + bottom) * 0.5 + math.sin(f32(0)) * radius_y,
        })
        previous := screen_to_clip(view, previous_world)

        for segment in 1 ..= segments {
            angle := tau * f32(segment) / f32(segments)
            current_world := rotate_point(element, {
                (left + right) * 0.5 + math.cos(angle) * radius_x,
                (top + bottom) * 0.5 + math.sin(angle) * radius_y,
            })
            current := screen_to_clip(view, current_world)
            fill := element_color(element.fill, element.opacity)
            if fill[3] > 0 {
                append_triangle(vertices, center, previous, current, fill)
            }
            previous = current
        }
        stroke := element_color(element.stroke, element.opacity)
        thickness := element.stroke_width / view.zoom
        previous_world = rotate_point(element, {
            (left + right) * 0.5 + math.cos(f32(0)) * radius_x,
            (top + bottom) * 0.5 + math.sin(f32(0)) * radius_y,
        })
        for segment in 1 ..= segments {
            angle := tau * f32(segment) / f32(segments)
            current_world := rotate_point(element, [2]f32{
                (left + right) * 0.5 + math.cos(angle) * radius_x,
                (top + bottom) * 0.5 + math.sin(angle) * radius_y,
            })
            append_segment(vertices, view, previous_world, current_world, stroke, thickness)
            previous_world = current_world
        }
    }
}

element_color :: proc(value: document.color, opacity: f32) -> document.color {
    result := value
    result[3] *= max(0.0, min(1.0, opacity))
    return result
}

append_grid :: proc(vertices: ^[dynamic]vertex, view: viewport.viewport) {
    world_top_left := viewport.screen_to_world(view, {0, 0})
    world_bottom_right := viewport.screen_to_world(view, {view.width, view.height})
    step: f32 = 20.0
    first_x := int(math.floor(world_top_left[0] / step)) - 1
    last_x := int(math.ceil(world_bottom_right[0] / step)) + 1
    first_y := int(math.floor(world_top_left[1] / step)) - 1
    last_y := int(math.ceil(world_bottom_right[1] / step)) + 1
    grid_color: [4]f32 = {0.88, 0.88, 0.88, 1.0}
    thickness: f32 = 1.0 / view.zoom
    for index := first_x; index <= last_x; index += 1 {
        x := f32(index) * step
        append_segment(vertices, view, {x, world_top_left[1]}, {x, world_bottom_right[1]}, grid_color, thickness)
    }
    for index := first_y; index <= last_y; index += 1 {
        y := f32(index) * step
        append_segment(vertices, view, {world_top_left[0], y}, {world_bottom_right[0], y}, grid_color, thickness)
    }
}

append_text_vertex :: proc(vertices: ^[dynamic]text_vertex, position, uv: [2]f32, color: [4]f32) {
    append(vertices, text_vertex{position = position, uv = uv, color = color})
}

append_text :: proc(renderer: ^renderer, view: viewport.viewport, element: document.element) {
    if !renderer.text_font.ready || element.text == "" {
        return
    }

    font_size := element.font_size
    if font_size <= 0 {
        font_size = document.default_font_size
    }
    line_height := element.line_height
    if line_height <= 0 {
        line_height = document.default_line_height
    }
    scale := font_size / renderer.text_font.pixel_height
    line_height_pixels := font_size * line_height

    line_count := 1
    for character in element.text {
        if character == '\n' {
            line_count += 1
        }
    }
    vertical_offset: f32 = 0
    if !element.auto_resize {
        extra_height := element.height - f32(line_count) * line_height_pixels
        if element.vertical_align == .middle {
            vertical_offset = extra_height * 0.5
        } else if element.vertical_align == .bottom {
            vertical_offset = extra_height
        }
    }

    line_start := 0
    line_index := 0
    for line_end := 0; line_end <= len(element.text); line_end += 1 {
        if line_end != len(element.text) && element.text[line_end] != '\n' {
            continue
        }
        line := element.text[line_start:line_end]
        line_width := baked_text_width(&renderer.text_font, line) * scale
        line_x := element.x
        if element.text_align == .center {
            line_x += (element.width - line_width) * 0.5
        } else if element.text_align == .right {
            line_x += element.width - line_width
        }
        line_y := element.y + vertical_offset + f32(line_index) * line_height_pixels
        append_text_line(renderer, view, element, line, line_x, line_y, scale, element.fill)
        line_start = line_end + 1
        line_index += 1
    }
}

baked_text_width :: proc(font: ^text_font, text: string) -> f32 {
    width: f32 = 0
    for character in text {
        if character >= 32 && character <= 127 {
            width += font.chars[character - 32].xadvance
        }
    }
    return width
}

append_text_line :: proc(
    renderer: ^renderer,
    view: viewport.viewport,
    element: document.element,
    text: string,
    origin_x, origin_y, scale: f32,
    color: [4]f32,
) {
    x: f32 = 0
    y := renderer.text_font.baseline
    for character in text {
        if character < 32 || character > 127 {
            continue
        }
        quad: stb.aligned_quad
        stb.GetBakedQuad(
            &renderer.text_font.chars[0],
            512,
            512,
            c.int(character - 32),
            &x,
            &y,
            &quad,
            true,
        )
        top_left := screen_to_clip(view, rotate_point(element, {origin_x + quad.x0 * scale, origin_y + quad.y0 * scale}))
        top_right := screen_to_clip(view, rotate_point(element, {origin_x + quad.x1 * scale, origin_y + quad.y0 * scale}))
        bottom_right := screen_to_clip(view, rotate_point(element, {origin_x + quad.x1 * scale, origin_y + quad.y1 * scale}))
        bottom_left := screen_to_clip(view, rotate_point(element, {origin_x + quad.x0 * scale, origin_y + quad.y1 * scale}))
        append_text_vertex(&renderer.text_vertices, top_left, {quad.s0, quad.t0}, color)
        append_text_vertex(&renderer.text_vertices, top_right, {quad.s1, quad.t0}, color)
        append_text_vertex(&renderer.text_vertices, bottom_right, {quad.s1, quad.t1}, color)
        append_text_vertex(&renderer.text_vertices, top_left, {quad.s0, quad.t0}, color)
        append_text_vertex(&renderer.text_vertices, bottom_right, {quad.s1, quad.t1}, color)
        append_text_vertex(&renderer.text_vertices, bottom_left, {quad.s0, quad.t1}, color)
    }
}

screen_to_clip_ui :: proc(view: viewport.viewport, point: [2]f32) -> [2]f32 {
    return {
        (point[0] / view.width) * 2.0 - 1.0,
        1.0 - (point[1] / view.height) * 2.0,
    }
}

append_ui_rect :: proc(vertices: ^[dynamic]vertex, view: viewport.viewport, left, top, right, bottom: f32, color: [4]f32) {
    append_triangle(
        vertices,
        screen_to_clip_ui(view, {left, top}),
        screen_to_clip_ui(view, {right, top}),
        screen_to_clip_ui(view, {right, bottom}),
        color,
    )
    append_triangle(
        vertices,
        screen_to_clip_ui(view, {left, top}),
        screen_to_clip_ui(view, {right, bottom}),
        screen_to_clip_ui(view, {left, bottom}),
        color,
    )
}

append_ui_text :: proc(renderer: ^renderer, view: viewport.viewport, text: string, left, top: f32, color: [4]f32) {
    if !renderer.text_font.ready {
        return
    }
    x: f32 = 0
    y := renderer.text_font.baseline
    for character in text {
        if character < 32 || character > 127 {
            continue
        }
        quad: stb.aligned_quad
        stb.GetBakedQuad(
            &renderer.text_font.chars[0],
            512,
            512,
            c.int(character - 32),
            &x,
            &y,
            &quad,
            true,
        )
        top_left := screen_to_clip_ui(view, {left + quad.x0, top + quad.y0})
        top_right := screen_to_clip_ui(view, {left + quad.x1, top + quad.y0})
        bottom_right := screen_to_clip_ui(view, {left + quad.x1, top + quad.y1})
        bottom_left := screen_to_clip_ui(view, {left + quad.x0, top + quad.y1})
        append_text_vertex(&renderer.text_vertices, top_left, {quad.s0, quad.t0}, color)
        append_text_vertex(&renderer.text_vertices, top_right, {quad.s1, quad.t0}, color)
        append_text_vertex(&renderer.text_vertices, bottom_right, {quad.s1, quad.t1}, color)
        append_text_vertex(&renderer.text_vertices, top_left, {quad.s0, quad.t0}, color)
        append_text_vertex(&renderer.text_vertices, bottom_right, {quad.s1, quad.t1}, color)
        append_text_vertex(&renderer.text_vertices, bottom_left, {quad.s0, quad.t1}, color)
    }
}

append_toolbar :: proc(renderer: ^renderer, view: viewport.viewport, select_mode: bool, active_kind: document.element_kind, show_grid: bool) {
    toolbar_width: f32 = 14.0 * 38.0 + 13.0 * 4.0
    append_ui_rect(&renderer.vertices, view, 4, 4, 4 + toolbar_width, 44, {0.86, 0.86, 0.86, 1.0})
    labels := [?]string{"v", "r", "e", "d", "l", "a", "t", "f", "u", "y", "o", "s", "#", "x"}
    for index in 0 ..< len(labels) {
        left: f32 = 8.0 + f32(index) * (38.0 + 4.0)
        active := index == 0 && select_mode
        if index > 0 && index < 8 && !select_mode {
            active = (index == 1 && active_kind == .rectangle) ||
                (index == 2 && active_kind == .ellipse) ||
                (index == 3 && active_kind == .diamond) ||
                (index == 4 && active_kind == .line) ||
                (index == 5 && active_kind == .arrow) ||
                (index == 6 && active_kind == .text) ||
                (index == 7 && active_kind == .freehand)
        }
        if index == 12 {
            active = show_grid
        }
        background: [4]f32 = {0.96, 0.96, 0.96, 1.0}
        if active {
            background = {0.60, 0.78, 1.0, 1.0}
        }
        append_ui_rect(&renderer.vertices, view, left, 8, left + 38, 40, background)
        append_ui_text(renderer, view, labels[index], left + 7, 8, {0.10, 0.10, 0.10, 1.0})
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
        top_left := rotate_point(element, {left, top})
        top_right := rotate_point(element, {right, top})
        bottom_right := rotate_point(element, {right, bottom})
        bottom_left := rotate_point(element, {left, bottom})
        append_segment(vertices, view, top_left, top_right, selection_color, thickness)
        append_segment(vertices, view, top_right, bottom_right, selection_color, thickness)
        append_segment(vertices, view, bottom_right, bottom_left, selection_color, thickness)
        append_segment(vertices, view, bottom_left, top_left, selection_color, thickness)
    case .diamond:
        center_x := (left + right) * 0.5
        center_y := (top + bottom) * 0.5
        top_point := rotate_point(element, [2]f32{center_x, top})
        right_point := rotate_point(element, [2]f32{right, center_y})
        bottom_point := rotate_point(element, [2]f32{center_x, bottom})
        left_point := rotate_point(element, [2]f32{left, center_y})
        append_segment(vertices, view, top_point, right_point, selection_color, thickness)
        append_segment(vertices, view, right_point, bottom_point, selection_color, thickness)
        append_segment(vertices, view, bottom_point, left_point, selection_color, thickness)
        append_segment(vertices, view, left_point, top_point, selection_color, thickness)
    case .line:
        append_segment(vertices, view, rotate_point(element, {left, top}), rotate_point(element, {right, bottom}), selection_color, thickness)
    case .arrow:
        start := rotate_point(element, {left, top})
        finish := rotate_point(element, {right, bottom})
        append_segment(vertices, view, start, finish, selection_color, thickness)
        append_arrowhead(vertices, view, start, finish, selection_color)
    case .text:
        top_left := rotate_point(element, {left, top})
        top_right := rotate_point(element, {right, top})
        bottom_right := rotate_point(element, {right, bottom})
        bottom_left := rotate_point(element, {left, bottom})
        append_segment(vertices, view, top_left, top_right, selection_color, thickness)
        append_segment(vertices, view, top_right, bottom_right, selection_color, thickness)
        append_segment(vertices, view, bottom_right, bottom_left, selection_color, thickness)
        append_segment(vertices, view, bottom_left, top_left, selection_color, thickness)
    case .freehand:
        if len(element.points) >= 2 {
            for point_index in 1 ..< len(element.points) {
                append_segment(
                    vertices,
                    view,
                    rotate_point(element, element.points[point_index - 1]),
                    rotate_point(element, element.points[point_index]),
                    selection_color,
                    thickness,
                )
            }
        }
    case .ellipse:
        center := [2]f32{(left + right) * 0.5, (top + bottom) * 0.5}
        radius_x := element.width * 0.5
        radius_y := element.height * 0.5
        segments :: 32
        tau: f32 = 6.283185307179586
        previous := rotate_point(element, {
            center[0] + math.cos(f32(0)) * radius_x,
            center[1] + math.sin(f32(0)) * radius_y,
        })
        for segment in 1 ..= segments {
            angle := tau * f32(segment) / f32(segments)
            current := rotate_point(element, {
                center[0] + math.cos(angle) * radius_x,
                center[1] + math.sin(angle) * radius_y,
            })
            append_segment(vertices, view, previous, current, selection_color, thickness)
            previous = current
        }
    }

    handle_size := 10.0 / view.zoom
    append_handle(vertices, view, rotate_point(element, {left, top}), handle_size, selection_color)
    append_handle(vertices, view, rotate_point(element, {right, top}), handle_size, selection_color)
    append_handle(vertices, view, rotate_point(element, {right, bottom}), handle_size, selection_color)
    append_handle(vertices, view, rotate_point(element, {left, bottom}), handle_size, selection_color)
}

draw :: proc(
    renderer: ^renderer,
    doc: ^document.document,
    view: viewport.viewport,
    selected: int = -1,
    selected_items: []int = nil,
    lassoing: bool = false,
    lasso_start: [2]f32 = {},
    lasso_current: [2]f32 = {},
    toolbar_select_mode: bool = true,
    toolbar_kind: document.element_kind = .rectangle,
    show_grid: bool = false,
) {
    clear(&renderer.vertices)
    clear(&renderer.text_vertices)

    if show_grid {
        append_grid(&renderer.vertices, view)
    }

    for element in doc.elements {
        if element.kind == .text {
            append_text(renderer, view, element)
        } else {
            append_shape(&renderer.vertices, element, view)
        }
    }

    if len(selected_items) > 0 {
        for selected_index in selected_items {
            if selected_index >= 0 && selected_index < len(doc.elements) {
                append_selection_overlay(&renderer.vertices, doc.elements[selected_index], view)
            }
        }
    } else if selected >= 0 && selected < len(doc.elements) {
        append_selection_overlay(&renderer.vertices, doc.elements[selected], view)
    }

    if lassoing {
        lasso_color: [4]f32 = {0.15, 0.35, 0.95, 1.0}
        left := min(lasso_start[0], lasso_current[0])
        top := min(lasso_start[1], lasso_current[1])
        right := max(lasso_start[0], lasso_current[0])
        bottom := max(lasso_start[1], lasso_current[1])
        thickness: f32 = 1.0 / view.zoom
        append_segment(&renderer.vertices, view, {left, top}, {right, top}, lasso_color, thickness)
        append_segment(&renderer.vertices, view, {right, top}, {right, bottom}, lasso_color, thickness)
        append_segment(&renderer.vertices, view, {right, bottom}, {left, bottom}, lasso_color, thickness)
        append_segment(&renderer.vertices, view, {left, bottom}, {left, top}, lasso_color, thickness)
    }

    append_toolbar(renderer, view, toolbar_select_mode, toolbar_kind, show_grid)

    if len(renderer.vertices) > 0 {
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

    if len(renderer.text_vertices) > 0 && renderer.text_font.ready {
        gl.Enable(gl.BLEND)
        gl.BlendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        gl.UseProgram(renderer.text_program)
        gl.BindVertexArray(renderer.text_vao)
        gl.BindBuffer(gl.ARRAY_BUFFER, renderer.text_vbo)
        gl.BufferData(
            gl.ARRAY_BUFFER,
            len(renderer.text_vertices) * size_of(text_vertex),
            raw_data(renderer.text_vertices),
            gl.DYNAMIC_DRAW,
        )
        gl.ActiveTexture(gl.TEXTURE0)
        gl.BindTexture(gl.TEXTURE_2D, renderer.text_font.texture)
        gl.DrawArrays(gl.TRIANGLES, 0, i32(len(renderer.text_vertices)))
        gl.Disable(gl.BLEND)
    }
}
