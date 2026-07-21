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
