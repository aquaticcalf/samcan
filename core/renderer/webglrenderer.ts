import type { Color } from "../math/color"
import { Matrix } from "../math/matrix"
import type { Paint } from "../math/paint"
import type { Path } from "../math/path"
import type { Vector2 } from "../math/vector2"
import type {
    Font,
    ImageAsset,
    Renderer,
    RendererBackend,
    RendererCapabilities,
} from "./renderer"

/**
 * Vertex data for path rendering
 */
interface PathVertex {
    x: number
    y: number
}

/**
 * Tessellated path data ready for GPU rendering
 */
interface TessellatedPath {
    vertices: Float32Array
    indices: Uint16Array
    vertexCount: number
    indexCount: number
}

/**
 * WebGL texture wrapper
 */
interface WebGLTexture2D {
    texture: WebGLTexture
    width: number
    height: number
}

/**
 * WebGL renderer implementation
 * Provides hardware-accelerated rendering using WebGL
 */
export class WebGLRenderer implements Renderer {
    private _canvas: HTMLCanvasElement | null = null
    private _gl: WebGLRenderingContext | null = null
    private _isInitialized = false
    private _width = 0
    private _height = 0

    // Shader programs
    private _pathProgram: WebGLProgram | null = null
    private _imageProgram: WebGLProgram | null = null
    private _textProgram: WebGLProgram | null = null

    // Buffers
    private _pathVertexBuffer: WebGLBuffer | null = null
    private _pathIndexBuffer: WebGLBuffer | null = null
    private _imageVertexBuffer: WebGLBuffer | null = null

    // Texture cache
    private _textureCache = new Map<ImageAsset, WebGLTexture2D>()

    // Transform stack
    private _transformStack: Matrix[] = []
    private _currentTransform: Matrix = new Matrix()

    // Opacity stack
    private _opacityStack: number[] = []
    private _currentOpacity = 1.0

    readonly backend: RendererBackend = "webgl"

    readonly capabilities: RendererCapabilities = {
        maxTextureSize: 2048, // Will be updated during initialization
        supportsBlendModes: true,
        supportsFilters: false,
        supportsAdvancedPaths: false,
        supportsHardwareAcceleration: true,
    }

    get isInitialized(): boolean {
        return this._isInitialized
    }

    get width(): number {
        return this._width
    }

    get height(): number {
        return this._height
    }

