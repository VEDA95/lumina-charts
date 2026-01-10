/**
 * Core WebGL2 rendering engine
 */

import type {
  WebGLRendererConfig,
  RenderContext,
  RenderPass,
  ChartState,
  ShaderSource,
  ShaderProgram,
} from '../types/index.js';
import { ShaderCache } from './ShaderCache.js';
import { BufferPool } from './BufferPool.js';
import { createOrthoMatrix, createIdentityMatrix, resizeCanvas } from '../utils/index.js';

/**
 * Main WebGL2 renderer for chart visualization
 */
export class WebGLRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;
  readonly pixelRatio: number;

  private shaderCache: ShaderCache;
  private bufferPool: BufferPool;
  private renderPasses: Map<string, RenderPass> = new Map();
  private sortedPasses: RenderPass[] = [];

  private frameId: number | null = null;
  private needsRender: boolean = false;
  private renderContext: RenderContext;

  private width: number = 0;
  private height: number = 0;

  constructor(config: WebGLRendererConfig) {
    this.canvas = config.canvas;
    this.pixelRatio = config.pixelRatio ?? window.devicePixelRatio;

    const gl = this.initWebGL2(config);
    if (!gl) {
      throw new Error('WebGL2 is not supported in this browser');
    }
    this.gl = gl;

    this.shaderCache = new ShaderCache(gl);
    this.bufferPool = new BufferPool(gl);

    // Initialize render context
    this.renderContext = this.createRenderContext();

    // Initial setup
    this.setupGL();
    this.resize();
  }

  /**
   * Initialize WebGL2 context with configuration
   */
  private initWebGL2(config: WebGLRendererConfig): WebGL2RenderingContext | null {
    const gl = config.canvas.getContext('webgl2', {
      antialias: config.antialias ?? true,
      alpha: config.alpha ?? true,
      premultipliedAlpha: config.premultipliedAlpha ?? true,
      preserveDrawingBuffer: config.preserveDrawingBuffer ?? false,
      powerPreference: config.powerPreference ?? 'high-performance',
    });

    if (gl) {
      // Enable useful extensions
      gl.getExtension('EXT_color_buffer_float');
      gl.getExtension('OES_texture_float_linear');
    }

    return gl;
  }

  /**
   * Setup initial WebGL state
   */
  private setupGL(): void {
    const { gl } = this;

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Enable depth testing for proper layering
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // Set clear color (transparent)
    gl.clearColor(0, 0, 0, 0);
  }

  /**
   * Create render context object
   */
  private createRenderContext(): RenderContext {
    return {
      gl: this.gl,
      canvas: this.canvas,
      pixelRatio: this.pixelRatio,
      width: this.width,
      height: this.height,
      projectionMatrix: createOrthoMatrix(-1, 1, -1, 1),
      viewMatrix: createIdentityMatrix(),
    };
  }

  /**
   * Resize the renderer to match canvas size
   */
  resize(): { width: number; height: number; changed: boolean } {
    const result = resizeCanvas(this.canvas, this.pixelRatio);

    if (result.changed) {
      this.width = result.width;
      this.height = result.height;

      this.renderContext.width = result.width;
      this.renderContext.height = result.height;
      this.renderContext.projectionMatrix = createOrthoMatrix(0, result.width, result.height, 0);

      this.gl.viewport(0, 0, result.width, result.height);
      this.requestRender();
    }

    return result;
  }

  /**
   * Get current dimensions
   */
  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Add a render pass
   */
  addRenderPass(pass: RenderPass): void {
    this.renderPasses.set(pass.id, pass);
    this.sortRenderPasses();
    this.requestRender();
  }

  /**
   * Remove a render pass
   */
  removeRenderPass(id: string): void {
    const pass = this.renderPasses.get(id);
    if (pass) {
      pass.dispose();
      this.renderPasses.delete(id);
      this.sortRenderPasses();
    }
  }

  /**
   * Get a render pass by ID
   */
  getRenderPass(id: string): RenderPass | undefined {
    return this.renderPasses.get(id);
  }

  /**
   * Enable or disable a render pass
   */
  setRenderPassEnabled(id: string, enabled: boolean): void {
    const pass = this.renderPasses.get(id);
    if (pass) {
      pass.enabled = enabled;
      this.requestRender();
    }
  }

  /**
   * Sort render passes by order
   */
  private sortRenderPasses(): void {
    this.sortedPasses = Array.from(this.renderPasses.values()).sort((a, b) => a.order - b.order);
  }

  /**
   * Get or create a shader program
   */
  getShaderProgram(id: string, source: ShaderSource): ShaderProgram {
    return this.shaderCache.getProgram(id, source);
  }

  /**
   * Get the buffer pool for GPU buffer management
   */
  getBufferPool(): BufferPool {
    return this.bufferPool;
  }

  /**
   * Request a render on the next animation frame
   */
  requestRender(): void {
    this.needsRender = true;

    if (this.frameId === null) {
      this.frameId = requestAnimationFrame(() => this.renderFrame());
    }
  }

  /**
   * Perform immediate render (synchronous)
   */
  renderNow(state: ChartState): void {
    this.render(state);
  }

  /**
   * Internal render frame callback
   */
  private renderFrame(): void {
    this.frameId = null;

    if (!this.needsRender) return;
    this.needsRender = false;

    // Note: The actual render is triggered externally with state
    // This just clears the flag and frame request
  }

  /**
   * Perform the actual render
   */
  render(state: ChartState): void {
    const { gl, renderContext, sortedPasses } = this;

    // Clear buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update render context with current state
    renderContext.width = this.width;
    renderContext.height = this.height;

    // Execute render passes
    for (const pass of sortedPasses) {
      if (pass.enabled) {
        pass.render(renderContext, state);
      }
    }

    this.needsRender = false;
  }

  /**
   * Set the clear color
   */
  setClearColor(r: number, g: number, b: number, a: number = 1): void {
    this.gl.clearColor(r, g, b, a);
    this.requestRender();
  }

  /**
   * Update projection matrix for a specific domain
   */
  setProjection(left: number, right: number, bottom: number, top: number): void {
    this.renderContext.projectionMatrix = createOrthoMatrix(left, right, bottom, top);
    this.requestRender();
  }

  /**
   * Update view matrix
   */
  setViewMatrix(matrix: Float32Array): void {
    this.renderContext.viewMatrix = matrix;
    this.requestRender();
  }

  /**
   * Get current render context
   */
  getRenderContext(): RenderContext {
    return this.renderContext;
  }

  /**
   * Check if WebGL context is lost
   */
  isContextLost(): boolean {
    return this.gl.isContextLost();
  }

  /**
   * Get WebGL capabilities info
   */
  getCapabilities(): {
    maxTextureSize: number;
    maxVertexAttribs: number;
    maxVaryings: number;
    maxTextureUnits: number;
  } {
    const { gl } = this;
    return {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxVaryings: gl.getParameter(gl.MAX_VARYING_VECTORS),
      maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
    };
  }

  /**
   * Export canvas as image data URL
   */
  toDataURL(type: string = 'image/png', quality?: number): string {
    // Force a render before export
    this.gl.finish();
    return this.canvas.toDataURL(type, quality);
  }

  /**
   * Export canvas as Blob
   */
  toBlob(type: string = 'image/png', quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.gl.finish();
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        type,
        quality
      );
    });
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    // Cancel pending render
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    // Dispose render passes
    for (const pass of this.renderPasses.values()) {
      pass.dispose();
    }
    this.renderPasses.clear();
    this.sortedPasses = [];

    // Dispose shader cache and buffer pool
    this.shaderCache.dispose();
    this.bufferPool.dispose();
  }
}
