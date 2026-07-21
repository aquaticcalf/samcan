package settings

import "core:encoding/json"
import "core:fmt"
import "core:os"
import "core:strings"

settings :: struct {
    version:      i32,
    dark_mode:    bool,
    show_grid:    bool,
    snap_to_grid: bool,
    recent_files: [dynamic]string,
}

new :: proc() -> settings {
    return settings{
        version = 1,
        recent_files = make([dynamic]string, 0),
    }
}

destroy :: proc(value: ^settings) {
    for path in value.recent_files {
        delete(path)
    }
    delete(value.recent_files)
    value^ = {}
}

path :: proc() -> string {
    app_data, found := os.lookup_env("APPDATA", context.allocator)
    if !found || app_data == "" {
        app_data = "."
    }
    directory := fmt.tprintf("%s/samcan", app_data)
    _ = os.make_directory_all(directory)
    return fmt.tprintf("%s/settings.json", directory)
}

load :: proc() -> (value: settings, ok: bool) {
    value = new()
    settings_path := path()
    defer delete(settings_path)

    data, read_error := os.read_entire_file(settings_path, context.allocator)
    if read_error != nil {
        return value, true
    }
    defer delete(data)

    parsed := new()
    if unmarshal_error := json.unmarshal(data, &parsed); unmarshal_error != nil {
        destroy(&parsed)
        return value, false
    }
    destroy(&value)
    value = parsed
    if value.version <= 0 {
        value.version = 1
    }
    return value, true
}

save :: proc(value: ^settings) -> bool {
    settings_path := path()
    defer delete(settings_path)
    data, marshal_error := json.marshal(value, json.Marshal_Options{pretty = true})
    if marshal_error != nil {
        return false
    }
    defer delete(data)

    temporary_path := fmt.tprintf("%s.tmp", settings_path)
    defer delete(temporary_path)
    if err := os.write_entire_file(temporary_path, data); err != nil {
        return false
    }
    if err := os.rename(temporary_path, settings_path); err != nil {
        _ = os.remove(temporary_path)
        return false
    }
    return true
}

remember :: proc(value: ^settings, file_path: string) {
    if file_path == "" {
        return
    }
    for index := 0; index < len(value.recent_files); index += 1 {
        if value.recent_files[index] == file_path {
            delete(value.recent_files[index])
            ordered_remove(&value.recent_files, index)
            break
        }
    }
    append(&value.recent_files, "")
    for index := len(value.recent_files) - 1; index > 0; index -= 1 {
        value.recent_files[index] = value.recent_files[index - 1]
    }
    value.recent_files[0] = strings.clone(file_path)
    for len(value.recent_files) > 12 {
        last := len(value.recent_files) - 1
        delete(value.recent_files[last])
        ordered_remove(&value.recent_files, last)
    }
}
