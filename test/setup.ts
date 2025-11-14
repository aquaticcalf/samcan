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

// Add CompressionStream and DecompressionStream polyfills for jsdom
// These are browser APIs that jsdom doesn't provide by default
if (typeof globalThis.CompressionStream === "undefined") {
    // Use Bun's native compression as a polyfill for the browser API
    class CompressionStreamPolyfill {
        readable: ReadableStream<Uint8Array>
        writable: WritableStream<Uint8Array>
        private _buffer: Uint8Array[] = []
        private _readableController: ReadableStreamDefaultController<Uint8Array> | null =
            null

        constructor(format: "gzip" | "deflate" | "deflate-raw") {
            if (format !== "gzip") {
                throw new Error(`Unsupported compression format: ${format}`)
            }

            this.readable = new ReadableStream({
                start: (controller) => {
                    this._readableController = controller
                },
            })

            this.writable = new WritableStream({
                write: (chunk: Uint8Array) => {
                    this._buffer.push(chunk)
                },
                close: () => {
                    // Combine all input chunks
                    const totalLength = this._buffer.reduce(
                        (sum, chunk) => sum + chunk.length,
                        0,
                    )
                    const combined = new Uint8Array(totalLength)
                    let offset = 0
                    for (const chunk of this._buffer) {
                        combined.set(chunk, offset)
                        offset += chunk.length
                    }

                    // Compress using Bun's native gzip
                    const compressed = Bun.gzipSync(combined)
                    this._readableController?.enqueue(compressed)
                    this._readableController?.close()
                },
            })
        }
    }

    class DecompressionStreamPolyfill {
        readable: ReadableStream<Uint8Array>
        writable: WritableStream<Uint8Array>
        private _buffer: Uint8Array[] = []
        private _readableController: ReadableStreamDefaultController<Uint8Array> | null =
            null

        constructor(format: "gzip" | "deflate" | "deflate-raw") {
            if (format !== "gzip") {
                throw new Error(`Unsupported decompression format: ${format}`)
            }

            this.readable = new ReadableStream({
                start: (controller) => {
                    this._readableController = controller
                },
            })

            this.writable = new WritableStream({
                write: (chunk: Uint8Array) => {
                    this._buffer.push(chunk)
                },
                close: () => {
                    // Combine all input chunks
                    const totalLength = this._buffer.reduce(
                        (sum, chunk) => sum + chunk.length,
                        0,
                    )
                    const combined = new Uint8Array(totalLength)
                    let offset = 0
                    for (const chunk of this._buffer) {
                        combined.set(chunk, offset)
                        offset += chunk.length
                    }

                    // Decompress using Bun's native gunzip
                    const decompressed = Bun.gunzipSync(combined)
                    this._readableController?.enqueue(decompressed)
                    this._readableController?.close()
                },
            })
        }
    }

    globalThis.CompressionStream =
        CompressionStreamPolyfill as unknown as typeof CompressionStream
    globalThis.DecompressionStream =
        DecompressionStreamPolyfill as unknown as typeof DecompressionStream
}
