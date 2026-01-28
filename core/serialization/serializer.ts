import type { StateMachine } from "../animation/statemachine"
import type { SceneNode } from "../scene/node"
import type { Artboard } from "../scene/nodes/artboard"
import { AnimationSerializers } from "./serializers/animations"
import { AssetSerializers } from "./serializers/assets"
import { FileSerializers } from "./serializers/file"
import { NodeSerializers } from "./serializers/nodes"
import { PrimitiveSerializers } from "./serializers/primitives"
import type { AssetData, FileMetadata, SamcanFile } from "./types"

/**
 * Main Serializer class that coordinates all serialization operations
 * Converts runtime objects to serializable data structures and vice versa
 */
export class Serializer {
    private readonly _primitives = new PrimitiveSerializers()
    private readonly _animations = new AnimationSerializers(this._primitives)
    private readonly _nodes = new NodeSerializers(
        this._primitives,
        this._animations,
    )
    private readonly _assets = new AssetSerializers()
    private readonly _file = new FileSerializers()

    // ========== Artboard Serialization ==========

    /**
     * Serialize an Artboard to ArtboardData
     */
    serializeArtboard(artboard: Artboard) {
        return this._nodes.serializeArtboard(artboard)
    }

    /**
     * Deserialize an Artboard from ArtboardData
     */
    deserializeArtboard(
        data: ReturnType<typeof this._nodes.serializeArtboard>,
    ) {
        return this._nodes.deserializeArtboard(data)
    }

    // ========== File Serialization ==========

    /**
     * Serialize a complete SamcanFile
     */
    serializeSamcanFile(
        artboards: Artboard[],
        metadata: Partial<FileMetadata> = {},
        options?: {
            includeAssets?: boolean
            assetManager?: {
                loadedAssets: ReadonlyMap<
                    string,
                    { id: string; type: string; url: string }
                >
                collectSceneAssets: (node: SceneNode) => string[]
            }
        },
    ): SamcanFile {
        const now = new Date().toISOString()

        // Collect assets if requested and asset manager is provided
        let assets: AssetData[] = []
        if (options?.includeAssets && options.assetManager) {
            assets = this._assets.collectAssets(artboards, options.assetManager)
        }

        return {
            version: "1.0.0",
            metadata: {
                name: metadata.name || "Untitled",
                author: metadata.author,
                created: metadata.created || now,
                modified: now,
                description: metadata.description,
            },
            artboards: artboards.map((artboard) =>
                this._nodes.serializeArtboard(artboard),
            ),
            assets,
            stateMachines: [],
        }
    }

    /**
     * Deserialize a SamcanFile to runtime objects
     */
    deserializeSamcanFile(data: SamcanFile): {
        artboards: Artboard[]
        stateMachines: Map<string, StateMachine>
    } {
        const artboards = data.artboards.map((artboardData) =>
            this._nodes.deserializeArtboard(artboardData),
        )

        const stateMachines = new Map<string, StateMachine>()
        if (data.stateMachines) {
            for (const smData of data.stateMachines) {
                const sm = this._animations.deserializeStateMachine(
                    smData,
                    artboards,
                )
                stateMachines.set(smData.id, sm)
            }
        }

        return { artboards, stateMachines }
    }

    // ========== JSON Operations ==========

    /**
     * Generate JSON string from SamcanFile
     */
    toJSON(file: SamcanFile, pretty: boolean = true): string {
        return this._file.toJSON(file, pretty)
    }

    /**
     * Deserialize a SamcanFile from JSON string
     */
    fromJSON(json: string): SamcanFile {
        return this._file.fromJSON(json)
    }

    // ========== Compression ==========

    /**
     * Serialize and compress a SamcanFile
     */
    async toCompressedJSON(
        file: SamcanFile,
        pretty: boolean = false,
    ): Promise<Uint8Array> {
        return this._file.toCompressedJSON(file, pretty)
    }

    /**
     * Decompress and deserialize a SamcanFile
     */
    async fromCompressedJSON(compressedData: Uint8Array): Promise<SamcanFile> {
        return this._file.fromCompressedJSON(compressedData)
    }

    // ========== Streaming Operations ==========

    /**
     * Load a SamcanFile incrementally from a large JSON string
     */
    async fromJSONIncremental(json: string): Promise<SamcanFile> {
        return this._file.fromJSONIncremental(json)
    }

    /**
     * Load a SamcanFile from a ReadableStream
     */
    async fromJSONStream(
        stream: ReadableStream<Uint8Array>,
    ): Promise<SamcanFile> {
        return this._file.fromJSONStream(stream)
    }

    /**
     * Load and decompress a SamcanFile from a compressed stream
     */
    async fromCompressedStream(
        stream: ReadableStream<Uint8Array>,
    ): Promise<SamcanFile> {
        return this._file.fromCompressedStream(stream)
    }

    /**
     * Load and decompress a SamcanFile incrementally
     */
    async fromCompressedJSONIncremental(
        compressedData: Uint8Array,
    ): Promise<SamcanFile> {
        return this._file.fromCompressedJSONIncremental(compressedData)
    }

