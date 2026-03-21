import { describe, expect, test } from "bun:test"
import { create_camera } from "../camera/camera"
import {
  fit_camera_to_bounds,
  screen_to_world_camera,
  world_to_screen_camera,
} from "../camera/projection"

describe("camera", () => {
  test("world/screen conversion roundtrip", () => {
    const camera = create_camera(100, 50, 2, 0)
    const viewport: [number, number, number] = [800, 600, 1]
    const world: [number, number] = [112, 68]
    const screen: [number, number] = [0, 0]
    const back: [number, number] = [0, 0]
    world_to_screen_camera(camera, viewport, world, screen)
    screen_to_world_camera(camera, viewport, screen, back)
    expect(back[0]).toBeCloseTo(world[0], 6)
    expect(back[1]).toBeCloseTo(world[1], 6)
  })

  test("fit camera to bounds centers and sets positive zoom", () => {
    const out = create_camera()
    fit_camera_to_bounds([10, 20, 200, 100], [1000, 500, 1], 0.1, out)
    expect(out[0]).toBe(110)
    expect(out[1]).toBe(70)
    expect(out[2]).toBeGreaterThan(0)
    expect(out[3]).toBe(0)
  })
})
