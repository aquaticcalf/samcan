import type { color_program_locations, texture_program_locations } from "@/renderer/webgl/types"

type color_program_state = {
  program: WebGLProgram
  locations: color_program_locations
}

type texture_program_state = {
  program: WebGLProgram
  locations: texture_program_locations
}

const vertex_shader_source = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  uniform mat3 u_transform;
  uniform vec2 u_resolution;
  varying vec4 v_color;
  
  void main() {
    vec2 position = (u_transform * vec3(a_position, 1.0)).xy;
    vec2 clip_space = ((position / u_resolution) * 2.0) - 1.0;
    gl_Position = vec4(clip_space * vec2(1.0, -1.0), 0.0, 1.0);
    v_color = a_color;
  }
`

const fragment_shader_source = `
  precision mediump float;
  varying vec4 v_color;
  
  void main() {
    gl_FragColor = v_color;
  }
`

const texture_vertex_shader_source = `
  attribute vec2 a_position;
  attribute vec2 a_texcoord;
  uniform mat3 u_transform;
  uniform vec2 u_resolution;
  varying vec2 v_texcoord;
  
  void main() {
    vec2 position = (u_transform * vec3(a_position, 1.0)).xy;
    vec2 clip_space = ((position / u_resolution) * 2.0) - 1.0;
    gl_Position = vec4(clip_space * vec2(1.0, -1.0), 0.0, 1.0);
    v_texcoord = a_texcoord;
  }
`

const texture_fragment_shader_source = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_alpha;
  varying vec2 v_texcoord;
  
  void main() {
    gl_FragColor = texture2D(u_image, v_texcoord);
    gl_FragColor.a *= u_alpha;
  }
`

export function create_color_program_webgl(gl: WebGLRenderingContext): color_program_state | null {
  const program = create_shader_program(gl, vertex_shader_source, fragment_shader_source)
  if (program === null) {
    return null
  }

  const position = gl.getAttribLocation(program, "a_position")
  const color = gl.getAttribLocation(program, "a_color")
  const transform = gl.getUniformLocation(program, "u_transform")
  const resolution = gl.getUniformLocation(program, "u_resolution")

  if (position < 0 || color < 0 || transform === null || resolution === null) {
    gl.deleteProgram(program)
    return null
  }

  return {
    program,
    locations: { position, color, transform, resolution },
  }
}

export function create_texture_program_webgl(
  gl: WebGLRenderingContext,
): texture_program_state | null {
  const program = create_shader_program(
    gl,
    texture_vertex_shader_source,
    texture_fragment_shader_source,
  )
  if (program === null) {
    return null
  }

  const position = gl.getAttribLocation(program, "a_position")
  const texcoord = gl.getAttribLocation(program, "a_texcoord")
  const transform = gl.getUniformLocation(program, "u_transform")
  const resolution = gl.getUniformLocation(program, "u_resolution")
  const alpha = gl.getUniformLocation(program, "u_alpha")
  const sampler = gl.getUniformLocation(program, "u_image")

  if (
    position < 0 ||
    texcoord < 0 ||
    transform === null ||
    resolution === null ||
    alpha === null ||
    sampler === null
  ) {
    gl.deleteProgram(program)
    return null
  }

  return {
    program,
    locations: { position, texcoord, transform, resolution, alpha, sampler },
  }
}

function create_shader_program(
  gl: WebGLRenderingContext,
  vertex_source: string,
  fragment_source: string,
): WebGLProgram | null {
  const vertex_shader = compile_shader(gl, vertex_source, gl.VERTEX_SHADER)
  const fragment_shader = compile_shader(gl, fragment_source, gl.FRAGMENT_SHADER)

  if (vertex_shader === null || fragment_shader === null) {
    return null
  }

  const program = gl.createProgram()
  if (program === null) {
    return null
  }

  gl.attachShader(program, vertex_shader)
  gl.attachShader(program, fragment_shader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    return null
  }

  return program
}

function compile_shader(
  gl: WebGLRenderingContext,
  source: string,
  type: number,
): WebGLShader | null {
  const shader = gl.createShader(type)
  if (shader === null) {
    return null
  }

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }

  return shader
}
