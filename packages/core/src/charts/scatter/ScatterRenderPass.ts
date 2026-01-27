/**
 * Render pass for scatter plot points
 */

import type {
  RenderPass,
  RenderContext,
  ChartState,
  ShaderProgram,
  ProcessedSeriesData,
  Margins,
} from '../../types/index.js';
import { POINT_SHADER } from '../../shaders/point.js';

/**
 * Configuration for the scatter render pass
 */
export interface ScatterRenderPassConfig {
  /** WebGL2 rendering context */
  gl: WebGL2RenderingContext;
  /** Get shader program function */
  getShaderProgram: (id: string, source: { vertex: string; fragment: string }) => ShaderProgram;
  /** Chart margins */
  margins: Margins;
  /** Pixel ratio */
  pixelRatio: number;
}

/**
 * Render pass for drawing scatter plot points using WebGL
 */
export class ScatterRenderPass implements RenderPass {
  readonly id = 'scatter-points';
  readonly order = 10;
  enabled = true;

  private gl: WebGL2RenderingContext;
  private getShaderProgram: ScatterRenderPassConfig['getShaderProgram'];
  private shader: ShaderProgram | null = null;
  private margins: Margins;
  private pixelRatio: number;

  // GPU resources
  private vao: WebGLVertexArrayObject | null = null;
  private buffer: WebGLBuffer | null = null;
  private pointCount: number = 0;

  // Data format: [x, y, r, g, b, a, size, shape] = 8 floats per point
  private static readonly STRIDE = 8 * Float32Array.BYTES_PER_ELEMENT;

  constructor(config: ScatterRenderPassConfig) {
    this.gl = config.gl;
    this.getShaderProgram = config.getShaderProgram;
    this.margins = config.margins;
    this.pixelRatio = config.pixelRatio;
  }

  /**
   * Initialize shader and GPU resources
   */
  private ensureInitialized(): void {
    if (this.shader) return;

    const { gl } = this;

    // Get or create shader
    this.shader = this.getShaderProgram('scatter-points', POINT_SHADER);

    // Create VAO
    this.vao = gl.createVertexArray();
    if (!this.vao) {
      throw new Error('Failed to create VAO');
    }

    // Create buffer
    this.buffer = gl.createBuffer();
    if (!this.buffer) {
      throw new Error('Failed to create buffer');
    }

    // Setup VAO
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    const stride = ScatterRenderPass.STRIDE;

    // a_position (vec2)
    const posLoc = this.shader.attributes.get('a_position');
    if (posLoc !== undefined) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
    }

    // a_color (vec4)
    const colorLoc = this.shader.attributes.get('a_color');
    if (colorLoc !== undefined) {
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(
        colorLoc,
        4,
        gl.FLOAT,
        false,
        stride,
        2 * Float32Array.BYTES_PER_ELEMENT
      );
    }

    // a_size (float)
    const sizeLoc = this.shader.attributes.get('a_size');
    if (sizeLoc !== undefined) {
      gl.enableVertexAttribArray(sizeLoc);
      gl.vertexAttribPointer(
        sizeLoc,
        1,
        gl.FLOAT,
        false,
        stride,
        6 * Float32Array.BYTES_PER_ELEMENT
      );
    }

    // a_shape (float)
    const shapeLoc = this.shader.attributes.get('a_shape');
    if (shapeLoc !== undefined) {
      gl.enableVertexAttribArray(shapeLoc);
      gl.vertexAttribPointer(
        shapeLoc,
        1,
        gl.FLOAT,
        false,
        stride,
        7 * Float32Array.BYTES_PER_ELEMENT
      );
    }

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Update point data on GPU
   */
  updateData(processedData: ProcessedSeriesData): void {
    this.ensureInitialized();

    const { gl } = this;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, processedData.positions, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.pointCount = processedData.pointCount;
  }

  /**
   * Update margins
   */
  setMargins(margins: Margins): void {
    this.margins = margins;
  }

  /**
   * Update pixel ratio
   */
  setPixelRatio(pixelRatio: number): void {
    this.pixelRatio = pixelRatio;
  }

  /**
   * Render the scatter points
   */
  render(ctx: RenderContext, state: ChartState): void {
    if (this.pointCount === 0) return;

    this.ensureInitialized();

    const { gl } = this;
    const shader = this.shader!;

    // Activate shader
    shader.use(gl);

    // Set uniforms
    shader.setUniform('u_projectionMatrix', ctx.projectionMatrix);
    shader.setUniform('u_viewMatrix', ctx.viewMatrix);
    shader.setUniform('u_resolution', [ctx.width, ctx.height]);
    shader.setUniform('u_pixelRatio', ctx.pixelRatio);

    // Set domain uniforms
    shader.setUniform('u_domainMin', [state.domain.x[0], state.domain.y[0]]);
    shader.setUniform('u_domainMax', [state.domain.x[1], state.domain.y[1]]);

    // Calculate plot bounds in pixels
    const plotLeft = this.margins.left * this.pixelRatio;
    const plotTop = this.margins.top * this.pixelRatio;
    const plotRight = ctx.width - this.margins.right * this.pixelRatio;
    const plotBottom = ctx.height - this.margins.bottom * this.pixelRatio;
    shader.setUniform('u_plotBounds', [plotLeft, plotTop, plotRight, plotBottom]);

    // Enable blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Enable scissor test to clip points to plot area
    gl.enable(gl.SCISSOR_TEST);
    // Note: WebGL scissor uses bottom-left origin, so we need to flip Y
    const scissorX = Math.floor(plotLeft);
    const scissorY = Math.floor(ctx.height - plotBottom); // Flip Y
    const scissorWidth = Math.ceil(plotRight - plotLeft);
    const scissorHeight = Math.ceil(plotBottom - plotTop);
    gl.scissor(scissorX, scissorY, scissorWidth, scissorHeight);

    // Bind VAO and draw
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.POINTS, 0, this.pointCount);
    gl.bindVertexArray(null);

    // Disable scissor test
    gl.disable(gl.SCISSOR_TEST);
  }

  /**
   * Clean up GPU resources
   */
  dispose(): void {
    const { gl } = this;

    if (this.vao) {
      gl.deleteVertexArray(this.vao);
      this.vao = null;
    }

    if (this.buffer) {
      gl.deleteBuffer(this.buffer);
      this.buffer = null;
    }

    // Note: shader is managed by ShaderCache, don't dispose here
    this.shader = null;
    this.pointCount = 0;
  }
}
