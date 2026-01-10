/**
 * GPU buffer pool for efficient memory management
 */

import type { GPUBuffer, BufferLayout, AttributeLayout } from '../types/index.js';

/**
 * Pool of reusable GPU buffers
 */
export class BufferPool {
  private gl: WebGL2RenderingContext;
  private buffers: Map<string, GPUBuffer> = new Map();
  private vaos: Map<string, WebGLVertexArrayObject> = new Map();

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /**
   * Get or create a buffer with the specified ID
   * If the buffer exists and is large enough, it will be reused
   * Otherwise, a new buffer is created with extra capacity
   */
  getBuffer(
    id: string,
    data: Float32Array | Uint32Array | Uint16Array,
    usage: number = WebGL2RenderingContext.DYNAMIC_DRAW
  ): GPUBuffer {
    const { gl } = this;
    let gpuBuffer = this.buffers.get(id);

    const target =
      data instanceof Uint32Array || data instanceof Uint16Array
        ? gl.ELEMENT_ARRAY_BUFFER
        : gl.ARRAY_BUFFER;

    if (!gpuBuffer || gpuBuffer.size < data.byteLength) {
      // Delete old buffer if it exists
      if (gpuBuffer) {
        gl.deleteBuffer(gpuBuffer.buffer);
      }

      const buffer = gl.createBuffer();
      if (!buffer) {
        throw new Error('Failed to create WebGL buffer');
      }

      gl.bindBuffer(target, buffer);

      // Allocate with 50% extra capacity for growth
      const allocSize = Math.ceil(data.byteLength * 1.5);
      gl.bufferData(target, allocSize, usage);
      gl.bufferSubData(target, 0, data);

      gpuBuffer = {
        buffer,
        size: allocSize,
        usage,
        stride: 0,
      };
      this.buffers.set(id, gpuBuffer);
    } else {
      // Reuse existing buffer
      gl.bindBuffer(target, gpuBuffer.buffer);
      gl.bufferSubData(target, 0, data);
    }

    return gpuBuffer;
  }

  /**
   * Update a portion of an existing buffer
   */
  updateBufferSubData(
    id: string,
    offset: number,
    data: Float32Array | Uint32Array | Uint16Array
  ): void {
    const { gl } = this;
    const gpuBuffer = this.buffers.get(id);

    if (!gpuBuffer) {
      throw new Error(`Buffer "${id}" not found`);
    }

    const target =
      data instanceof Uint32Array || data instanceof Uint16Array
        ? gl.ELEMENT_ARRAY_BUFFER
        : gl.ARRAY_BUFFER;

    gl.bindBuffer(target, gpuBuffer.buffer);
    gl.bufferSubData(target, offset, data);
  }

  /**
   * Create a Vertex Array Object (VAO) with the specified layout
   */
  createVAO(
    id: string,
    bufferId: string,
    layout: BufferLayout,
    indexBufferId?: string
  ): WebGLVertexArrayObject {
    const { gl } = this;

    // Delete existing VAO if present
    const existingVao = this.vaos.get(id);
    if (existingVao) {
      gl.deleteVertexArray(existingVao);
    }

    const vao = gl.createVertexArray();
    if (!vao) {
      throw new Error('Failed to create VAO');
    }

    const gpuBuffer = this.buffers.get(bufferId);
    if (!gpuBuffer) {
      throw new Error(`Buffer "${bufferId}" not found`);
    }

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gpuBuffer.buffer);

    // Setup vertex attributes
    for (const attr of layout.attributes) {
      gl.enableVertexAttribArray(attr.location);

      if (attr.type === gl.INT || attr.type === gl.UNSIGNED_INT) {
        gl.vertexAttribIPointer(attr.location, attr.size, attr.type, layout.stride, attr.offset);
      } else {
        gl.vertexAttribPointer(
          attr.location,
          attr.size,
          attr.type,
          attr.normalized,
          layout.stride,
          attr.offset
        );
      }

      if (layout.instanceDivisor !== undefined && layout.instanceDivisor > 0) {
        gl.vertexAttribDivisor(attr.location, layout.instanceDivisor);
      }
    }

    // Bind index buffer if provided
    if (indexBufferId) {
      const indexBuffer = this.buffers.get(indexBufferId);
      if (indexBuffer) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer);
      }
    }

    gl.bindVertexArray(null);
    this.vaos.set(id, vao);

    return vao;
  }

  /**
   * Get an existing VAO
   */
  getVAO(id: string): WebGLVertexArrayObject | undefined {
    return this.vaos.get(id);
  }

  /**
   * Bind a VAO for rendering
   */
  bindVAO(id: string): void {
    const vao = this.vaos.get(id);
    if (vao) {
      this.gl.bindVertexArray(vao);
    }
  }

  /**
   * Unbind any bound VAO
   */
  unbindVAO(): void {
    this.gl.bindVertexArray(null);
  }

  /**
   * Check if a buffer exists
   */
  hasBuffer(id: string): boolean {
    return this.buffers.has(id);
  }

  /**
   * Check if a VAO exists
   */
  hasVAO(id: string): boolean {
    return this.vaos.has(id);
  }

  /**
   * Delete a specific buffer
   */
  deleteBuffer(id: string): void {
    const buffer = this.buffers.get(id);
    if (buffer) {
      this.gl.deleteBuffer(buffer.buffer);
      this.buffers.delete(id);
    }
  }

  /**
   * Delete a specific VAO
   */
  deleteVAO(id: string): void {
    const vao = this.vaos.get(id);
    if (vao) {
      this.gl.deleteVertexArray(vao);
      this.vaos.delete(id);
    }
  }

  /**
   * Get buffer info for debugging
   */
  getBufferInfo(id: string): { size: number; usage: number } | undefined {
    const buffer = this.buffers.get(id);
    if (buffer) {
      return { size: buffer.size, usage: buffer.usage };
    }
    return undefined;
  }

  /**
   * Get total allocated buffer memory
   */
  getTotalMemory(): number {
    let total = 0;
    for (const buffer of this.buffers.values()) {
      total += buffer.size;
    }
    return total;
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    const { gl } = this;

    for (const vao of this.vaos.values()) {
      gl.deleteVertexArray(vao);
    }
    this.vaos.clear();

    for (const buffer of this.buffers.values()) {
      gl.deleteBuffer(buffer.buffer);
    }
    this.buffers.clear();
  }
}

/**
 * Helper to create attribute layouts
 */
export function createAttributeLayout(
  name: string,
  location: number,
  size: number,
  type: number = WebGL2RenderingContext.FLOAT,
  normalized: boolean = false,
  offset: number = 0
): AttributeLayout {
  return { name, location, size, type, normalized, offset };
}

/**
 * Calculate stride from attributes
 */
export function calculateStride(attributes: AttributeLayout[]): number {
  let maxEnd = 0;
  for (const attr of attributes) {
    const typeSize = getTypeSize(attr.type);
    const end = attr.offset + attr.size * typeSize;
    maxEnd = Math.max(maxEnd, end);
  }
  return maxEnd;
}

/**
 * Get byte size of a GL type
 */
function getTypeSize(type: number): number {
  if (type === WebGL2RenderingContext.BYTE || type === WebGL2RenderingContext.UNSIGNED_BYTE) {
    return 1;
  }

  if (
    type === WebGL2RenderingContext.SHORT ||
    type === WebGL2RenderingContext.UNSIGNED_SHORT ||
    type === WebGL2RenderingContext.HALF_FLOAT
  ) {
    return 2;
  }

  // INT, UNSIGNED_INT, FLOAT, and default
  return 4;
}
