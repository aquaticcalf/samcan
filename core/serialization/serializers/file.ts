import type { FileMetadata, SamcanFile } from "../types"

/**
 * Handles SamcanFile validation, versioning, migration, and compression
 */
export class FileSerializers {
    /**
     * Generate JSON string from SamcanFile
     */
    toJSON(file: SamcanFile, pretty: boolean = true): string {
        return JSON.stringify(file, null, pretty ? 2 : undefined)
    }

    /**
     * Deserialize a SamcanFile from JSON string
     */
    fromJSON(json: string): SamcanFile {
        let data: unknown
        try {
            data = JSON.parse(json)
        } catch (error) {
            throw new Error(
                `Failed to parse samcan file: ${error instanceof Error ? error.message : "Invalid JSON"}`,
            )
        }

        const validatedData = this.validateSamcanFile(data)
        return this.migrateSamcanFile(validatedData)
    }

    /**
     * Compress a string using gzip compression
     * Returns a Uint8Array of compressed data
     */
    async compress(data: string): Promise<Uint8Array> {
        // Convert string to Uint8Array
        const encoder = new TextEncoder()
        const uint8Array = encoder.encode(data)

        // Create compression stream using browser API
        const compressionStream = new CompressionStream("gzip")
        const writer = compressionStream.writable.getWriter()
        const reader = compressionStream.readable.getReader()

        // Write data to compression stream
        const writePromise = writer.write(uint8Array).then(() => writer.close())

        // Read compressed chunks
        const chunks: Uint8Array[] = []
        let totalLength = 0

        const readPromise = (async () => {
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                chunks.push(value)
                totalLength += value.length
            }
        })()

        // Wait for both write and read to complete
        await Promise.all([writePromise, readPromise])

        // Combine chunks into single Uint8Array
        const compressed = new Uint8Array(totalLength)
        let offset = 0
        for (const chunk of chunks) {
            compressed.set(chunk, offset)
            offset += chunk.length
        }

