package storage

import "core:encoding/json"
import "core:fmt"
import "core:os"

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
        if element.type != "rectangle" {
            continue
        }
        document.add_rectangle(
            &doc,
            f32(element.x),
            f32(element.y),
            f32(element.width),
            f32(element.height),
            parse_color(element.backgroundColor),
        )
    }

    ok = true
    return
}

scene_from_document :: proc(doc: ^document.document) -> scene_file {
    file := scene_file{
        type = "excalidraw",
        version = 2,
        source = "samcan",
        elements = make([dynamic]scene_element, len(doc.rectangles)),
        appState = app_state{
            viewBackgroundColor = "#f7f7f7",
            zoom = 1.0,
            scrollX = 0,
            scrollY = 0,
        },
        files = make(map[string]file_data),
    }

    for rect in doc.rectangles {
        append(&file.elements, scene_element{
            id = fmt.tprintf("%d", rect.id),
            type = "rectangle",
            x = f64(rect.x),
            y = f64(rect.y),
            width = f64(rect.width),
            height = f64(rect.height),
            angle = 0,
            strokeColor = "#1e1e1e",
            backgroundColor = format_color(rect.fill),
            fillStyle = "solid",
            strokeWidth = 1,
            roughness = 1,
            opacity = 100,
            seed = i64(rect.id),
            version = 1,
            versionNonce = i64(rect.id),
            isDeleted = false,
        })
    }
    return file
}

destroy_scene :: proc(file: ^scene_file) {
    delete(file.elements)
    delete(file.files)
}

format_color :: proc(value: document.color) -> string {
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
