package storage

import "core:c"
import base64 "core:encoding/base64"
import "core:encoding/json"
import "core:fmt"
import "core:math"
import "core:os"
import "core:strings"

import stb "vendor:stb/image"
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
    groupIds:       [dynamic]string,
    frameId:        string,
    fileId:         string,
    link:           string,
    startBindingId: string,
    endBindingId:   string,
    locked:         bool,
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
    strokeStyle:    string,
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

library_item :: struct {
    id:       string,
    status:   string,
    elements: [dynamic]scene_element,
    created:  i64,
    name:     string,
}

library_file :: struct {
    type:        string,
    version:     i32,
    source:      string,
    library:     [dynamic][dynamic]scene_element,
    libraryItems:[dynamic]library_item,
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

autosave_path :: proc(path: string) -> string {
    return fmt.tprintf("%s.autosave", path)
}

save_autosave :: proc(path: string, doc: ^document.document) -> bool {
    return save(autosave_path(path), doc)
}

clear_autosave :: proc(path: string) -> bool {
    err := os.remove(autosave_path(path))
    return err == nil
}

has_autosave :: proc(path: string) -> bool {
    data, err := os.read_entire_file(autosave_path(path), context.allocator)
    if err != nil {
        return false
    }
    delete(data)
    return true
}

load_library :: proc(path: string) -> (items: [dynamic]library_item, ok: bool) {
    data, read_error := os.read_entire_file(path, context.allocator)
    if read_error != nil {
        return
    }
    defer delete(data)

    file: library_file
    if unmarshal_error := json.unmarshal(data, &file); unmarshal_error != nil {
        destroy_library_file(&file)
        return
    }
    defer destroy_library_file(&file)

    if file.type != "" && file.type != "excalidrawlib" {
        return
    }
    items = make([dynamic]library_item, 0)
    for source_item in file.libraryItems {
        append(&items, clone_library_item(source_item))
    }
    if len(items) == 0 {
        for index in 0 ..< len(file.library) {
            source_elements := file.library[index]
            append(&items, library_item{
                id = strings.clone(fmt.tprintf("legacy-%d", index)),
                status = strings.clone("unpublished"),
                elements = clone_scene_elements(source_elements[:]),
                created = 0,
                name = strings.clone(fmt.tprintf("library item %d", index + 1)),
            })
        }
    }
    ok = true
    return
}

save_library :: proc(path: string, items: []library_item) -> bool {
    file := library_file{
        type = "excalidrawlib",
        version = 2,
        source = "samcan",
        libraryItems = make([dynamic]library_item, 0, len(items)),
    }
    defer destroy_library_file(&file)
    for item in items {
        append(&file.libraryItems, clone_library_item(item))
    }

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

library_item_from_document :: proc(doc: ^document.document, name: string = "") -> library_item {
    scene := scene_from_document(doc)
    defer destroy_scene(&scene)
    item_name := name
    if item_name == "" {
        item_name = "samcan library item"
    }
    return library_item{
        id = strings.clone("samcan-item"),
        status = strings.clone("unpublished"),
        elements = clone_scene_elements(scene.elements[:]),
        created = 0,
        name = strings.clone(item_name),
    }
}

insert_library_item :: proc(doc: ^document.document, item: library_item, center_x, center_y: f32) -> bool {
    scene := scene_file{
        type = "excalidraw",
        version = 2,
        source = "samcan-library",
        elements = clone_scene_elements(item.elements[:]),
        files = make(map[string]file_data),
    }
    defer destroy_scene(&scene)

    source, source_ok := document_from_scene(&scene)
    if !source_ok || len(source.elements) == 0 {
        document.destroy(&source)
        return false
    }
    defer document.destroy(&source)

    min_x, min_y, max_x, max_y := document_bounds(&source)
    delta_x := center_x - (min_x + max_x) * 0.5
    delta_y := center_y - (min_y + max_y) * 0.5
    indices := document.append_document(doc, &source, delta_x, delta_y)
    defer delete(indices)
    return len(indices) > 0
}

destroy_library_items :: proc(items: ^[dynamic]library_item) {
    for &item in items {
        destroy_library_item(&item)
    }
    delete(items^)
}

import_image :: proc(doc: ^document.document, path: string, center_x, center_y: f32) -> bool {
    source, read_error := os.read_entire_file(path, context.allocator)
    if read_error != nil || len(source) == 0 {
        return false
    }
    defer delete(source)

    width, height, channels: c.int
    pixels := stb.load_from_memory(
        &source[0],
        c.int(len(source)),
        &width,
        &height,
        &channels,
        4,
    )
    if pixels == nil || width <= 0 || height <= 0 {
        if pixels != nil {
            stb.image_free(pixels)
        }
        return false
    }
    stb.image_free(pixels)

    mime_type := image_mime_type(path)
    encoded, encode_error := base64.encode(source)
    if encode_error != nil {
        return false
    }
    data_url := fmt.tprintf("data:%s;base64,%s", mime_type, encoded)
    delete(encoded)

    image_id := fmt.tprintf("file-%d", doc.next_id)
    doc.images[strings.clone(image_id)] = document.image_asset{
        mime_type = strings.clone(mime_type),
        data_url = strings.clone(data_url),
    }
    width_f := f32(width)
    height_f := f32(height)
    max_size: f32 = 640.0
    scale := min(1.0, max_size / max(width_f, height_f))
    width_f *= scale
    height_f *= scale
    _ = document.add_image(doc, center_x - width_f * 0.5, center_y - height_f * 0.5, width_f, height_f, image_id)
    return true
}

image_mime_type :: proc(path: string) -> string {
    if strings.ends_with(path, ".jpg") || strings.ends_with(path, ".jpeg") {
        return "image/jpeg"
    }
    if strings.ends_with(path, ".gif") {
        return "image/gif"
    }
    if strings.ends_with(path, ".bmp") {
        return "image/bmp"
    }
    if strings.ends_with(path, ".tga") {
        return "image/x-tga"
    }
    if strings.ends_with(path, ".hdr") {
        return "image/vnd.radiance"
    }
    return "image/png"
}

save_svg :: proc(path: string, doc: ^document.document) -> bool {
    min_x, min_y, max_x, max_y := document_bounds(doc)
    padding: f32 = 20.0
    min_x -= padding
    min_y -= padding
    max_x += padding
    max_y += padding
    width := max(1.0, max_x - min_x)
    height := max(1.0, max_y - min_y)

    builder, builder_error := strings.builder_make()
    if builder_error != nil {
        return false
    }
    defer strings.builder_destroy(&builder)

    fmt.sbprintf(
        &builder,
        "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"%f %f %f %f\" width=\"%f\" height=\"%f\">\n",
        min_x,
        min_y,
        width,
        height,
        width,
        height,
    )
    for element in doc.elements {
        image_data := ""
        if element.image_id != "" {
            if image, found := doc.images[element.image_id]; found {
                image_data = image.data_url
            }
        }
        append_svg_element(&builder, element, image_data)
    }
    strings.write_string(&builder, "</svg>\n")

    svg := strings.to_string(builder)
    temporary_path := fmt.tprintf("%s.tmp", path)
    if err := os.write_entire_file_from_string(temporary_path, svg); err != nil {
        return false
    }
    if err := os.rename(temporary_path, path); err != nil {
        _ = os.remove(temporary_path)
        return false
    }
    return true
}

document_bounds :: proc(doc: ^document.document) -> (min_x, min_y, max_x, max_y: f32) {
    if len(doc.elements) == 0 {
        return -320, -200, 320, 200
    }
    first := doc.elements[0]
    min_x = first.x
    min_y = first.y
    max_x = first.x + first.width
    max_y = first.y + first.height
    for element in doc.elements[1:] {
        min_x = min(min_x, element.x)
        min_y = min(min_y, element.y)
        max_x = max(max_x, element.x + element.width)
        max_y = max(max_y, element.y + element.height)
        for point in element.points {
            min_x = min(min_x, point[0])
            min_y = min(min_y, point[1])
            max_x = max(max_x, point[0])
            max_y = max(max_y, point[1])
        }
    }
    return
}

append_svg_element :: proc(builder: ^strings.Builder, element: document.element, image_data: string = "") {
    stroke := format_color(element.stroke)
    fill := format_color(element.fill)
    if element.fill_style == .none {
        fill = "none"
    }
    if fill == "transparent" {
        fill = "none"
    }
    if stroke == "transparent" {
        stroke = "none"
    }
    opacity := max(0.0, min(1.0, element.opacity))
    dash_attribute := ""
    if element.stroke_style == .dashed {
        dash_attribute = " stroke-dasharray=\"12,8\""
    } else if element.stroke_style == .dotted {
        dash_attribute = " stroke-dasharray=\"3,5\""
    }
    rotated := element.angle != 0
    if rotated {
        degrees := element.angle * 57.2957795
        center_x := element.x + element.width * 0.5
        center_y := element.y + element.height * 0.5
        fmt.sbprintf(builder, "<g transform=\"rotate(%f %f %f)\">\n", degrees, center_x, center_y)
    }
    switch element.kind {
    case .rectangle, .frame:
        fmt.sbprintf(
            builder,
            "<rect x=\"%f\" y=\"%f\" width=\"%f\" height=\"%f\" fill=\"%s\" stroke=\"%s\" stroke-width=\"%f\" opacity=\"%f\"%s />\n",
            element.x, element.y, element.width, element.height, fill, stroke, element.stroke_width, opacity, dash_attribute,
        )
    case .ellipse:
        fmt.sbprintf(
            builder,
            "<ellipse cx=\"%f\" cy=\"%f\" rx=\"%f\" ry=\"%f\" fill=\"%s\" stroke=\"%s\" stroke-width=\"%f\" opacity=\"%f\"%s />\n",
            element.x + element.width * 0.5,
            element.y + element.height * 0.5,
            element.width * 0.5,
            element.height * 0.5,
            fill,
            stroke,
            element.stroke_width,
            opacity,
            dash_attribute,
        )
    case .diamond:
        fmt.sbprintf(
            builder,
            "<polygon points=\"%f,%f %f,%f %f,%f %f,%f\" fill=\"%s\" stroke=\"%s\" stroke-width=\"%f\" opacity=\"%f\"%s />\n",
            element.x + element.width * 0.5, element.y,
            element.x + element.width, element.y + element.height * 0.5,
            element.x + element.width * 0.5, element.y + element.height,
            element.x, element.y + element.height * 0.5,
            fill, stroke, element.stroke_width, opacity,
            dash_attribute,
        )
    case .line, .arrow:
        fmt.sbprintf(
            builder,
            "<line x1=\"%f\" y1=\"%f\" x2=\"%f\" y2=\"%f\" stroke=\"%s\" stroke-width=\"%f\" stroke-linecap=\"round\" opacity=\"%f\"%s />\n",
            element.x, element.y, element.x + element.width, element.y + element.height,
            stroke, element.stroke_width, opacity, dash_attribute,
        )
        if element.kind == .arrow {
            append_svg_arrowhead(builder, element, stroke, opacity)
        }
    case .freehand:
        if len(element.points) > 0 {
            strings.write_string(builder, "<polyline points=\"")
            for point in element.points {
                fmt.sbprintf(builder, "%f,%f ", point[0], point[1])
            }
            fmt.sbprintf(
                builder,
                "\" fill=\"none\" stroke=\"%s\" stroke-width=\"%f\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\"%f\"%s />\n",
                stroke, element.stroke_width, opacity, dash_attribute,
            )
        }
    case .text:
        fmt.sbprintf(
            builder,
            "<text x=\"%f\" y=\"%f\" font-family=\"Excalifont\" font-size=\"%f\" fill=\"%s\" opacity=\"%f\" dominant-baseline=\"hanging\">",
            element.x, element.y, element.font_size, fill, opacity,
        )
        append_svg_text(builder, element.text)
        strings.write_string(builder, "</text>\n")
    case .image:
        if image_data != "" {
            fmt.sbprintf(
                builder,
                "<image href=\"%s\" x=\"%f\" y=\"%f\" width=\"%f\" height=\"%f\" opacity=\"%f\" preserveAspectRatio=\"none\" />\n",
                image_data, element.x, element.y, element.width, element.height, opacity,
            )
        }
    }
    if rotated {
        strings.write_string(builder, "</g>\n")
    }
}

append_svg_arrowhead :: proc(builder: ^strings.Builder, element: document.element, stroke: string, opacity: f32) {
    start: [2]f32 = {element.x, element.y}
    finish: [2]f32 = {element.x + element.width, element.y + element.height}
    delta := finish - start
    length := math.sqrt(delta[0] * delta[0] + delta[1] * delta[1])
    if length <= 0 {
        return
    }
    direction := delta / length
    normal: [2]f32 = {-direction[1], direction[0]}
    base := finish - direction * 14.0
    left := base + normal * 7.0
    right := base - normal * 7.0
    fmt.sbprintf(
        builder,
        "<polygon points=\"%f,%f %f,%f %f,%f\" fill=\"%s\" opacity=\"%f\" />\n",
        finish[0], finish[1], left[0], left[1], right[0], right[1], stroke, opacity,
    )
}

append_svg_text :: proc(builder: ^strings.Builder, text: string) {
    for character in text {
        switch character {
        case '&':
            strings.write_string(builder, "&amp;")
        case '<':
            strings.write_string(builder, "&lt;")
        case '>':
            strings.write_string(builder, "&gt;")
        case '"':
            strings.write_string(builder, "&quot;")
        case '\'':
            strings.write_string(builder, "&apos;")
        case '\n':
            strings.write_string(builder, "&#10;")
        case:
            written, write_error := strings.write_rune(builder, character)
            _ = written
            _ = write_error
        }
    }
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

    loaded, loaded_ok := document_from_scene(&file)
    doc = loaded
    ok = loaded_ok
    return
}

document_from_scene :: proc(file: ^scene_file) -> (doc: document.document, ok: bool) {
    doc = document.new()
    for image_id, file_data in file.files {
        if file_data.dataURL != "" {
            doc.images[strings.clone(image_id)] = document.image_asset{
                mime_type = strings.clone(file_data.mimeType),
                data_url = strings.clone(file_data.dataURL),
            }
        }
    }
    source_ids := make(map[u64]u64)
    defer delete(source_ids)
    next_id := doc.next_id
    for source_element in file.elements {
        _, known := element_kind_from_name(source_element.type)
        if known {
            source_ids[group_id_from_string(source_element.id)] = next_id
            next_id += 1
        }
    }
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
            doc.elements[index].stroke_style = stroke_style_from_name(element.strokeStyle)
            doc.elements[index].fill_style = fill_style_from_name(element.fillStyle)
            doc.elements[index].roughness = f32(element.roughness)
            doc.elements[index].angle = f32(element.angle)
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
            if len(element.groupIds) > 0 {
                doc.elements[index].group_id = group_id_from_string(element.groupIds[0])
            }
        doc.elements[index].locked = element.locked
            if element.frameId != "" {
                source_id := group_id_from_string(element.frameId)
                if target_id, found := source_ids[source_id]; found {
                    doc.elements[index].frame_id = target_id
                }
            }
            if element.link != "" {
                doc.elements[index].link = strings.clone(element.link)
            }
            continue
        }
        if kind == .freehand {
            start := [2]f32{f32(element.x), f32(element.y)}
            if len(element.points) > 0 {
                start = {f32(element.points[0][0]), f32(element.points[0][1])}
            }
            index := document.add_freehand(&doc, start[0], start[1], parse_color(element.backgroundColor))
            doc.elements[index].angle = f32(element.angle)
            if len(element.points) > 1 {
                for point in element.points[1:] {
                    document.append_point(&doc, index, {f32(point[0]), f32(point[1])})
                }
            }
            doc.elements[index].stroke_style = stroke_style_from_name(element.strokeStyle)
            doc.elements[index].fill_style = fill_style_from_name(element.fillStyle)
            doc.elements[index].roughness = f32(element.roughness)
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
        doc.elements[index].stroke_style = stroke_style_from_name(element.strokeStyle)
        doc.elements[index].fill_style = fill_style_from_name(element.fillStyle)
        doc.elements[index].roughness = f32(element.roughness)
        doc.elements[index].angle = f32(element.angle)
        if element.strokeWidth > 0 {
            doc.elements[index].stroke_width = f32(element.strokeWidth)
        }
        if element.opacity > 0 {
            doc.elements[index].opacity = f32(element.opacity) / 100.0
        }
        if len(element.groupIds) > 0 {
            doc.elements[index].group_id = group_id_from_string(element.groupIds[0])
        }
        doc.elements[index].locked = element.locked
        if element.frameId != "" {
            source_id := group_id_from_string(element.frameId)
            if target_id, found := source_ids[source_id]; found {
                doc.elements[index].frame_id = target_id
            }
        }
        if element.link != "" {
            doc.elements[index].link = strings.clone(element.link)
        }
        if kind == .image && element.fileId != "" {
            doc.elements[index].image_id = strings.clone(element.fileId)
        }
        doc.elements[index].start_binding_id = 0
        if element.startBindingId != "" {
            source_id := group_id_from_string(element.startBindingId)
            if target_id, found := source_ids[source_id]; found {
                doc.elements[index].start_binding_id = target_id
            }
        }
        doc.elements[index].end_binding_id = 0
        if element.endBindingId != "" {
            source_id := group_id_from_string(element.endBindingId)
            if target_id, found := source_ids[source_id]; found {
                doc.elements[index].end_binding_id = target_id
            }
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
        elements = make([dynamic]scene_element, 0, len(doc.elements)),
        appState = app_state{
            viewBackgroundColor = "#f7f7f7",
            zoom = 1.0,
            scrollX = 0,
            scrollY = 0,
        },
        files = make(map[string]file_data),
    }

    for element in doc.elements {
        start_binding_id := ""
        if element.start_binding_id != 0 {
            start_binding_id = strings.clone(fmt.tprintf("%d", element.start_binding_id))
        }
        end_binding_id := ""
        if element.end_binding_id != 0 {
            end_binding_id = strings.clone(fmt.tprintf("%d", element.end_binding_id))
        }
        append(&file.elements, scene_element{
            id = fmt.tprintf("%d", element.id),
            type = element_type_name(element.kind),
            x = f64(element.x),
            y = f64(element.y),
            width = f64(element.width),
            height = f64(element.height),
            text = strings.clone(element.text),
            originalText = strings.clone(element.original_text),
            groupIds = make([dynamic]string, 0),
            frameId = "",
            fileId = strings.clone(element.image_id),
            link = strings.clone(element.link),
            startBindingId = start_binding_id,
            endBindingId = end_binding_id,
            locked = element.locked,
            fontSize = f64(element.font_size),
            fontFamily = element.font_family,
            textAlign = text_align_name(element.text_align),
            verticalAlign = vertical_align_name(element.vertical_align),
            autoResize = element.auto_resize,
            lineHeight = f64(element.line_height),
            points = make([dynamic][2]f64, 0),
            angle = f64(element.angle),
            strokeColor = format_color(element.stroke),
            backgroundColor = format_color(element.fill),
            fillStyle = fill_style_name(element.fill_style),
            strokeWidth = f64(element.stroke_width),
            strokeStyle = stroke_style_name(element.stroke_style),
            roughness = f64(element.roughness),
            opacity = f64(element.opacity * 100.0),
            seed = i64(element.id),
            version = 1,
            versionNonce = i64(element.id),
            isDeleted = false,
        })
        if element.group_id != 0 {
            append(&file.elements[len(file.elements) - 1].groupIds, fmt.tprintf("%d", element.group_id))
        }
        if element.frame_id != 0 {
            file.elements[len(file.elements) - 1].frameId = fmt.tprintf("%d", element.frame_id)
        }
        for point in element.points {
            append(&file.elements[len(file.elements) - 1].points, [2]f64{f64(point[0]), f64(point[1])})
        }
    }
    for image_id, image in doc.images {
        file.files[strings.clone(image_id)] = file_data{
            mimeType = strings.clone(image.mime_type),
            id = strings.clone(image_id),
            dataURL = strings.clone(image.data_url),
            version = 1,
            status = "saved",
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
    case .image:
        return "image"
    case .frame:
        return "frame"
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
    case "image":
        return .image, true
    case "frame":
        return .frame, true
    }
    return .rectangle, false
}

stroke_style_name :: proc(value: document.stroke_style) -> string {
    switch value {
    case .dashed:
        return "dashed"
    case .dotted:
        return "dotted"
    case .solid:
        return "solid"
    }
    return "solid"
}

stroke_style_from_name :: proc(value: string) -> document.stroke_style {
    switch value {
    case "dashed":
        return .dashed
    case "dotted":
        return .dotted
    }
    return .solid
}

fill_style_name :: proc(value: document.fill_style) -> string {
    switch value {
    case .none:
        return "none"
    case .solid:
        return "solid"
    }
    return "solid"
}

fill_style_from_name :: proc(value: string) -> document.fill_style {
    if value == "none" {
        return .none
    }
    return .solid
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
        delete(element.groupIds)
        delete(element.fileId)
        delete(element.startBindingId)
        delete(element.endBindingId)
        delete(element.points)
    }
    delete(file.elements)
    delete(file.files)
}

clone_scene_elements :: proc(source: []scene_element) -> [dynamic]scene_element {
    result := make([dynamic]scene_element, 0, len(source))
    for element in source {
        append(&result, clone_scene_element(element))
    }
    return result
}

clone_scene_element :: proc(source: scene_element) -> scene_element {
    result := source
    result.id = strings.clone(source.id)
    result.text = strings.clone(source.text)
    result.originalText = strings.clone(source.originalText)
    result.fileId = strings.clone(source.fileId)
    result.startBindingId = strings.clone(source.startBindingId)
    result.endBindingId = strings.clone(source.endBindingId)
    result.groupIds = make([dynamic]string, 0, len(source.groupIds))
    for group_id in source.groupIds {
        append(&result.groupIds, strings.clone(group_id))
    }
    result.points = make([dynamic][2]f64, 0, len(source.points))
    for point in source.points {
        append(&result.points, point)
    }
    return result
}

clone_library_item :: proc(source: library_item) -> library_item {
    return library_item{
        id = strings.clone(source.id),
        status = strings.clone(source.status),
        elements = clone_scene_elements(source.elements[:]),
        created = source.created,
        name = strings.clone(source.name),
    }
}

destroy_library_item :: proc(item: ^library_item) {
    delete(item.id)
    delete(item.status)
    delete(item.name)
    for &element in item.elements {
        delete(element.text)
        delete(element.originalText)
        delete(element.groupIds)
        delete(element.fileId)
        delete(element.startBindingId)
        delete(element.endBindingId)
        delete(element.points)
    }
    delete(item.elements)
}

destroy_library_file :: proc(file: ^library_file) {
    for &item in file.libraryItems {
        destroy_library_item(&item)
    }
    delete(file.libraryItems)
    for group in file.library {
        for &element in group {
            delete(element.text)
            delete(element.originalText)
            delete(element.groupIds)
            delete(element.fileId)
            delete(element.startBindingId)
            delete(element.endBindingId)
            delete(element.points)
        }
        delete(group)
    }
    delete(file.library)
}

group_id_from_string :: proc(value: string) -> u64 {
    number: u64 = 0
    numeric := len(value) > 0
    for byte in value {
        if byte < '0' || byte > '9' {
            numeric = false
            break
        }
        number = number * 10 + u64(byte - '0')
    }
    if numeric && number != 0 {
        return number
    }

    hash: u64 = 17
    for byte in value {
        hash = hash * 131 + u64(byte)
    }
    if hash == 0 {
        return 1
    }
    return hash
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
