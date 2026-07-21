package main

import "core:fmt"

import platform "platform"

main :: proc() {
    app_window, ok := platform.open("samcan", 1280, 800)
    if !ok {
        return
    }
    defer platform.close(&app_window)

    fmt.println("samcan native shell")

    for {
        if platform.poll(&app_window) {
            break
        }

        platform.begin_frame(&app_window)
        platform.end_frame(&app_window)
    }
}
