package renderer

import "core:c"
import base64 "core:encoding/base64"
import "core:fmt"
import "core:math"
import "core:os"
import "core:strings"

import gl "vendor:OpenGL"
import stb_image "vendor:stb/image"
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

image_texture :: struct {
    image_id: string,
    data_url: string,
    texture:  u32,
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
    image_program: u32,
    image_vao:     u32,
    image_vbo:     u32,
    image_vertices: [dynamic]text_vertex,
    image_textures: [dynamic]image_texture,
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

image_vertex_shader :: `#version 330 core
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

image_fragment_shader :: `#version 330 core
in vec2 v_uv;
in vec4 v_color;
uniform sampler2D u_image;
out vec4 color;
void main() {
    color = texture(u_image, v_uv) * v_color;
}`

open :: proc() -> (result: renderer, ok: bool) {
    result.vertices = make([dynamic]vertex, 0)
    result.text_vertices = make([dynamic]text_vertex, 0)
    result.image_vertices = make([dynamic]text_vertex, 0)
    result.image_textures = make([dynamic]image_texture, 0)

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

    image_program, image_ok := gl.load_shaders_source(image_vertex_shader, image_fragment_shader)
    result.image_program = image_program
    if !image_ok {
        compile_message, _, link_message, _ := gl.get_last_error_messages()
        fmt.eprintf("image shader setup failed: %s %s\n", compile_message, link_message)
    } else {
        gl.GenVertexArrays(1, &result.image_vao)
        gl.GenBuffers(1, &result.image_vbo)
        gl.BindVertexArray(result.image_vao)
        gl.BindBuffer(gl.ARRAY_BUFFER, result.image_vbo)
        image_stride := i32(size_of(text_vertex))
        gl.VertexAttribPointer(0, 2, gl.FLOAT, false, image_stride, 0)
        gl.EnableVertexAttribArray(0)
        gl.VertexAttribPointer(1, 2, gl.FLOAT, false, image_stride, uintptr(size_of([2]f32)))
        gl.EnableVertexAttribArray(1)
        gl.VertexAttribPointer(2, 4, gl.FLOAT, false, image_stride, uintptr(size_of([2]f32) * 2))
        gl.EnableVertexAttribArray(2)
    }

    ok = true
    return
}

destroy :: proc(renderer: ^renderer) {
    if renderer.text_font.texture != 0 {
        gl.DeleteTextures(1, &renderer.text_font.texture)
    }
    for &image in renderer.image_textures {
        if image.texture != 0 {
            gl.DeleteTextures(1, &image.texture)
        }
        delete(image.image_id)
        delete(image.data_url)
    }
    delete(renderer.image_textures)
    delete(renderer.image_vertices)
    if renderer.image_vbo != 0 {
        gl.DeleteBuffers(1, &renderer.image_vbo)
    }
    if renderer.image_vao != 0 {
        gl.DeleteVertexArrays(1, &renderer.image_vao)
    }
    if renderer.image_program != 0 {
        gl.DeleteProgram(renderer.image_program)
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

ensure_image_texture :: proc(renderer: ^renderer, image_id, data_url: string) -> u32 {
    for &cached in renderer.image_textures {
        if cached.image_id != image_id {
            continue
        }
        if cached.data_url == data_url && cached.texture != 0 {
            return cached.texture
        }
        if cached.texture != 0 {
            gl.DeleteTextures(1, &cached.texture)
            cached.texture = 0
        }
        delete(cached.data_url)
        cached.data_url = strings.clone(data_url)
        upload_image_texture(&cached, data_url)
        return cached.texture
    }

    append(&renderer.image_textures, image_texture{
        image_id = strings.clone(image_id),
        data_url = strings.clone(data_url),
    })
    cached := &renderer.image_textures[len(renderer.image_textures) - 1]
    upload_image_texture(cached, data_url)
    return cached.texture
}

upload_image_texture :: proc(cached: ^image_texture, data_url: string) -> bool {
    comma := -1
    for index in 0 ..< len(data_url) {
        if data_url[index] == ',' {
            comma = index
            break
        }
    }
    if comma < 0 || comma + 1 >= len(data_url) {
        return false
    }
    encoded := data_url[comma + 1:]
    decoded, decode_error := base64.decode(encoded)
    if decode_error != nil || len(decoded) == 0 {
        return false
    }
    defer delete(decoded)

    width, height, channels: c.int
    pixels := stb_image.load_from_memory(
        &decoded[0],
        c.int(len(decoded)),
        &width,
        &height,
        &channels,
        4,
    )
    if pixels == nil || width <= 0 || height <= 0 {
        if pixels != nil {
            stb_image.image_free(pixels)
        }
        return false
    }

    gl.GenTextures(1, &cached.texture)
    gl.BindTexture(gl.TEXTURE_2D, cached.texture)
    gl.PixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.TexImage2D(
        gl.TEXTURE_2D,
        0,
        i32(gl.RGBA),
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        rawptr(pixels),
    )
    gl.TexParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, i32(gl.LINEAR))
    gl.TexParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, i32(gl.LINEAR))
    gl.TexParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, i32(gl.CLAMP_TO_EDGE))
    gl.TexParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, i32(gl.CLAMP_TO_EDGE))
    stb_image.image_free(pixels)
    return true
}

append_image_vertex :: proc(vertices: ^[dynamic]text_vertex, position, uv: [2]f32, color: [4]f32) {
    append(vertices, text_vertex{position = position, uv = uv, color = color})
}

append_image :: proc(renderer: ^renderer, doc: ^document.document, view: viewport.viewport, element: document.element) {
    if element.image_id == "" {
        return
    }
    image, found := doc.images[element.image_id]
    if !found || image.data_url == "" {
        return
    }
    texture := ensure_image_texture(renderer, element.image_id, image.data_url)
    if texture == 0 {
        return
    }

    left := element.x
    top := element.y
    right := element.x + element.width
    bottom := element.y + element.height
    top_left := screen_to_clip(view, rotate_point(element, {left, top}))
    top_right := screen_to_clip(view, rotate_point(element, {right, top}))
    bottom_right := screen_to_clip(view, rotate_point(element, {right, bottom}))
    bottom_left := screen_to_clip(view, rotate_point(element, {left, bottom}))
    color: [4]f32 = {1, 1, 1, max(0.0, min(1.0, element.opacity))}
    append_image_vertex(&renderer.image_vertices, top_left, {0, 1}, color)
    append_image_vertex(&renderer.image_vertices, top_right, {1, 1}, color)
    append_image_vertex(&renderer.image_vertices, bottom_right, {1, 0}, color)
    append_image_vertex(&renderer.image_vertices, top_left, {0, 1}, color)
    append_image_vertex(&renderer.image_vertices, bottom_right, {1, 0}, color)
    append_image_vertex(&renderer.image_vertices, bottom_left, {0, 0}, color)
}

append_shape :: proc(vertices: ^[dynamic]vertex, element: document.element, view: viewport.viewport) {
    left := element.x
    top := element.y
    right := element.x + element.width
    bottom := element.y + element.height

    switch element.kind {
    case .rectangle, .frame:
        top_left_world := rotate_point(element, {left, top})
        top_right_world := rotate_point(element, {right, top})
        bottom_right_world := rotate_point(element, {right, bottom})
        bottom_left_world := rotate_point(element, {left, bottom})
        top_left := screen_to_clip(view, top_left_world)
        top_right := screen_to_clip(view, top_right_world)
        bottom_right := screen_to_clip(view, bottom_right_world)
        bottom_left := screen_to_clip(view, bottom_left_world)

        fill := element_color(element.fill, element.opacity)
        if element.kind != .frame && fill[3] > 0 && element.fill_style != .none {
            append_triangle(vertices, top_left, top_right, bottom_right, fill)
            append_triangle(vertices, top_left, bottom_right, bottom_left, fill)
        }
        append_hachure(vertices, view, element)
        append_styled_segment(vertices, view, top_left_world, top_right_world, element_color(element.stroke, element.opacity), element.stroke_width / view.zoom, element.stroke_style, element.roughness, element.id)
        append_styled_segment(vertices, view, top_right_world, bottom_right_world, element_color(element.stroke, element.opacity), element.stroke_width / view.zoom, element.stroke_style, element.roughness, element.id + 1)
        append_styled_segment(vertices, view, bottom_right_world, bottom_left_world, element_color(element.stroke, element.opacity), element.stroke_width / view.zoom, element.stroke_style, element.roughness, element.id + 2)
        append_styled_segment(vertices, view, bottom_left_world, top_left_world, element_color(element.stroke, element.opacity), element.stroke_width / view.zoom, element.stroke_style, element.roughness, element.id + 3)
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
        if fill[3] > 0 && element.fill_style != .none {
            append_triangle(vertices, center, top_point, right_point, fill)
            append_triangle(vertices, center, right_point, bottom_point, fill)
            append_triangle(vertices, center, bottom_point, left_point, fill)
            append_triangle(vertices, center, left_point, top_point, fill)
        }
        append_hachure(vertices, view, element)
        stroke := element_color(element.stroke, element.opacity)
        thickness := element.stroke_width / view.zoom
        append_styled_segment(vertices, view, top_world, right_world, stroke, thickness, element.stroke_style, element.roughness, element.id)
        append_styled_segment(vertices, view, right_world, bottom_world, stroke, thickness, element.stroke_style, element.roughness, element.id + 1)
        append_styled_segment(vertices, view, bottom_world, left_world, stroke, thickness, element.stroke_style, element.roughness, element.id + 2)
        append_styled_segment(vertices, view, left_world, top_world, stroke, thickness, element.stroke_style, element.roughness, element.id + 3)
    case .line:
        append_styled_segment(
            vertices,
            view,
            rotate_point(element, {left, top}),
            rotate_point(element, {right, bottom}),
            element_color(element.stroke, element.opacity),
            element.stroke_width / view.zoom,
            element.stroke_style,
            element.roughness,
            element.id,
        )
    case .arrow:
        start := rotate_point(element, {left, top})
        finish := rotate_point(element, {right, bottom})
        stroke := element_color(element.stroke, element.opacity)
        append_styled_segment(vertices, view, start, finish, stroke, element.stroke_width / view.zoom, element.stroke_style, element.roughness, element.id)
        append_arrowhead(vertices, view, start, finish, stroke)
    case .text:
        // text is rendered in the alpha-atlas pass after opaque geometry
    case .image:
        // images are rendered in the texture pass
    case .freehand:
        if len(element.points) >= 2 {
            for point_index in 1 ..< len(element.points) {
                append_styled_segment(
                    vertices,
                    view,
                    rotate_point(element, element.points[point_index - 1]),
                    rotate_point(element, element.points[point_index]),
                    element_color(element.stroke, element.opacity),
                    element.stroke_width / view.zoom,
                    element.stroke_style,
                    element.roughness,
                    element.id + u64(point_index),
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
            if fill[3] > 0 && element.fill_style != .none {
                append_triangle(vertices, center, previous, current, fill)
            }
            previous = current
        }
        append_hachure(vertices, view, element)
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
            append_styled_segment(vertices, view, previous_world, current_world, stroke, thickness, element.stroke_style, element.roughness, element.id + u64(segment))
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

ui_icon :: enum {
    selection,
    rectangle,
    frame,
    ellipse,
    diamond,
    line,
    arrow,
    text,
    freedraw,
    eraser,
    undo,
    redo,
    open,
    save,
    grid,
    svg,
    image,
    theme,
    png,
    library,
    search,
    layers,
    sliders,
    plus,
    chevron_left,
    close,
}

append_ui_segment :: proc(renderer: ^renderer, view: viewport.viewport, a, b: [2]f32, color: [4]f32, thickness: f32 = 1.5) {
    delta := b - a
    length := math.sqrt(delta[0] * delta[0] + delta[1] * delta[1])
    if length <= 0.001 {
        return
    }
    offset := [2]f32{-delta[1] / length, delta[0] / length} * (thickness * 0.5)
    append_triangle(
        &renderer.vertices,
        screen_to_clip_ui(view, a + offset),
        screen_to_clip_ui(view, b + offset),
        screen_to_clip_ui(view, b - offset),
        color,
    )
    append_triangle(
        &renderer.vertices,
        screen_to_clip_ui(view, a + offset),
        screen_to_clip_ui(view, b - offset),
        screen_to_clip_ui(view, a - offset),
        color,
    )
}

append_ui_circle :: proc(renderer: ^renderer, view: viewport.viewport, center: [2]f32, radius: f32, color: [4]f32, thickness: f32 = 1.5) {
    tau: f32 = 6.283185307179586
    segments :: 20
    previous := center + [2]f32{math.cos(f32(0.0)) * radius, math.sin(f32(0.0)) * radius}
    for index in 1 ..= segments {
        angle := tau * f32(index) / f32(segments)
        current := center + [2]f32{math.cos(angle) * radius, math.sin(angle) * radius}
        append_ui_segment(renderer, view, previous, current, color, thickness)
        previous = current
    }
}

append_ui_outline_rect :: proc(renderer: ^renderer, view: viewport.viewport, left, top, right, bottom: f32, color: [4]f32, thickness: f32 = 1.5) {
    append_ui_segment(renderer, view, {left, top}, {right, top}, color, thickness)
    append_ui_segment(renderer, view, {right, top}, {right, bottom}, color, thickness)
    append_ui_segment(renderer, view, {right, bottom}, {left, bottom}, color, thickness)
    append_ui_segment(renderer, view, {left, bottom}, {left, top}, color, thickness)
}

ui_icon_point :: proc(left, top, x, y: f32) -> [2]f32 {
    return {left + 8.0 + x, top + 8.0 + y}
}

append_ui_icon :: proc(renderer: ^renderer, view: viewport.viewport, icon: ui_icon, left, top: f32, color: [4]f32) {
    p :: proc(left, top, x, y: f32) -> [2]f32 {
        return ui_icon_point(left, top, x, y)
    }
    line :: proc(renderer: ^renderer, view: viewport.viewport, left, top, x0, y0, x1, y1: f32, color: [4]f32) {
        append_ui_segment(renderer, view, p(left, top, x0, y0), p(left, top, x1, y1), color, 1.7)
    }

    switch icon {
    case .selection:
        line(renderer, view, left, top, 5, 4, 11, 19, color)
        line(renderer, view, left, top, 5, 4, 20, 11, color)
        line(renderer, view, left, top, 11, 19, 14, 13, color)
        line(renderer, view, left, top, 14, 13, 20, 19, color)
        line(renderer, view, left, top, 14, 13, 20, 11, color)
    case .rectangle:
        append_ui_outline_rect(renderer, view, left + 4, top + 4, left + 28, top + 28, color, 1.6)
    case .frame:
        line(renderer, view, left, top, 5, 10, 5, 5, color)
        line(renderer, view, left, top, 5, 5, 10, 5, color)
        line(renderer, view, left, top, 22, 5, 27, 5, color)
        line(renderer, view, left, top, 27, 5, 27, 10, color)
        line(renderer, view, left, top, 5, 22, 5, 27, color)
        line(renderer, view, left, top, 5, 27, 10, 27, color)
        line(renderer, view, left, top, 22, 27, 27, 27, color)
        line(renderer, view, left, top, 27, 27, 27, 22, color)
    case .ellipse:
        append_ui_circle(renderer, view, p(left, top, 16, 16), 11, color, 1.6)
    case .diamond:
        line(renderer, view, left, top, 16, 4, 28, 16, color)
        line(renderer, view, left, top, 28, 16, 16, 28, color)
        line(renderer, view, left, top, 16, 28, 4, 16, color)
        line(renderer, view, left, top, 4, 16, 16, 4, color)
    case .line:
        line(renderer, view, left, top, 5, 27, 27, 5, color)
    case .arrow:
        line(renderer, view, left, top, 4, 16, 27, 16, color)
        line(renderer, view, left, top, 20, 9, 27, 16, color)
        line(renderer, view, left, top, 27, 16, 20, 23, color)
    case .text:
        line(renderer, view, left, top, 5, 6, 27, 6, color)
        line(renderer, view, left, top, 16, 6, 16, 28, color)
    case .freedraw:
        line(renderer, view, left, top, 4, 22, 8, 15, color)
        line(renderer, view, left, top, 8, 15, 12, 19, color)
        line(renderer, view, left, top, 12, 19, 17, 9, color)
        line(renderer, view, left, top, 17, 9, 27, 13, color)
    case .eraser:
        line(renderer, view, left, top, 5, 19, 18, 6, color)
        line(renderer, view, left, top, 18, 6, 28, 16, color)
        line(renderer, view, left, top, 28, 16, 15, 29, color)
        line(renderer, view, left, top, 15, 29, 5, 19, color)
        line(renderer, view, left, top, 12, 12, 22, 22, color)
    case .undo, .redo:
        if icon == .undo {
            line(renderer, view, left, top, 7, 12, 12, 7, color)
            line(renderer, view, left, top, 7, 12, 13, 17, color)
            line(renderer, view, left, top, 7, 12, 20, 12, color)
            line(renderer, view, left, top, 20, 12, 25, 16, color)
            line(renderer, view, left, top, 20, 12, 25, 8, color)
        } else {
            line(renderer, view, left, top, 25, 12, 20, 7, color)
            line(renderer, view, left, top, 25, 12, 19, 17, color)
            line(renderer, view, left, top, 25, 12, 12, 12, color)
            line(renderer, view, left, top, 12, 12, 7, 16, color)
            line(renderer, view, left, top, 12, 12, 7, 8, color)
        }
    case .open:
        line(renderer, view, left, top, 4, 9, 12, 9, color)
        line(renderer, view, left, top, 12, 9, 15, 12, color)
        line(renderer, view, left, top, 15, 12, 28, 12, color)
        line(renderer, view, left, top, 28, 12, 24, 25, color)
        line(renderer, view, left, top, 24, 25, 5, 25, color)
        line(renderer, view, left, top, 5, 25, 4, 9, color)
        line(renderer, view, left, top, 4, 9, 5, 5, color)
        line(renderer, view, left, top, 5, 5, 13, 5, color)
        line(renderer, view, left, top, 13, 5, 16, 9, color)
    case .save:
        append_ui_outline_rect(renderer, view, left + 5, top + 4, left + 27, top + 28, color, 1.6)
        append_ui_outline_rect(renderer, view, left + 9, top + 5, left + 22, top + 12, color, 1.4)
        append_ui_circle(renderer, view, p(left, top, 16, 21), 3, color, 1.4)
    case .grid:
        for index in 0 ..< 3 {
            offset := 5.0 + f32(index) * 7.0
            line(renderer, view, left, top, 4, offset, 28, offset, color)
            line(renderer, view, left, top, offset, 4, offset, 28, color)
        }
    case .svg, .png:
        line(renderer, view, left, top, 7, 4, 20, 4, color)
        line(renderer, view, left, top, 20, 4, 27, 11, color)
        line(renderer, view, left, top, 27, 11, 27, 28, color)
        line(renderer, view, left, top, 27, 28, 7, 28, color)
        line(renderer, view, left, top, 7, 28, 7, 4, color)
        line(renderer, view, left, top, 20, 4, 20, 11, color)
        line(renderer, view, left, top, 20, 11, 27, 11, color)
        if icon == .svg {
            line(renderer, view, left, top, 11, 17, 14, 24, color)
            line(renderer, view, left, top, 14, 24, 17, 17, color)
            line(renderer, view, left, top, 12, 19, 16, 19, color)
        } else {
            line(renderer, view, left, top, 11, 17, 11, 24, color)
            line(renderer, view, left, top, 11, 17, 14, 17, color)
            line(renderer, view, left, top, 14, 17, 14, 20, color)
            line(renderer, view, left, top, 14, 20, 11, 20, color)
            line(renderer, view, left, top, 17, 17, 17, 24, color)
            line(renderer, view, left, top, 17, 17, 20, 17, color)
            line(renderer, view, left, top, 20, 17, 17, 20, color)
        }
    case .image:
        append_ui_outline_rect(renderer, view, left + 4, top + 5, left + 28, top + 27, color, 1.6)
        append_ui_circle(renderer, view, p(left, top, 11, 11), 2, color, 1.3)
        line(renderer, view, left, top, 6, 24, 13, 16, color)
        line(renderer, view, left, top, 13, 16, 18, 21, color)
        line(renderer, view, left, top, 18, 21, 23, 15, color)
    case .theme:
        append_ui_circle(renderer, view, p(left, top, 16, 16), 6, color, 1.6)
        for index in 0 ..< 8 {
            angle := 0.7853981633974483 * f32(index)
            inner := p(left, top, 16 + math.cos(angle) * 10, 16 + math.sin(angle) * 10)
            outer := p(left, top, 16 + math.cos(angle) * 13, 16 + math.sin(angle) * 13)
            append_ui_segment(renderer, view, inner, outer, color, 1.5)
        }
    case .library:
        append_ui_outline_rect(renderer, view, left + 5, top + 5, left + 27, top + 27, color, 1.5)
        line(renderer, view, left, top, 9, 9, 23, 9, color)
        line(renderer, view, left, top, 9, 15, 23, 15, color)
        line(renderer, view, left, top, 9, 21, 23, 21, color)
    case .search:
        append_ui_circle(renderer, view, p(left, top, 13, 13), 7, color, 1.6)
        line(renderer, view, left, top, 18, 18, 25, 25, color)
    case .layers:
        line(renderer, view, left, top, 5, 9, 16, 4, color)
        line(renderer, view, left, top, 16, 4, 27, 9, color)
        line(renderer, view, left, top, 27, 9, 16, 14, color)
        line(renderer, view, left, top, 16, 14, 5, 9, color)
        line(renderer, view, left, top, 5, 15, 16, 20, color)
        line(renderer, view, left, top, 16, 20, 27, 15, color)
        line(renderer, view, left, top, 5, 21, 16, 26, color)
        line(renderer, view, left, top, 16, 26, 27, 21, color)
    case .sliders:
        line(renderer, view, left, top, 5, 7, 27, 7, color)
        line(renderer, view, left, top, 5, 16, 27, 16, color)
        line(renderer, view, left, top, 5, 25, 27, 25, color)
        append_ui_circle(renderer, view, p(left, top, 12, 7), 2, color, 1.4)
        append_ui_circle(renderer, view, p(left, top, 20, 16), 2, color, 1.4)
        append_ui_circle(renderer, view, p(left, top, 9, 25), 2, color, 1.4)
    case .plus:
        line(renderer, view, left, top, 16, 6, 16, 26, color)
        line(renderer, view, left, top, 6, 16, 26, 16, color)
    case .chevron_left:
        line(renderer, view, left, top, 19, 5, 11, 16, color)
        line(renderer, view, left, top, 11, 16, 19, 27, color)
    case .close:
        line(renderer, view, left, top, 7, 7, 25, 25, color)
        line(renderer, view, left, top, 25, 7, 7, 25, color)
    }
}

append_toolbar :: proc(renderer: ^renderer, view: viewport.viewport, select_mode: bool, active_kind: document.element_kind, show_grid, dark_mode, eraser_mode: bool) {
    toolbar_background: [4]f32 = {0.98, 0.98, 0.98, 0.96}
    button_background: [4]f32 = {0.95, 0.95, 0.95, 1.0}
    text_color: [4]f32 = {0.16, 0.16, 0.18, 1.0}
    accent: [4]f32 = {0.20, 0.42, 0.82, 1.0}
    if dark_mode {
        toolbar_background = {0.12, 0.12, 0.14, 0.96}
        button_background = {0.20, 0.20, 0.23, 1.0}
        text_color = {0.91, 0.91, 0.94, 1.0}
        accent = {0.45, 0.68, 1.0, 1.0}
    }
    append_ui_rect(&renderer.vertices, view, 4, 4, view.width - 4, 52, toolbar_background)
    append_ui_text(renderer, view, "samcan", 16, 9, text_color)
    append_ui_text(renderer, view, "local canvas", 16, 29, text_color)
    append_ui_segment(renderer, view, {112, 12}, {112, 44}, text_color, 1.0)

    top_icons := [?]ui_icon{.undo, .redo, .open, .save, .grid, .svg, .image, .theme, .png, .library}
    for index in 0 ..< len(top_icons) {
        left := 124.0 + f32(index) * 40.0
        active := (index == 4 && show_grid) || (index == 7 && dark_mode)
        background := button_background
        if active {
            background = {0.72, 0.84, 1.0, 1.0}
            if dark_mode {
                background = {0.27, 0.42, 0.66, 1.0}
            }
        }
        append_ui_rect(&renderer.vertices, view, left, 10, left + 34, 44, background)
        append_ui_icon(renderer, view, top_icons[index], left + 1, 7, text_color)
    }

    append_ui_text(renderer, view, "untitled", view.width * 0.5 - 24, 17, text_color)
    append_ui_text(renderer, view, "offline", view.width - 100, 17, text_color)

    rail_background := toolbar_background
    append_ui_rect(&renderer.vertices, view, 6, 60, 54, 60 + 10.0 * 42.0 + 8.0, rail_background)
    tool_icons := [?]ui_icon{.selection, .rectangle, .ellipse, .diamond, .line, .arrow, .text, .freedraw, .eraser, .frame}
    for index in 0 ..< len(tool_icons) {
        top := 64.0 + f32(index) * 42.0
        active := index == 0 && select_mode
        if index > 0 && index < 10 && !select_mode {
            active = (index == 1 && active_kind == .rectangle) ||
                (index == 2 && active_kind == .ellipse) ||
                (index == 3 && active_kind == .diamond) ||
                (index == 4 && active_kind == .line) ||
                (index == 5 && active_kind == .arrow) ||
                (index == 6 && active_kind == .text) ||
                (index == 7 && active_kind == .freehand) ||
                (index == 9 && active_kind == .frame)
        }
        if index == 8 {
            active = eraser_mode
        }
        background := button_background
        icon_color := text_color
        if active {
            background = {0.72, 0.84, 1.0, 1.0}
            icon_color = {0.10, 0.24, 0.56, 1.0}
            if dark_mode {
                background = {0.27, 0.42, 0.66, 1.0}
                icon_color = {0.95, 0.97, 1.0, 1.0}
            }
        }
        append_ui_rect(&renderer.vertices, view, 10, top, 50, top + 38, background)
        append_ui_icon(renderer, view, tool_icons[index], 10, top - 1, icon_color)
    }
}

append_library_panel :: proc(renderer: ^renderer, view: viewport.viewport, item_count: int, dark_mode: bool) {
    left := view.width - 286.0
    background: [4]f32 = {0.98, 0.98, 0.98, 0.98}
    text_color: [4]f32 = {0.14, 0.14, 0.16, 1.0}
    item_background: [4]f32 = {0.93, 0.94, 0.96, 1.0}
    muted: [4]f32 = {0.42, 0.44, 0.48, 1.0}
    if dark_mode {
        background = {0.12, 0.12, 0.14, 0.98}
        text_color = {0.92, 0.92, 0.95, 1.0}
        item_background = {0.21, 0.22, 0.25, 1.0}
        muted = {0.61, 0.62, 0.68, 1.0}
    }
    append_ui_rect(&renderer.vertices, view, left, 58, view.width - 6, view.height - 8, background)
    append_ui_text(renderer, view, "library", left + 14, 66, text_color)
    append_ui_text(renderer, view, "reusable pieces", left + 14, 94, muted)
    append_ui_icon(renderer, view, .chevron_left, view.width - 38, 64, muted)
    append_ui_rect(&renderer.vertices, view, left + 12, 118, view.width - 18, 150, item_background)
    append_ui_icon(renderer, view, .search, left + 16, 120, muted)
    append_ui_text(renderer, view, "search library", left + 48, 123, muted)

    if item_count <= 0 {
        append_ui_icon(renderer, view, .library, left + 106, 186, muted)
        append_ui_text(renderer, view, "no items yet", left + 96, 226, muted)
        append_ui_text(renderer, view, "shift-click library to import", left + 38, 250, muted)
        return
    }

    visible_count := min(item_count, 12)
    for index in 0 ..< visible_count {
        column := index % 2
        row := index / 2
        card_left := left + 12.0 + f32(column) * 134.0
        top := 158.0 + f32(row) * 94.0
        append_ui_rect(&renderer.vertices, view, card_left, top, card_left + 126, top + 84, item_background)
        preview_icon := [?]ui_icon{.rectangle, .ellipse, .diamond, .arrow, .freedraw, .text}
        append_ui_icon(renderer, view, preview_icon[index % len(preview_icon)], card_left + 43, top + 7, text_color)
        append_ui_text(renderer, view, fmt.tprintf("item %d", index + 1), card_left + 12, top + 52, text_color)
        append_ui_text(renderer, view, "click to insert", card_left + 12, top + 68, muted)
    }
}

append_properties_panel :: proc(renderer: ^renderer, view: viewport.viewport, has_selection, dark_mode: bool) {
    if !has_selection {
        return
    }
    top := view.height - 76.0
    background: [4]f32 = {0.86, 0.86, 0.86, 1.0}
    text_color: [4]f32 = {0.10, 0.10, 0.10, 1.0}
    if dark_mode {
        background = {0.16, 0.16, 0.18, 1.0}
        text_color = {0.92, 0.92, 0.94, 1.0}
    }
    append_ui_rect(&renderer.vertices, view, 4, top, 248, view.height - 4, background)
    append_ui_text(renderer, view, "fill", 10, top + 4, text_color)
    append_ui_text(renderer, view, "stroke", 10, top + 38, text_color)
    palette := document.palette_colors
    for row in 0 ..< 2 {
        for color_index in 0 ..< len(document.palette_colors) {
            left := 52.0 + f32(color_index) * 34.0
            swatch_top := top + 4.0 + f32(row) * 34.0
            append_ui_rect(&renderer.vertices, view, left, swatch_top, left + 28, swatch_top + 28, palette[color_index])
        }
    }
}

save_png :: proc(path: string, width, height: i32) -> bool {
    if width <= 0 || height <= 0 {
        return false
    }
    pixels := make([]byte, int(width) * int(height) * 4)
    defer delete(pixels)
    gl.PixelStorei(gl.PACK_ALIGNMENT, 1)
    gl.ReadPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, raw_data(pixels))
    stb_image.flip_vertically_on_write(true)
    result := stb_image.write_png(
        strings.unsafe_string_to_cstring(path),
        width,
        height,
        4,
        raw_data(pixels),
        width * 4,
    )
    stb_image.flip_vertically_on_write(false)
    return result != 0
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

rough_value :: proc(seed, channel: u64) -> f32 {
    value := seed + channel * 0x9e3779b97f4a7c15
    value = value ~ (value >> 30)
    value *= 0xbf58476d1ce4e5b9
    value = value ~ (value >> 27)
    value *= 0x94d049bb133111eb
    value = value ~ (value >> 31)
    return f32(value % 2001) / 1000.0 - 1.0
}

append_styled_segment :: proc(
    vertices: ^[dynamic]vertex,
    view: viewport.viewport,
    a, b: [2]f32,
    color: [4]f32,
    thickness: f32,
    style: document.stroke_style,
    roughness: f32 = 0,
    seed: u64 = 0,
) {
    if roughness <= 0 {
        append_styled_segment_base(vertices, view, a, b, color, thickness, style)
        return
    }
    delta := b - a
    length := math.sqrt(delta[0] * delta[0] + delta[1] * delta[1])
    if length <= 0 {
        return
    }
    direction := delta / length
    normal: [2]f32 = {-direction[1], direction[0]}
    spread := roughness * 2.0 / view.zoom
    rough_start := a + normal * rough_value(seed, 1) * spread + direction * rough_value(seed, 2) * spread * 0.35
    rough_end := b + normal * rough_value(seed, 3) * spread + direction * rough_value(seed, 4) * spread * 0.35
    rough_mid := (a + b) * 0.5 + normal * rough_value(seed, 5) * spread + direction * rough_value(seed, 6) * spread
    append_styled_segment_base(vertices, view, rough_start, rough_mid, color, thickness, style)
    append_styled_segment_base(vertices, view, rough_mid, rough_end, color, thickness, style)

    secondary := color
    secondary.a *= 0.38
    secondary_offset := normal * spread * 0.55
    secondary_mid := rough_mid + normal * rough_value(seed, 7) * spread * 0.4
    append_styled_segment_base(vertices, view, rough_start + secondary_offset, secondary_mid + secondary_offset, secondary, thickness * 0.72, style)
    append_styled_segment_base(vertices, view, secondary_mid + secondary_offset, rough_end + secondary_offset, secondary, thickness * 0.72, style)
}

append_hachure_line :: proc(
    vertices: ^[dynamic]vertex,
    view: viewport.viewport,
    element: document.element,
    a, b: [2]f32,
    color: [4]f32,
    seed: u64,
) {
    append_styled_segment(
        vertices,
        view,
        rotate_point(element, a),
        rotate_point(element, b),
        color,
        0.8 / view.zoom,
        .solid,
        min(1.0, element.roughness * 0.55),
        seed,
    )
}

append_hachure :: proc(vertices: ^[dynamic]vertex, view: viewport.viewport, element: document.element) {
    if element.fill_style != .hachure && element.fill_style != .cross_hatch {
        return
    }
    if element.width <= 0 || element.height <= 0 {
        return
    }
    color := element_color(element.stroke, element.opacity)
    color.a *= 0.42
    spacing := max(8.0, min(18.0, 10.0 + element.stroke_width * 2.0))
    left := element.x
    top := element.y
    right := element.x + element.width
    bottom := element.y + element.height
    center_x := (left + right) * 0.5
    center_y := (top + bottom) * 0.5

    switch element.kind {
    case .rectangle:
        for step := 1; f32(step) * spacing < element.height; step += 1 {
            y := top + f32(step) * spacing
            append_hachure_line(vertices, view, element, {left + 3, y}, {right - 3, y}, color, element.id + u64(step))
        }
        if element.fill_style == .cross_hatch {
            for step := 1; f32(step) * spacing < element.width; step += 1 {
                x := left + f32(step) * spacing
                append_hachure_line(vertices, view, element, {x, top + 3}, {x, bottom - 3}, color, element.id + 1000 + u64(step))
            }
        }
    case .ellipse:
        radius_x := element.width * 0.5
        radius_y := element.height * 0.5
        for step := 1; f32(step) * spacing < element.height; step += 1 {
            y := top + f32(step) * spacing
            normalized_y := (y - center_y) / radius_y
            half_width := radius_x * math.sqrt(max(0.0, 1.0 - normalized_y * normalized_y))
            append_hachure_line(vertices, view, element, {center_x - half_width, y}, {center_x + half_width, y}, color, element.id + u64(step))
        }
    case .diamond:
        for step := 1; f32(step) * spacing < element.height; step += 1 {
            y := top + f32(step) * spacing
            normalized_y := math.abs((y - center_y) / (element.height * 0.5))
            half_width := element.width * 0.5 * max(0.0, 1.0 - normalized_y)
            append_hachure_line(vertices, view, element, {center_x - half_width, y}, {center_x + half_width, y}, color, element.id + u64(step))
        }
    case .line, .arrow, .text, .freehand, .image, .frame:
        return
    }
}

append_styled_segment_base :: proc(
    vertices: ^[dynamic]vertex,
    view: viewport.viewport,
    a, b: [2]f32,
    color: [4]f32,
    thickness: f32,
    style: document.stroke_style,
) {
    if style == .solid {
        append_segment(vertices, view, a, b, color, thickness)
        return
    }
    delta := b - a
    length := math.sqrt(delta[0] * delta[0] + delta[1] * delta[1])
    if length <= 0 {
        return
    }
    direction := delta / length
    dash_length := 12.0 / view.zoom
    gap_length := 8.0 / view.zoom
    if style == .dotted {
        dash_length = max(1.0 / view.zoom, thickness * 1.5)
        gap_length = 5.0 / view.zoom
    }
    distance: f32 = 0
    for distance < length {
        dash_end := min(length, distance + dash_length)
        append_segment(
            vertices,
            view,
            a + direction * distance,
            a + direction * dash_end,
            color,
            thickness,
        )
        distance += dash_length + gap_length
    }
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
    case .rectangle, .frame:
        top_left := rotate_point(element, {left, top})
        top_right := rotate_point(element, {right, top})
        bottom_right := rotate_point(element, {right, bottom})
        bottom_left := rotate_point(element, {left, bottom})
        append_segment(vertices, view, top_left, top_right, selection_color, thickness)
        append_segment(vertices, view, top_right, bottom_right, selection_color, thickness)
        append_segment(vertices, view, bottom_right, bottom_left, selection_color, thickness)
        append_segment(vertices, view, bottom_left, top_left, selection_color, thickness)
    case .image:
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
    dark_mode: bool = false,
    eraser_mode: bool = false,
    library_open: bool = false,
    library_count: int = 0,
) {
    clear(&renderer.vertices)
    clear(&renderer.text_vertices)
    clear(&renderer.image_vertices)

    if show_grid {
        append_grid(&renderer.vertices, view)
    }

    for element in doc.elements {
        if element.kind == .text {
            append_text(renderer, view, element)
        } else if element.kind == .image {
            append_image(renderer, doc, view, element)
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

    append_toolbar(renderer, view, toolbar_select_mode, toolbar_kind, show_grid, dark_mode, eraser_mode)
    append_properties_panel(renderer, view, len(selected_items) > 0 || selected >= 0, dark_mode)
    if library_open {
        append_library_panel(renderer, view, library_count, dark_mode)
    }

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

    if len(renderer.image_vertices) > 0 && renderer.image_program != 0 {
        gl.Enable(gl.BLEND)
        gl.BlendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        gl.UseProgram(renderer.image_program)
        gl.BindVertexArray(renderer.image_vao)
        gl.BindBuffer(gl.ARRAY_BUFFER, renderer.image_vbo)
        gl.BufferData(
            gl.ARRAY_BUFFER,
            len(renderer.image_vertices) * size_of(text_vertex),
            raw_data(renderer.image_vertices),
            gl.DYNAMIC_DRAW,
        )
        gl.ActiveTexture(gl.TEXTURE0)
        image_sampler := gl.GetUniformLocation(renderer.image_program, cstring("u_image"))
        gl.Uniform1i(image_sampler, 0)
        image_offset := 0
        for element in doc.elements {
            if element.kind != .image || element.image_id == "" {
                continue
            }
            if image, found := doc.images[element.image_id]; found {
                texture := ensure_image_texture(renderer, element.image_id, image.data_url)
                if texture != 0 {
                    gl.BindTexture(gl.TEXTURE_2D, texture)
                    gl.DrawArrays(gl.TRIANGLES, i32(image_offset), 6)
                    image_offset += 6
                }
            }
        }
        gl.Disable(gl.BLEND)
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
