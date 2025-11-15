import { JSDOM } from "jsdom"

// Prevent multiple executions of setup
export function setupDOM() {
    if (
        (globalThis as any).__samcan_dom_setup_done &&
        typeof globalThis.document !== "undefined"
    ) {
        return // Already set up and still present
    }
    ;(globalThis as any).__samcan_dom_setup_done = true

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

    // Mock Image class that actually triggers onload for tests
    class MockImage {
        private _src = ""
        width = 0
        height = 0
        naturalWidth = 0
        naturalHeight = 0
        crossOrigin: string | null = null
        onload: ((event: Event) => void) | null = null
        onerror: ((event: Event) => void) | null = null

        get src() {
            return this._src
        }

        set src(value: string) {
            this._src = value
            // Simulate async image loading
            setTimeout(() => {
                // Check if URL looks valid
                const isDataUrl = value.startsWith("data:image/")
                const isValidUrl =
                    value.includes("://") && !value.includes("invalid-domain")

                if (!isDataUrl && !isValidUrl) {
                    // Invalid URL, trigger error
                    if (this.onerror) {
                        this.onerror(new Event("error"))
                    }
                } else {
                    // Mock successful load with fake dimensions
                    this.width = 2
                    this.height = 2
                    this.naturalWidth = 2
                    this.naturalHeight = 2
                    if (this.onload) {
                        this.onload(new Event("load"))
                    }
                }
            }, 0)
        }
    }

    // Make MockImage instanceof HTMLImageElement
    Object.setPrototypeOf(
        MockImage.prototype,
        dom.window.HTMLImageElement.prototype,
    )

    globalThis.Image = MockImage as any
    globalThis.HTMLImageElement = dom.window.HTMLImageElement
    globalThis.HTMLCanvasElement = dom.window.HTMLCanvasElement

    // Mock ImageData for canvas API
    globalThis.ImageData = class MockImageData {
        width: number
        height: number
        data: Uint8ClampedArray

        constructor(
            dataOrWidth: Uint8ClampedArray | number,
            width?: number,
            height?: number,
        ) {
            if (typeof dataOrWidth === "number") {
                this.width = dataOrWidth
                this.height = width || 0
                this.data = new Uint8ClampedArray(this.width * this.height * 4)
            } else {
                this.data = dataOrWidth
                this.width = width || 0
                this.height = height || 0
            }
        }
    } as any

    // Mock FontFace API for font loading tests
    class MockFontFace {
        family: string
        source: string
        descriptors: FontFaceDescriptors
        status: "unloaded" | "loading" | "loaded" | "error" = "unloaded"
        loaded: Promise<MockFontFace>
        private _resolveLoaded!: (value: MockFontFace) => void
        private _rejectLoaded!: (reason: any) => void

        constructor(
            family: string,
            source: string,
            descriptors?: FontFaceDescriptors,
        ) {
            this.family = family
            this.source = source
            this.descriptors = descriptors || {}
            this.loaded = new Promise((resolve, reject) => {
                this._resolveLoaded = resolve
                this._rejectLoaded = reject
            })
        }

        load(): Promise<MockFontFace> {
            this.status = "loading"
            // Simulate async font loading
            setTimeout(() => {
                // Check if URL looks valid (data URL or localhost)
                const isDataUrl = this.source.includes("data:font/")
                const isLocalhost = this.source.includes("localhost")
                const isValidDomain =
                    this.source.includes("://") &&
                    !this.source.includes("invalid-domain")

                if (
                    !isDataUrl &&
                    !isLocalhost &&
                    (!isValidDomain || this.source.includes("invalid-domain"))
                ) {
                    this.status = "error"
                    this._rejectLoaded(
                        new Error(`Failed to load font: ${this.source}`),
                    )
                } else {
                    this.status = "loaded"
                    this._resolveLoaded(this)
                }
            }, 0)
            return this.loaded
        }

        get weight(): string {
            return (this.descriptors.weight as string) || "normal"
        }

        get style(): string {
            return (this.descriptors.style as string) || "normal"
        }
    }

    class MockFontFaceSet extends Set<FontFace> {
        status: "loading" | "loaded" = "loaded"
        ready: Promise<MockFontFaceSet> = Promise.resolve(this)

        override add(font: FontFace): this {
            super.add(font)
            return this
        }

        override delete(font: FontFace): boolean {
            return super.delete(font)
        }

        load(font: string, text?: string): Promise<FontFace[]> {
            return Promise.resolve([])
        }

        check(font: string, text?: string): boolean {
            return true
        }
    }

    globalThis.FontFace = MockFontFace as any
    // Mock document.fonts if it doesn't exist
    Object.defineProperty(globalThis.document, "fonts", {
        value: new MockFontFaceSet(),
        writable: true,
        configurable: true,
    })

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
                    throw new Error(
                        `Unsupported decompression format: ${format}`,
                    )
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
}