    // ========== Validation ==========

    /**
     * Validate a SamcanFile structure
     */
    validateSamcanFile(data: unknown): SamcanFile {
        return this._file.validateSamcanFile(data)
    }

    /**
     * Migrate a SamcanFile to the current version
     */
    migrateSamcanFile(data: SamcanFile): SamcanFile {
        return this._file.migrateSamcanFile(data)
    }

    // ========== Asset Bundling ==========

    /**
     * Create an asset bundle for export
     */
    async createAssetBundle(
        assetIds: string[],
        assetManager: {
            loadedAssets: ReadonlyMap<
                string,
                {
                    id: string
                    type: string
                    url: string
                    data?: HTMLImageElement | ImageBitmap | FontFace
                }
            >
        },
    ): Promise<Map<string, { type: string; data: Blob | string }>> {
        return this._assets.createAssetBundle(assetIds, assetManager)
    }

    // ========== Primitive Type Serialization (exposed for convenience) ==========

    /**
     * Serialize a Color to ColorData
     */
    serializeColor = this._primitives.serializeColor.bind(this._primitives)

    /**
     * Deserialize a Color from ColorData
     */
    deserializeColor = this._primitives.deserializeColor.bind(this._primitives)

    /**
     * Serialize a Vector2 to Vector2Data
     */
    serializeVector2 = this._primitives.serializeVector2.bind(this._primitives)

    /**
     * Deserialize a Vector2 from Vector2Data
     */
    deserializeVector2 = this._primitives.deserializeVector2.bind(
        this._primitives,
    )

    /**
     * Serialize a Matrix to MatrixData
     */
    serializeMatrix = this._primitives.serializeMatrix.bind(this._primitives)

    /**
     * Deserialize a Matrix from MatrixData
     */
    deserializeMatrix = this._primitives.deserializeMatrix.bind(
        this._primitives,
    )

    /**
     * Serialize a Transform to TransformData
     */
    serializeTransform = this._primitives.serializeTransform.bind(
        this._primitives,
    )

    /**
     * Deserialize a Transform from TransformData
     */
    deserializeTransform = this._primitives.deserializeTransform.bind(
        this._primitives,
    )

    /**
     * Serialize a Paint to PaintData
     */
    serializePaint = this._primitives.serializePaint.bind(this._primitives)

    /**
     * Deserialize a Paint from PaintData
     */
    deserializePaint = this._primitives.deserializePaint.bind(this._primitives)

    // ========== Animation Serialization (exposed for convenience) ==========

    /**
     * Serialize a Timeline to TimelineData
     */
    serializeTimeline = this._animations.serializeTimeline.bind(
        this._animations,
    )

    /**
     * Serialize an AnimationTrack to AnimationTrackData
     */
    serializeAnimationTrack = this._animations.serializeAnimationTrack.bind(
        this._animations,
    )

    /**
     * Serialize a Keyframe to KeyframeData
     */
    serializeKeyframe = this._animations.serializeKeyframe.bind(
        this._animations,
    )

    /**
     * Serialize an AnimationState to AnimationStateData
     */
    serializeAnimationState = this._animations.serializeAnimationState.bind(
        this._animations,
    )

    /**
     * Serialize a StateMachine to StateMachineData
     */
    serializeStateMachine = this._animations.serializeStateMachine.bind(
        this._animations,
    )

    /**
     * Serialize a StateTransition to StateTransitionData
     */
    serializeStateTransition = this._animations.serializeStateTransition.bind(
        this._animations,
    )

    /**
     * Serialize a TransitionCondition to TransitionConditionData
     */
    serializeTransitionCondition =
        this._animations.serializeTransitionCondition.bind(this._animations)

    /**
     * Deserialize a Timeline from TimelineData
     */
    deserializeTimeline = this._animations.deserializeTimeline.bind(
        this._animations,
    )

    /**
     * Deserialize a Keyframe from KeyframeData
     */
    deserializeKeyframe = this._animations.deserializeKeyframe.bind(
        this._animations,
    )

    /**
     * Deserialize an AnimationState from AnimationStateData
     */
    deserializeAnimationState = this._animations.deserializeAnimationState.bind(
        this._animations,
    )

    /**
     * Deserialize a StateMachine from StateMachineData
     */
    deserializeStateMachine = this._animations.deserializeStateMachine.bind(
        this._animations,
    )

    /**
     * Deserialize a StateTransition from StateTransitionData
     */
    deserializeStateTransition =
        this._animations.deserializeStateTransition.bind(this._animations)

    /**
     * Deserialize a TransitionCondition from TransitionConditionData
     */
    deserializeTransitionCondition =
        this._animations.deserializeTransitionCondition.bind(this._animations)

    // ========== Compression (exposed for testing) ==========

    /**
     * Compress a string using gzip compression
     */
    compress = this._file.compress.bind(this._file)

    /**
     * Decompress gzip-compressed data
     */
    decompress = this._file.decompress.bind(this._file)
}