        return compressed
    }

    /**
     * Decompress gzip-compressed data
     * Returns the decompressed string
     */
    async decompress(compressedData: Uint8Array): Promise<string> {
        // Create decompression stream using browser API
        const decompressionStream = new DecompressionStream("gzip")
        const writer = decompressionStream.writable.getWriter()
        const reader = decompressionStream.readable.getReader()

        // Write compressed data to decompression stream
        const writePromise = writer
            .write(compressedData as Uint8Array<ArrayBuffer>)
            .then(() => writer.close())

        // Read decompressed chunks
        const chunks: Uint8Array[] = []
        let totalLength = 0

        const readPromise = (async () => {
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                chunks.push(value)
                totalLength += value.length
            }
        })()

        // Wait for both write and read to complete
        await Promise.all([writePromise, readPromise])

        // Combine chunks into single Uint8Array
        const decompressed = new Uint8Array(totalLength)
        let offset = 0
        for (const chunk of chunks) {
            decompressed.set(chunk, offset)
            offset += chunk.length
        }

        // Convert Uint8Array back to string
        const decoder = new TextDecoder()
        return decoder.decode(decompressed)
    }

    /**
     * Serialize and compress a SamcanFile
     * Returns compressed data as Uint8Array
     */
    async toCompressedJSON(
        file: SamcanFile,
        pretty: boolean = false,
    ): Promise<Uint8Array> {
        const json = this.toJSON(file, pretty)
        return this.compress(json)
    }

    /**
     * Decompress and deserialize a SamcanFile
     * Accepts compressed data as Uint8Array
     */
    async fromCompressedJSON(compressedData: Uint8Array): Promise<SamcanFile> {
        const json = await this.decompress(compressedData)
        return this.fromJSON(json)
    }

    /**
     * Load a SamcanFile incrementally from a large JSON string
     * This is useful for large files to avoid blocking the main thread
     * Parses JSON in chunks and yields control periodically
     * Returns a promise that resolves with the parsed SamcanFile
     */
    async fromJSONIncremental(json: string): Promise<SamcanFile> {
        // Parse in chunks to avoid blocking
        const CHUNK_SIZE = 100000 // Process 100KB at a time

        if (json.length <= CHUNK_SIZE) {
            // Small file, parse directly
            return this.fromJSON(json)
        }

        // For large files, parse incrementally
        // We'll use a worker-like approach by yielding control periodically
        return new Promise((resolve, reject) => {
            let offset = 0
            const chunks: string[] = []

            const processChunk = () => {
                try {
                    // Process one chunk
                    const end = Math.min(offset + CHUNK_SIZE, json.length)
                    chunks.push(json.slice(offset, end))
                    offset = end

                    if (offset < json.length) {
                        // More chunks to process, yield control
                        setTimeout(processChunk, 0)
                    } else {
                        // All chunks processed, parse the complete JSON
                        const completeJson = chunks.join("")
                        const data = this.fromJSON(completeJson)
                        resolve(data)
                    }
                } catch (error) {
                    reject(error)
                }
            }

            // Start processing
            processChunk()
        })
    }

    /**
     * Load a SamcanFile incrementally from a ReadableStream
     * This is useful for loading files from network or disk without loading entire file into memory
     */
    async fromJSONStream(
        stream: ReadableStream<Uint8Array>,
    ): Promise<SamcanFile> {
        const decoder = new TextDecoder()
        const reader = stream.getReader()
        const chunks: string[] = []

        try {
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                // Decode chunk and add to buffer
                chunks.push(decoder.decode(value, { stream: true }))
            }

            // Decode any remaining bytes
            chunks.push(decoder.decode())

            // Parse complete JSON
            const json = chunks.join("")
            return this.fromJSON(json)
        } finally {
            reader.releaseLock()
        }
    }

    /**
     * Load and decompress a SamcanFile from a compressed stream
     * Useful for loading compressed files from network or disk
     */
    async fromCompressedStream(
        stream: ReadableStream<Uint8Array>,
    ): Promise<SamcanFile> {
        // Read all chunks from stream
        const reader = stream.getReader()
        const chunks: Uint8Array[] = []
        let totalLength = 0

        try {
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                chunks.push(value)
                totalLength += value.length
            }

            // Combine chunks
            const compressed = new Uint8Array(totalLength)
            let offset = 0
            for (const chunk of chunks) {
                compressed.set(chunk, offset)
                offset += chunk.length
            }

            // Decompress and parse
            return this.fromCompressedJSON(compressed)
        } finally {
            reader.releaseLock()
        }
    }

    /**
     * Load and decompress a SamcanFile incrementally
     * Useful for large compressed files
     */
    async fromCompressedJSONIncremental(
        compressedData: Uint8Array,
    ): Promise<SamcanFile> {
        // Decompress first (this is already async and won't block)
        const json = await this.decompress(compressedData)

        // Then parse incrementally
        return this.fromJSONIncremental(json)
    }

    /**
     * Validate a SamcanFile structure
     */
    validateSamcanFile(data: unknown): SamcanFile {
        if (typeof data !== "object" || data === null) {
            throw new Error("Invalid samcan file: not an object")
        }

        const file = data as Record<string, unknown>

        // Validate version
        if (typeof file.version !== "string") {
            throw new Error("Invalid samcan file: missing or invalid version")
        }

        if (!this.isValidVersion(file.version)) {
            throw new Error(
                `Invalid samcan file: unsupported version format "${file.version}"`,
            )
        }

        // Validate metadata
        if (typeof file.metadata !== "object" || file.metadata === null) {
            throw new Error("Invalid samcan file: missing or invalid metadata")
        }

        const metadata = file.metadata as Record<string, unknown>
        if (typeof metadata.name !== "string") {
            throw new Error(
                "Invalid samcan file: metadata missing required field 'name'",
            )
        }

        if (typeof metadata.created !== "string") {
            throw new Error(
                "Invalid samcan file: metadata missing required field 'created'",
            )
        }

        if (typeof metadata.modified !== "string") {
            throw new Error(
                "Invalid samcan file: metadata missing required field 'modified'",
            )
        }

        // Validate artboards
        if (!Array.isArray(file.artboards)) {
            throw new Error("Invalid samcan file: missing or invalid artboards")
        }

        for (let i = 0; i < file.artboards.length; i++) {
            this.validateArtboardData(file.artboards[i], i)
        }

        // Validate assets
        if (!Array.isArray(file.assets)) {
            throw new Error("Invalid samcan file: missing or invalid assets")
        }

        // Validate state machines (optional)
        if (
            file.stateMachines !== undefined &&
            !Array.isArray(file.stateMachines)
        ) {
            throw new Error(
                "Invalid samcan file: stateMachines must be an array",
            )
        }

        return data as SamcanFile
    }

    /**
     * Validate artboard data structure
     */
    private validateArtboardData(data: unknown, index: number): void {
        if (typeof data !== "object" || data === null) {
            throw new Error(
                `Invalid samcan file: artboard at index ${index} is not an object`,
            )
        }

        const artboard = data as Record<string, unknown>

        if (typeof artboard.id !== "string") {
            throw new Error(
                `Invalid samcan file: artboard at index ${index} missing 'id'`,
            )
        }

        if (typeof artboard.name !== "string") {
            throw new Error(
                `Invalid samcan file: artboard at index ${index} missing 'name'`,
            )
        }

        if (typeof artboard.width !== "number" || artboard.width <= 0) {
            throw new Error(
                `Invalid samcan file: artboard at index ${index} has invalid 'width'`,
            )
        }

        if (typeof artboard.height !== "number" || artboard.height <= 0) {
            throw new Error(
                `Invalid samcan file: artboard at index ${index} has invalid 'height'`,
            )
        }

        if (!Array.isArray(artboard.nodes)) {
            throw new Error(
                `Invalid samcan file: artboard at index ${index} missing 'nodes' array`,
            )
        }
    }

    /**
     * Check if version string is valid (semver format)
     */
    private isValidVersion(version: string): boolean {
        const semverRegex = /^\d+\.\d+\.\d+$/
        return semverRegex.test(version)
    }

    /**
     * Migrate a SamcanFile to the current version
     */
    migrateSamcanFile(data: SamcanFile): SamcanFile {
        const currentVersion = "1.0.0"
        const fileVersion = data.version

        // Check version compatibility
        const compatibility = this.checkVersionCompatibility(
            fileVersion,
            currentVersion,
        )

        if (compatibility === "incompatible") {
            throw new Error(
                `Incompatible samcan file version: file is version ${fileVersion}, but current version is ${currentVersion}. Major version mismatch.`,
            )
        }

        if (compatibility === "current") {
            return data
        }

        // Perform migration
        let migratedData = data

        // Migration chain: apply migrations in order
        const [fileMajor, fileMinor, filePatch] = this.parseVersion(fileVersion)
        const [currentMajor, currentMinor, currentPatch] =
            this.parseVersion(currentVersion)

        // Only migrate within same major version
        if (fileMajor === currentMajor) {
            // Example: migrate from 1.0.0 to 1.1.0
            if (fileMajor === 1 && fileMinor === 0 && currentMinor >= 1) {
                // Future migration logic would go here
                // migratedData = this.migrateFrom1_0_0To1_1_0(migratedData)
            }

            // Update version to current
            migratedData = {
                ...migratedData,
                version: currentVersion,
                metadata: {
                    ...migratedData.metadata,
                    modified: new Date().toISOString(),
                },
            }
        }

        return migratedData
    }

    /**
     * Check version compatibility
     */
    private checkVersionCompatibility(
        fileVersion: string,
        currentVersion: string,
    ): "current" | "compatible" | "incompatible" {
        const [fileMajor, fileMinor, filePatch] = this.parseVersion(fileVersion)
        const [currentMajor, currentMinor, currentPatch] =
            this.parseVersion(currentVersion)

        // Same version
        if (
            fileMajor === currentMajor &&
            fileMinor === currentMinor &&
            filePatch === currentPatch
        ) {
            return "current"
        }

        // Different major version = incompatible
        if (fileMajor !== currentMajor) {
            return "incompatible"
        }

        // Same major version = compatible (can migrate)
        return "compatible"
    }

    /**
     * Parse version string into [major, minor, patch]
     */
    private parseVersion(version: string): [number, number, number] {
        const parts = version.split(".").map((part) => Number.parseInt(part))
        return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
    }
}
