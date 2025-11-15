import { describe, expect, test } from "bun:test"
import {
    AnimationError,
    AssetError,
    ErrorCode,
    PluginError,
    RendererError,
    SamcanError,
    SerializationError,
} from "../core/error"

describe("SamcanError", () => {
    test("creates error with code and message", () => {
        const error = new SamcanError("Test error", ErrorCode.UNKNOWN_ERROR)

        expect(error.message).toBe("Test error")
        expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR)
        expect(error.name).toBe("SamcanError")
        expect(error.timestamp).toBeInstanceOf(Date)
    })

    test("creates error with context", () => {
        const context = { foo: "bar", count: 42 }
        const error = new SamcanError(
            "Test error",
            ErrorCode.INVALID_OPERATION,
            context,
        )

        expect(error.context).toEqual(context)
    })

    test("serializes error correctly", () => {
        const error = new SamcanError(
            "Test error",
            ErrorCode.INVALID_OPERATION,
            {
                detail: "test",
            },
        )
        const serialized = error.serialize()

        expect(serialized.name).toBe("SamcanError")
        expect(serialized.message).toBe("Test error")
        expect(serialized.code).toBe(ErrorCode.INVALID_OPERATION)
        expect(serialized.context).toEqual({ detail: "test" })
        expect(serialized.timestamp).toBeDefined()
        expect(serialized.stack).toBeDefined()
    })

    test("serializes nested errors", () => {
        const cause = new Error("Original error")
        const error = new SamcanError("Wrapper error", ErrorCode.UNKNOWN_ERROR)
        error.cause = cause

        const serialized = error.serialize()

        expect(serialized.cause).toBeDefined()
        expect(serialized.cause?.message).toBe("Original error")
    })

    test("converts to JSON string", () => {
        const error = new SamcanError("Test error", ErrorCode.INVALID_OPERATION)
        const json = error.toJSON()

        expect(json).toContain("Test error")
        expect(json).toContain("INVALID_OPERATION")
    })

    test("toString includes context", () => {
        const error = new SamcanError(
            "Test error",
            ErrorCode.INVALID_OPERATION,
            {
                detail: "test",
            },
        )
        const str = error.toString()

        expect(str).toContain("SamcanError")
        expect(str).toContain("INVALID_OPERATION")
        expect(str).toContain("Test error")
        expect(str).toContain("detail")
    })
})

describe("RendererError", () => {
    test("creates init failed error", () => {
        const error = RendererError.initFailed(
            "webgl",
            "Context creation failed",
        )

        expect(error.message).toContain("webgl")
        expect(error.message).toContain("Context creation failed")
        expect(error.code).toBe(ErrorCode.RENDERER_INIT_FAILED)
        expect(error.backend).toBe("webgl")
    })

    test("creates not supported error", () => {
        const error = RendererError.notSupported("webgpu")

        expect(error.message).toContain("webgpu")
        expect(error.code).toBe(ErrorCode.RENDERER_NOT_SUPPORTED)
    })

    test("creates context lost error", () => {
        const error = RendererError.contextLost()

        expect(error.code).toBe(ErrorCode.WEBGL_CONTEXT_LOST)
        expect(error.context?.recoverable).toBe(true)
    })

    test("creates canvas not found error", () => {
        const error = RendererError.canvasNotFound("#my-canvas")

        expect(error.message).toContain("#my-canvas")
        expect(error.code).toBe(ErrorCode.CANVAS_NOT_FOUND)
    })
})

describe("SerializationError", () => {
    test("creates invalid format error", () => {
        const error = SerializationError.invalidFormat("Missing required field")

        expect(error.message).toContain("Missing required field")
        expect(error.code).toBe(ErrorCode.INVALID_FILE_FORMAT)
    })

    test("creates unsupported version error", () => {
        const error = SerializationError.unsupportedVersion("2.0.0", "1.0.0")

        expect(error.message).toContain("2.0.0")
        expect(error.message).toContain("1.0.0")
        expect(error.code).toBe(ErrorCode.UNSUPPORTED_VERSION)
        expect(error.fileVersion).toBe("2.0.0")
        expect(error.expectedVersion).toBe("1.0.0")
    })

    test("creates parse error", () => {
        const error = SerializationError.parseError("Invalid JSON")

        expect(error.message).toContain("Invalid JSON")
        expect(error.code).toBe(ErrorCode.FILE_PARSE_ERROR)
    })
})

describe("AssetError", () => {
    test("creates load failed error", () => {
        const error = AssetError.loadFailed(
            "https://example.com/image.png",
            "image",
            "Network error",
        )

        expect(error.message).toContain("image.png")
        expect(error.message).toContain("Network error")
        expect(error.code).toBe(ErrorCode.ASSET_LOAD_FAILED)
        expect(error.assetUrl).toBe("https://example.com/image.png")
        expect(error.assetType).toBe("image")
    })

    test("creates not found error", () => {
        const error = AssetError.notFound("asset-123")

        expect(error.message).toContain("asset-123")
        expect(error.code).toBe(ErrorCode.ASSET_NOT_FOUND)
        expect(error.assetId).toBe("asset-123")
    })

    test("creates invalid type error", () => {
        const error = AssetError.invalidType("audio", "image")

        expect(error.message).toContain("audio")
        expect(error.message).toContain("image")
        expect(error.code).toBe(ErrorCode.INVALID_ASSET_TYPE)
    })

    test("creates font load failed error", () => {
        const error = AssetError.fontLoadFailed("Arial", "Font not available")

        expect(error.message).toContain("Arial")
        expect(error.code).toBe(ErrorCode.FONT_LOAD_FAILED)
    })
})

describe("AnimationError", () => {
    test("creates invalid data error", () => {
        const error = AnimationError.invalidData("Missing keyframes")

        expect(error.message).toContain("Missing keyframes")
        expect(error.code).toBe(ErrorCode.INVALID_ANIMATION_DATA)
    })

    test("creates timeline error", () => {
        const error = AnimationError.timelineError(
            "Invalid duration",
            "timeline-1",
        )

        expect(error.message).toContain("Invalid duration")
        expect(error.code).toBe(ErrorCode.TIMELINE_ERROR)
        expect(error.timelineId).toBe("timeline-1")
    })

    test("creates state machine error", () => {
        const error = AnimationError.stateMachineError(
            "Invalid transition",
            "state-1",
        )

        expect(error.message).toContain("Invalid transition")
        expect(error.code).toBe(ErrorCode.STATE_MACHINE_ERROR)
        expect(error.stateId).toBe("state-1")
    })
})

describe("PluginError", () => {
    test("creates plugin error", () => {
        const error = PluginError.error("my-plugin", "Initialization failed")

        expect(error.message).toContain("my-plugin")
        expect(error.message).toContain("Initialization failed")
        expect(error.code).toBe(ErrorCode.PLUGIN_ERROR)
        expect(error.pluginName).toBe("my-plugin")
    })

    test("creates init failed error", () => {
        const error = PluginError.initFailed("my-plugin", "Missing dependency")

        expect(error.code).toBe(ErrorCode.PLUGIN_INIT_FAILED)
    })

    test("creates not found error", () => {
        const error = PluginError.notFound("my-plugin")

        expect(error.message).toContain("my-plugin")
        expect(error.code).toBe(ErrorCode.PLUGIN_NOT_FOUND)
    })
})
