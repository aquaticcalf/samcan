package storage

import "core:encoding/json"
import "core:fmt"
import "core:os"
import "core:strings"

import document "../document"

scene_file :: struct {
    type:     string,
    version:  i32,
    source:   string,
    elements: [dynamic]scene_element,
    appState: app_state,
    files:    map[string]file_data,
}

scene_element :: struct {
    id:             string,
    type:           string,
    x:              f64,
    y:              f64,
    width:          f64,
    height:         f64,
    text:           string,
    originalText:   string,
    fontSize:       f64,
    fontFamily:     i32,
    textAlign:      string,
    verticalAlign:  string,
    autoResize:     bool,
    lineHeight:     f64,
    points:         [dynamic][2]f64,
    angle:          f64,
    strokeColor:    string,
    backgroundColor:string,
    fillStyle:      string,
    strokeWidth:    f64,
    roughness:      f64,
    opacity:        f64,
    seed:           i64,
    version:        i32,
    versionNonce:   i64,
    isDeleted:      bool,
}

app_state :: struct {
    viewBackgroundColor: string,
    zoom:                f64,
    scrollX:             f64,
    scrollY:             f64,
}

file_data :: struct {
    mimeType:      string,
    id:            string,
    dataURL:       string,
    created:       i64,
    lastRetrieved: i64,
    version:       i32,
    status:        string,
}

save :: proc(path: string, doc: ^document.document) -> bool {
    file := scene_from_document(doc)
    defer destroy_scene(&file)

    data, marshal_error := json.marshal(file, json.Marshal_Options{pretty = true})
    if marshal_error != nil {
        return false
    }
    defer delete(data)

    temporary_path := fmt.tprintf("%s.tmp", path)
    if err := os.write_entire_file(temporary_path, data); err != nil {
        return false
    }
    if err := os.rename(temporary_path, path); err != nil {
        _ = os.remove(temporary_path)
        return false
    }
    return true
}

load :: proc(path: string) -> (doc: document.document, ok: bool) {
    data, read_error := os.read_entire_file(path, context.allocator)
    if read_error != nil {
        return
    }
    defer delete(data)

    file: scene_file
    if unmarshal_error := json.unmarshal(data, &file); unmarshal_error != nil {
        destroy_scene(&file)
        return
    }
    defer destroy_scene(&file)

    doc = document.new()
    for element in file.elements {
        kind, known := element_kind_from_name(element.type)
        if !known {
            continue
        }
        if kind == .text {
            font_size := f32(element.fontSize)
            if font_size <= 0 {
                font_size = document.default_font_size
            }
            line_height := f32(element.lineHeight)
            if line_height <= 0 {
                line_height = document.default_line_height
            }
            auto_resize := element.autoResize
            if element.fontSize == 0 && element.fontFamily == 0 && element.lineHeight == 0 {
                auto_resize = true
            }
            index := document.add_text_styled(
                &doc,
                f32(element.x),
                f32(element.y),
                element.text,
                parse_color(element.strokeColor),
                font_size,
                element.fontFamily,
                text_align_from_name(element.textAlign),
                vertical_align_from_name(element.verticalAlign),
                auto_resize,
                line_height,
            )
            doc.elements[index].stroke = parse_color(element.strokeColor)
            doc.elements[index].opacity = f32(element.opacity) / 100.0
            if element.opacity <= 0 {
                doc.elements[index].opacity = 1.0
            }
            if element.originalText != "" {
                delete(doc.elements[index].original_text)
                doc.elements[index].original_text = strings.clone(element.originalText)
            }
            if !auto_resize && element.width > 0 {
                doc.elements[index].width = f32(element.width)
            }
            continue
        }
        if kind == .freehand {
            start := [2]f32{f32(element.x), f32(element.y)}
            if len(element.points) > 0 {
                start = {f32(element.points[0][0]), f32(element.points[0][1])}
            }
            index := document.add_freehand(&doc, start[0], start[1], parse_color(element.backgroundColor))
            if len(element.points) > 1 {
                for point in element.points[1:] {
                    document.append_point(&doc, index, {f32(point[0]), f32(point[1])})
                }
            }
            continue
        }
        index := document.add(
            &doc,
            kind,
            f32(element.x),
            f32(element.y),
            f32(element.width),
            f32(element.height),
            parse_color(element.backgroundColor),
        )
        doc.elements[index].stroke = parse_color(element.strokeColor)
        if element.strokeWidth > 0 {
            doc.elements[index].stroke_width = f32(element.strokeWidth)
        }
        if element.opacity > 0 {
            doc.elements[index].opacity = f32(element.opacity) / 100.0
        }
    }

    ok = true
    return
}

