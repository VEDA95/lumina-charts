/**
 * Shader program cache for efficient shader reuse
 */

import type { ShaderProgram, UniformValue, ShaderSource } from '../types/index.js';

/**
 * Compiled shader program implementation
 */
class CompiledShaderProgram implements ShaderProgram {
  program: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation> = new Map();
  attributes: Map<string, number> = new Map();

  private gl: WebGL2RenderingContext;
  private uniformSetters: Map<string, (value: UniformValue) => void> = new Map();

  constructor(gl: WebGL2RenderingContext, program: WebGLProgram) {
    this.gl = gl;
    this.program = program;
    this.cacheLocations();
  }

  private cacheLocations(): void {
    const { gl, program } = this;

    // Cache uniform locations
    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < numUniforms; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) {
        const location = gl.getUniformLocation(program, info.name);
        if (location) {
          // Remove array suffix [0] if present
          const name = info.name.replace(/\[0\]$/, '');
          this.uniforms.set(name, location);
          this.uniformSetters.set(name, this.createUniformSetter(location, info.type));
        }
      }
    }

    // Cache attribute locations
    const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < numAttributes; i++) {
      const info = gl.getActiveAttrib(program, i);
      if (info) {
        const location = gl.getAttribLocation(program, info.name);
        if (location >= 0) {
          this.attributes.set(info.name, location);
        }
      }
    }
  }

  private createUniformSetter(
    location: WebGLUniformLocation,
    type: number
  ): (value: UniformValue) => void {
    const { gl } = this;

    // Float types
    if (type === gl.FLOAT) {
      return (v) => gl.uniform1f(location, v as number);
    }

    if (type === gl.FLOAT_VEC2) {
      return (v) => {
        if (v instanceof Float32Array) {
          gl.uniform2fv(location, v);
        } else {
          gl.uniform2f(location, (v as readonly number[])[0], (v as readonly number[])[1]);
        }
      };
    }

    if (type === gl.FLOAT_VEC3) {
      return (v) => {
        if (v instanceof Float32Array) {
          gl.uniform3fv(location, v);
        } else {
          const arr = v as readonly number[];
          gl.uniform3f(location, arr[0], arr[1], arr[2]);
        }
      };
    }

    if (type === gl.FLOAT_VEC4) {
      return (v) => {
        if (v instanceof Float32Array) {
          gl.uniform4fv(location, v);
        } else {
          const arr = v as readonly number[];
          gl.uniform4f(location, arr[0], arr[1], arr[2], arr[3]);
        }
      };
    }

    // Integer types
    if (type === gl.INT || type === gl.BOOL || type === gl.SAMPLER_2D || type === gl.SAMPLER_CUBE) {
      return (v) => gl.uniform1i(location, v as number);
    }

    if (type === gl.INT_VEC2 || type === gl.BOOL_VEC2) {
      return (v) => {
        if (v instanceof Int32Array) {
          gl.uniform2iv(location, v);
        } else {
          const arr = v as readonly number[];
          gl.uniform2i(location, arr[0], arr[1]);
        }
      };
    }

    if (type === gl.INT_VEC3 || type === gl.BOOL_VEC3) {
      return (v) => {
        if (v instanceof Int32Array) {
          gl.uniform3iv(location, v);
        } else {
          const arr = v as readonly number[];
          gl.uniform3i(location, arr[0], arr[1], arr[2]);
        }
      };
    }

    if (type === gl.INT_VEC4 || type === gl.BOOL_VEC4) {
      return (v) => {
        if (v instanceof Int32Array) {
          gl.uniform4iv(location, v);
        } else {
          const arr = v as readonly number[];
          gl.uniform4i(location, arr[0], arr[1], arr[2], arr[3]);
        }
      };
    }

    // Matrix types
    if (type === gl.FLOAT_MAT2) {
      return (v) => gl.uniformMatrix2fv(location, false, v as Float32Array);
    }

    if (type === gl.FLOAT_MAT3) {
      return (v) => gl.uniformMatrix3fv(location, false, v as Float32Array);
    }

    if (type === gl.FLOAT_MAT4) {
      return (v) => gl.uniformMatrix4fv(location, false, v as Float32Array);
    }

    // Default fallback
    return (v) => gl.uniform1f(location, v as number);
  }

  use(): void {
    this.gl.useProgram(this.program);
  }

  setUniform(name: string, value: UniformValue): void {
    const setter = this.uniformSetters.get(name);
    if (setter) {
      setter(value);
    }
  }

  dispose(): void {
    this.gl.deleteProgram(this.program);
    this.uniforms.clear();
    this.attributes.clear();
    this.uniformSetters.clear();
  }
}

/**
 * Cache for compiled shader programs
 */
export class ShaderCache {
  private gl: WebGL2RenderingContext;
  private programs: Map<string, CompiledShaderProgram> = new Map();
  private shaders: Map<string, WebGLShader> = new Map();

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /**
   * Get or create a shader program
   */
  getProgram(id: string, source: ShaderSource): ShaderProgram {
    let program = this.programs.get(id);

    if (!program) {
      program = this.createProgram(source);
      this.programs.set(id, program);
    }

    return program;
  }

  /**
   * Check if a program exists
   */
  hasProgram(id: string): boolean {
    return this.programs.has(id);
  }

  /**
   * Remove a program from cache
   */
  removeProgram(id: string): void {
    const program = this.programs.get(id);
    if (program) {
      program.dispose();
      this.programs.delete(id);
    }
  }

  /**
   * Create a new shader program
   */
  private createProgram(source: ShaderSource): CompiledShaderProgram {
    const { gl } = this;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, source.vertex);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, source.fragment);

    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to create WebGL program');
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Failed to link shader program: ${info}`);
    }

    // Detach and delete shaders after linking
    gl.detachShader(program, vertexShader);
    gl.detachShader(program, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return new CompiledShaderProgram(gl, program);
  }

  /**
   * Compile a single shader
   */
  private compileShader(type: number, source: string): WebGLShader {
    const { gl } = this;

    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      const typeStr = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
      gl.deleteShader(shader);
      throw new Error(`Failed to compile ${typeStr} shader: ${info}`);
    }

    return shader;
  }

  /**
   * Dispose all cached programs
   */
  dispose(): void {
    for (const program of this.programs.values()) {
      program.dispose();
    }
    this.programs.clear();

    for (const shader of this.shaders.values()) {
      this.gl.deleteShader(shader);
    }
    this.shaders.clear();
  }
}
