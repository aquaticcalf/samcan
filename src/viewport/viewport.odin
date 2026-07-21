package viewport

viewport :: struct {
    origin: [2]f32,
    zoom:   f32,
    width:  f32,
    height: f32,
}

new :: proc(width, height: f32) -> viewport {
    return viewport{
        origin = {width * 0.5, height * 0.5},
        zoom = 1.0,
        width = width,
        height = height,
    }
}

resize :: proc(view: ^viewport, width, height: f32) {
    view.width = width
    view.height = height
}

screen_to_world :: proc(view: viewport, point: [2]f32) -> [2]f32 {
    return {
        (point[0] - view.origin[0]) / view.zoom,
        (point[1] - view.origin[1]) / view.zoom,
    }
}

world_to_screen :: proc(view: viewport, point: [2]f32) -> [2]f32 {
    return {
        view.origin[0] + point[0] * view.zoom,
        view.origin[1] + point[1] * view.zoom,
    }
}

pan :: proc(view: ^viewport, delta: [2]f32) {
    view.origin += delta
}

zoom_at :: proc(view: ^viewport, point: [2]f32, factor: f32) {
    before := screen_to_world(view^, point)
    view.zoom = max(0.1, min(8.0, view.zoom * factor))
    after := world_to_screen(view^, before)
    view.origin += point - after
}

reset :: proc(view: ^viewport) {
    view.zoom = 1.0
    view.origin = {view.width * 0.5, view.height * 0.5}
}

fit_bounds :: proc(view: ^viewport, min_point, max_point: [2]f32, padding: f32 = 40.0) -> bool {
    bounds_width := max(1.0, max_point[0] - min_point[0])
    bounds_height := max(1.0, max_point[1] - min_point[1])
    available_width := max(1.0, view.width - padding * 2.0)
    available_height := max(1.0, view.height - padding * 2.0)
    view.zoom = max(0.1, min(8.0, min(available_width / bounds_width, available_height / bounds_height)))
    center := (min_point + max_point) * 0.5
    view.origin = {
        view.width * 0.5 - center[0] * view.zoom,
        view.height * 0.5 - center[1] * view.zoom,
    }
    return true
}