scene_from_document :: proc(doc: ^document.document) -> scene_file {
    file := scene_file{
        type = "excalidraw",
        version = 2,
        source = "samcan",
        elements = make([dynamic]scene_element, len(doc.elements)),
        appState = app_state{
            viewBackgroundColor = "#f7f7f7",
            zoom = 1.0,
            scrollX = 0,
            scrollY = 0,
        },
        files = make(map[string]file_data),
    }

    for element in doc.elements {
        append(&file.elements, scene_element{
            id = fmt.tprintf("%d", element.id),
            type = element_type_name(element.kind),
            x = f64(element.x),
            y = f64(element.y),
            width = f64(element.width),
            height = f64(element.height),
            text = strings.clone(element.text),
            originalText = strings.clone(element.original_text),
            fontSize = f64(element.font_size),
            fontFamily = element.font_family,
            textAlign = text_align_name(element.text_align),
            verticalAlign = vertical_align_name(element.vertical_align),
            autoResize = element.auto_resize,
            lineHeight = f64(element.line_height),
            points = make([dynamic][2]f64, 0),
            angle = 0,
            strokeColor = format_color(element.stroke),
            backgroundColor = format_color(element.fill),
            fillStyle = "solid",
            strokeWidth = f64(element.stroke_width),
            roughness = 1,
            opacity = f64(element.opacity * 100.0),
            seed = i64(element.id),
            version = 1,
            versionNonce = i64(element.id),
            isDeleted = false,
        })
        for point in element.points {
            append(&file.elements[len(file.elements) - 1].points, [2]f64{f64(point[0]), f64(point[1])})
        }
    }
    return file
}

element_type_name :: proc(kind: document.element_kind) -> string {
    switch kind {
    case .rectangle:
        return "rectangle"
    case .ellipse:
        return "ellipse"
    case .diamond:
        return "diamond"
    case .line:
        return "line"
    case .arrow:
        return "arrow"
    case .text:
        return "text"
    case .freehand:
        return "freedraw"
    }
    return "rectangle"
}

element_kind_from_name :: proc(name: string) -> (document.element_kind, bool) {
    switch name {
    case "rectangle":
        return .rectangle, true
    case "ellipse":
        return .ellipse, true
    case "diamond":
        return .diamond, true
    case "line":
        return .line, true
    case "arrow":
        return .arrow, true
    case "text":
        return .text, true
    case "freedraw":
        return .freehand, true
    }
    return .rectangle, false
}

text_align_name :: proc(value: document.text_align) -> string {
    switch value {
    case .center:
        return "center"
    case .right:
        return "right"
    case .left:
        return "left"
    }
    return "left"
}

text_align_from_name :: proc(value: string) -> document.text_align {
    switch value {
    case "center":
        return .center
    case "right":
        return .right
    }
    return .left
}

vertical_align_name :: proc(value: document.vertical_align) -> string {
    switch value {
    case .middle:
        return "middle"
    case .bottom:
        return "bottom"
    case .top:
        return "top"
    }
    return "top"
}

vertical_align_from_name :: proc(value: string) -> document.vertical_align {
    switch value {
    case "middle":
        return .middle
    case "bottom":
        return .bottom
    }
    return .top
}

destroy_scene :: proc(file: ^scene_file) {
    for &element in file.elements {
        delete(element.text)
        delete(element.originalText)
        delete(element.points)
    }
    delete(file.elements)
    delete(file.files)
}

format_color :: proc(value: document.color) -> string {
    if value[3] <= 0 {
        return "transparent"
    }
    return fmt.tprintf(
        "#%02x%02x%02x",
        color_byte(value[0]),
        color_byte(value[1]),
        color_byte(value[2]),
    )
}

color_byte :: proc(value: f32) -> u8 {
    scaled := int(value * 255.0)
    return u8(max(0, min(255, scaled)))
}

parse_color :: proc(value: string) -> document.color {
    if value == "transparent" {
        return {0, 0, 0, 0}
    }
    if len(value) != 7 || value[0] != '#' {
        return {0.98, 0.80, 0.42, 1.0}
    }
    return {
        f32(hex_pair(value[1], value[2])) / 255.0,
        f32(hex_pair(value[3], value[4])) / 255.0,
        f32(hex_pair(value[5], value[6])) / 255.0,
        1.0,
    }
}

hex_pair :: proc(high, low: u8) -> u8 {
    return hex_digit(high) * 16 + hex_digit(low)
}

hex_digit :: proc(value: u8) -> u8 {
    switch value {
    case '0'..='9':
        return value - '0'
    case 'a'..='f':
        return value - 'a' + 10
    case 'A'..='F':
        return value - 'A' + 10
    }
    return 0
}
