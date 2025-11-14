import { JSDOM } from "jsdom"

// Create a jsdom instance to provide browser APIs
const dom = new JSDOM("<!DOCTYPE html>", {
    url: "http://localhost",
    pretendToBeVisual: true,
})

// Expose only the necessary browser APIs for tests
// Keep Bun's native performance.now() as it works correctly
globalThis.window = dom.window as unknown as Window & typeof globalThis
globalThis.document = dom.window.document
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(
    dom.window,
)
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(
    dom.window,
)