    /**
     * Initialize the renderer with a canvas element
     */
    async initialize(canvas: HTMLCanvasElement): Promise<void> {
        this._canvas = canvas

        // Get WebGL context
        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
        }) as WebGLRenderingContext | null

        if (!gl) {
            // Try experimental WebGL
            const experimentalGl = canvas.getContext("experimental-webgl", {
                alpha: true,
                antialias: true,
                premultipliedAlpha: true,
            }) as WebGLRenderingContext | null

            if (!experimentalGl) {
                throw new Error("Failed to get WebGL rendering context")
            }

            this._gl = experimentalGl
        } else {
            this._gl = gl
        }
        this._width = canvas.width
        this._height = canvas.height

        // Update capabilities
        const maxTextureSize = this._gl.getParameter(
            this._gl.MAX_TEXTURE_SIZE,
        ) as number
        ;(this.capabilities as { maxTextureSize: number }).maxTextureSize =
            maxTextureSize

        // Initialize shaders and buffers
        await this._initializeShaders()
        this._initializeBuffers()

        // Set up initial GL state
        this._gl.viewport(0, 0, this._width, this._height)
        this._gl.enable(this._gl.BLEND)
        this._gl.blendFunc(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA)

        this._isInitialized = true
    }

    /**
     * Resize the renderer viewport
     */
    resize(width: number, height: number): void {
        if (!this._canvas || !this._gl) {
            throw new Error("Renderer not initialized")
        }

        this._canvas.width = width
        this._canvas.height = height
        this._width = width
        this._height = height

        this._gl.viewport(0, 0, width, height)
    }

    /**
     * Begin a new frame
     */
    beginFrame(): void {
        // Reset transform and opacity stacks
        this._transformStack = []
        this._currentTransform = new Matrix()
        this._opacityStack = []
        this._currentOpacity = 1.0
    }

    /**
     * End the current frame
     */
    endFrame(): void {
        if (!this._gl) {
            throw new Error("Renderer not initialized")
        }
        // Flush any pending operations
        this._gl.flush()
    }

    /**
     * Clear the canvas with an optional color
     */
    clear(color?: Color): void {
        if (!this._gl) {
            throw new Error("Renderer not initialized")
        }

        const gl = this._gl

        if (color) {
            gl.clearColor(color.r, color.g, color.b, color.a)
        } else {
            gl.clearColor(0, 0, 0, 0)
        }

        gl.clear(gl.COLOR_BUFFER_BIT)
    }

    /**
     * Draw a path with the specified paint
     */
    drawPath(path: Path, paint: Paint): void {
        if (!this._gl || !this._pathProgram) {
            throw new Error("Renderer not initialized")
        }

        if (path.isEmpty()) {
            return
        }

        const gl = this._gl

        // Tessellate the path
        const tessellated = this._tessellatePath(path)

        if (tessellated.indexCount === 0) {
            return
        }

        // Use path shader program
        gl.useProgram(this._pathProgram)

        // Upload vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, this._pathVertexBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, tessellated.vertices, gl.DYNAMIC_DRAW)

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._pathIndexBuffer)
        gl.bufferData(
            gl.ELEMENT_ARRAY_BUFFER,
            tessellated.indices,
            gl.DYNAMIC_DRAW,
        )

        // Set up vertex attributes
        const positionLoc = gl.getAttribLocation(
            this._pathProgram,
            "a_position",
        )
        gl.enableVertexAttribArray(positionLoc)
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)

        // Set uniforms
        this._setPathUniforms(paint)

        // Set blend mode
        this._setBlendMode(paint.blendMode)

        // Draw
        gl.drawElements(
            gl.TRIANGLES,
            tessellated.indexCount,
            gl.UNSIGNED_SHORT,
            0,
        )

        // Reset blend mode
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    }

    /**
     * Draw an image with the specified transformation
     */
    drawImage(image: ImageAsset, transform: Matrix): void {
        if (!this._gl || !this._imageProgram) {
            throw new Error("Renderer not initialized")
        }

        const gl = this._gl

        // Get or create texture
        let texture = this._textureCache.get(image)
        if (!texture) {
            texture = this._createTexture(image)
            this._textureCache.set(image, texture)
        }

        // Use image shader program
        gl.useProgram(this._imageProgram)

        // Create quad vertices with transformation
        const vertices = this._createImageQuad(image, transform)

        // Upload vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, this._imageVertexBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW)

        // Set up vertex attributes
        const positionLoc = gl.getAttribLocation(
            this._imageProgram,
            "a_position",
        )
        const texCoordLoc = gl.getAttribLocation(
            this._imageProgram,
            "a_texCoord",
        )

        gl.enableVertexAttribArray(positionLoc)
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 16, 0)

        gl.enableVertexAttribArray(texCoordLoc)
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 16, 8)

        // Bind texture
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture.texture)

        // Set uniforms
        this._setImageUniforms()

        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    /**
     * Draw text at the specified position
     */
    drawText(text: string, font: Font, position: Vector2, paint: Paint): void {
        // WebGL text rendering is complex and typically done via texture atlas
        // For now, we'll throw an error indicating it's not implemented
        // In a full implementation, this would render text to a texture and draw that
        throw new Error("Text rendering not yet implemented in WebGL renderer")
    }

    /**
     * Save the current rendering state
     */
    save(): void {
        this._transformStack.push(this._currentTransform.clone())
        this._opacityStack.push(this._currentOpacity)
    }

    /**
     * Restore the previous rendering state
     */
    restore(): void {
        const transform = this._transformStack.pop()
        if (transform) {
            this._currentTransform = transform
        }

        const opacity = this._opacityStack.pop()
        if (opacity !== undefined) {
            this._currentOpacity = opacity
        }
    }

    /**
     * Apply a transformation matrix to the current rendering context
     */
    transform(matrix: Matrix): void {
        // Multiply current transform by the new matrix
        this._currentTransform = this._currentTransform.multiply(matrix)
    }

    /**
     * Set the global opacity for subsequent draw operations
     */
    setOpacity(opacity: number): void {
        this._currentOpacity = Math.max(0, Math.min(1, opacity))
    }

    /**
     * Initialize shader programs
     */
    private async _initializeShaders(): Promise<void> {
        if (!this._gl) {
            throw new Error("WebGL context not available")
        }

        const gl = this._gl

        // Create path shader program
        this._pathProgram = this._createProgram(
            PATH_VERTEX_SHADER,
            PATH_FRAGMENT_SHADER,
        )

        // Create image shader program
        this._imageProgram = this._createProgram(
            IMAGE_VERTEX_SHADER,
            IMAGE_FRAGMENT_SHADER,
        )
    }

    /**
     * Initialize buffers
     */
    private _initializeBuffers(): void {
        if (!this._gl) {
            throw new Error("WebGL context not available")
        }

        const gl = this._gl

        this._pathVertexBuffer = gl.createBuffer()
        this._pathIndexBuffer = gl.createBuffer()
        this._imageVertexBuffer = gl.createBuffer()

        if (
            !this._pathVertexBuffer ||
            !this._pathIndexBuffer ||
            !this._imageVertexBuffer
        ) {
            throw new Error("Failed to create WebGL buffers")
        }
    }

    /**
     * Create a shader program from vertex and fragment shader source
     */
    private _createProgram(
        vertexSource: string,
        fragmentSource: string,
    ): WebGLProgram {
        if (!this._gl) {
            throw new Error("WebGL context not available")
        }

        const gl = this._gl

        const vertexShader = this._compileShader(gl.VERTEX_SHADER, vertexSource)
        const fragmentShader = this._compileShader(
            gl.FRAGMENT_SHADER,
            fragmentSource,
        )

        const program = gl.createProgram()
        if (!program) {
            throw new Error("Failed to create shader program")
        }

        gl.attachShader(program, vertexShader)
        gl.attachShader(program, fragmentShader)
        gl.linkProgram(program)

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program)
            throw new Error(`Failed to link shader program: ${info}`)
        }

        return program
    }

    /**
     * Compile a shader
     */
    private _compileShader(type: number, source: string): WebGLShader {
        if (!this._gl) {
            throw new Error("WebGL context not available")
        }

        const gl = this._gl
        const shader = gl.createShader(type)

        if (!shader) {
            throw new Error("Failed to create shader")
        }

        gl.shaderSource(shader, source)
        gl.compileShader(shader)

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader)
            throw new Error(`Failed to compile shader: ${info}`)
        }

        return shader
    }

    /**
     * Tessellate a path into triangles for GPU rendering
     */
    private _tessellatePath(path: Path): TessellatedPath {
        // Simple ear-clipping tessellation
        // In production, use a library like libtess.js or earcut
        const vertices: PathVertex[] = []
        const indices: number[] = []

        let currentX = 0
        let currentY = 0
        const pathVertices: PathVertex[] = []

        // Extract path vertices
        for (const cmd of path.commands) {
            switch (cmd.type) {
                case "M":
                    currentX = cmd.x
                    currentY = cmd.y
                    pathVertices.push({ x: currentX, y: currentY })
                    break
                case "L":
                    currentX = cmd.x
                    currentY = cmd.y
                    pathVertices.push({ x: currentX, y: currentY })
                    break
                case "C":
                case "Q":
                    // Approximate curves with line segments
                    currentX = cmd.x
                    currentY = cmd.y
                    pathVertices.push({ x: currentX, y: currentY })
                    break
                case "Z":
                    // Close path
                    break
            }
        }

        // Simple fan triangulation from first vertex
        if (pathVertices.length >= 3) {
            vertices.push(...pathVertices)

            for (let i = 1; i < pathVertices.length - 1; i++) {
                indices.push(0, i, i + 1)
            }
        }

        // Convert to typed arrays
        const vertexArray = new Float32Array(vertices.length * 2)
        for (let i = 0; i < vertices.length; i++) {
            vertexArray[i * 2] = vertices[i]!.x
            vertexArray[i * 2 + 1] = vertices[i]!.y
        }

        return {
            vertices: vertexArray,
            indices: new Uint16Array(indices),
            vertexCount: vertices.length,
            indexCount: indices.length,
        }
    }

    /**
     * Set uniforms for path rendering
     */
    private _setPathUniforms(paint: Paint): void {
        if (!this._gl || !this._pathProgram) {
            return
        }

        const gl = this._gl

        // Projection matrix (orthographic)
        const projectionLoc = gl.getUniformLocation(
            this._pathProgram,
            "u_projection",
        )
        const projection = this._createProjectionMatrix()
        gl.uniformMatrix3fv(projectionLoc, false, projection)

        // Transform matrix
        const transformLoc = gl.getUniformLocation(
            this._pathProgram,
            "u_transform",
        )
        const transform = this._matrixToArray(this._currentTransform)
        gl.uniformMatrix3fv(transformLoc, false, transform)

        // Color
        const colorLoc = gl.getUniformLocation(this._pathProgram, "u_color")
        if (paint.type === "solid" && paint.color) {
            gl.uniform4f(
                colorLoc,
                paint.color.r,
                paint.color.g,
                paint.color.b,
                paint.color.a * this._currentOpacity,
            )
        } else {
            gl.uniform4f(colorLoc, 1, 1, 1, this._currentOpacity)
        }
    }

    /**
     * Set uniforms for image rendering
     */
    private _setImageUniforms(): void {
        if (!this._gl || !this._imageProgram) {
            return
        }

        const gl = this._gl

        // Projection matrix
        const projectionLoc = gl.getUniformLocation(
            this._imageProgram,
            "u_projection",
        )
        const projection = this._createProjectionMatrix()
        gl.uniformMatrix3fv(projectionLoc, false, projection)

        // Texture sampler
        const textureLoc = gl.getUniformLocation(
            this._imageProgram,
            "u_texture",
        )
        gl.uniform1i(textureLoc, 0)

        // Opacity
        const opacityLoc = gl.getUniformLocation(
            this._imageProgram,
            "u_opacity",
        )
        gl.uniform1f(opacityLoc, this._currentOpacity)
    }

    /**
     * Create orthographic projection matrix
     */
    private _createProjectionMatrix(): Float32Array {
        // Orthographic projection for 2D rendering
        const left = 0
        const right = this._width
        const bottom = this._height
        const top = 0

        return new Float32Array([
            2 / (right - left),
            0,
            0,
            0,
            2 / (top - bottom),
            0,
            (right + left) / (left - right),
            (top + bottom) / (bottom - top),
            1,
        ])
    }

    /**
     * Convert Matrix to Float32Array for WebGL
     */
    private _matrixToArray(matrix: Matrix): Float32Array {
        return new Float32Array([
            matrix.a,
            matrix.b,
            0,
            matrix.c,
            matrix.d,
            0,
            matrix.tx,
            matrix.ty,
            1,
        ])
    }

    /**
     * Create a WebGL texture from an image asset
     */
    private _createTexture(image: ImageAsset): WebGLTexture2D {
        if (!this._gl) {
            throw new Error("WebGL context not available")
        }

        const gl = this._gl
        const texture = gl.createTexture()

        if (!texture) {
            throw new Error("Failed to create texture")
        }

        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image.data,
        )

        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

        return {
            texture,
            width: image.width,
            height: image.height,
        }
    }

    /**
     * Create vertex data for an image quad
     */
    private _createImageQuad(
        image: ImageAsset,
        transform: Matrix,
    ): Float32Array {
        // Create a quad with position and texture coordinates
        // Format: [x, y, u, v] per vertex
        const w = image.width
        const h = image.height

        // Apply transform to corners
        const corners = [
            this._transformPoint(0, 0, transform),
            this._transformPoint(w, 0, transform),
            this._transformPoint(0, h, transform),
            this._transformPoint(w, h, transform),
        ]

        const c0 = corners[0]
        const c1 = corners[1]
        const c2 = corners[2]
        const c3 = corners[3]

        if (!c0 || !c1 || !c2 || !c3) {
            throw new Error("Failed to transform image corners")
        }

        return new Float32Array([
            c0.x,
            c0.y,
            0,
            0, // Top-left
            c1.x,
            c1.y,
            1,
            0, // Top-right
            c2.x,
            c2.y,
            0,
            1, // Bottom-left
            c3.x,
            c3.y,
            1,
            1, // Bottom-right
        ])
    }

    /**
     * Transform a point by a matrix
     */
    private _transformPoint(
        x: number,
        y: number,
        matrix: Matrix,
    ): { x: number; y: number } {
        return {
            x: matrix.a * x + matrix.c * y + matrix.tx,
            y: matrix.b * x + matrix.d * y + matrix.ty,
        }
    }

    /**
     * Set blend mode
     */
    private _setBlendMode(blendMode: Paint["blendMode"]): void {
        if (!this._gl) {
            return
        }

        const gl = this._gl

        switch (blendMode) {
            case "normal":
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
                break
            case "multiply":
                gl.blendFunc(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA)
                break
            case "screen":
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR)
                break
            case "lighten":
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
                break
            default:
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        }
    }
}

// Shader source code

const PATH_VERTEX_SHADER = `
attribute vec2 a_position;

uniform mat3 u_projection;
uniform mat3 u_transform;

void main() {
    vec3 pos = u_projection * u_transform * vec3(a_position, 1.0);
    gl_Position = vec4(pos.xy, 0.0, 1.0);
}
`

const PATH_FRAGMENT_SHADER = `
precision mediump float;

uniform vec4 u_color;

void main() {
    gl_FragColor = u_color;
}
`

const IMAGE_VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texCoord;

uniform mat3 u_projection;

varying vec2 v_texCoord;

void main() {
    vec3 pos = u_projection * vec3(a_position, 1.0);
    gl_Position = vec4(pos.xy, 0.0, 1.0);
    v_texCoord = a_texCoord;
}
`

const IMAGE_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_texture;
uniform float u_opacity;

varying vec2 v_texCoord;

void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    gl_FragColor = vec4(color.rgb, color.a * u_opacity);
}
`
