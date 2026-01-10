/**
 * Render pass for line chart
 */

import type {
  RenderPass,
  RenderContext,
  ChartState,
  ShaderProgram,
  Margins,
  RGBAColor,
} from '../../types/index.js';
import { SIMPLE_LINE_SHADER } from '../../shaders/line.js';

/**
 * Configuration for the line render pass
 */
export interface LineRenderPassConfig {
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
 * Processed line data for a single series
 */
export interface LineSeriesData {
  /** Series ID */
  seriesId: string;
  /** Vertex positions (x, y pairs in data coordinates) */
  positions: Float32Array;
  /** Line color */
  color: RGBAColor;
  /** Number of points */
  pointCount: number;
  /** Line width in pixels */
  lineWidth: number;
}

/**
 * Render pass for drawing line charts using WebGL
 */
export class LineRenderPass implements RenderPass {
  readonly id = 'line';
  readonly order = 10;
  enabled = true;

  private gl: WebGL2RenderingContext;
  private getShaderProgram: LineRenderPassConfig['getShaderProgram'];
  private shader: ShaderProgram | null = null;
  private margins: Margins;
  private pixelRatio: number;

  // GPU resources per series
  private seriesBuffers: Map<
    string,
    {
      vao: WebGLVertexArrayObject;
      buffer: WebGLBuffer;
      color: RGBAColor;
      pointCount: number;
      lineWidth: number;
    }
  > = new Map();

  constructor(config: LineRenderPassConfig) {
    this.gl = config.gl;
    this.getShaderProgram = config.getShaderProgram;
    this.margins = config.margins;
    this.pixelRatio = config.pixelRatio;
  }

  /**
   * Initialize shader
   */
  private ensureInitialized(): void {
    if (this.shader) return;
    this.shader = this.getShaderProgram('line-simple', SIMPLE_LINE_SHADER);
  }

  /**
   * Update line data for a series
   */
  updateSeriesData(data: LineSeriesData): void {
    this.ensureInitialized();

    const { gl } = this;
    let bufferInfo = this.seriesBuffers.get(data.seriesId);

    // Create new buffer info if needed
    if (!bufferInfo) {
      const vao = gl.createVertexArray();
      const buffer = gl.createBuffer();

      if (!vao || !buffer) {
        throw new Error('Failed to create WebGL resources');
      }

      bufferInfo = {
        vao,
        buffer,
        color: data.color,
        pointCount: 0,
        lineWidth: data.lineWidth,
      };
      this.seriesBuffers.set(data.seriesId, bufferInfo);
    }

    // Update buffer data
    bufferInfo.color = data.color;
    bufferInfo.pointCount = data.pointCount;
    bufferInfo.lineWidth = data.lineWidth;

    // Build vertex data: [x, y, r, g, b, a] per vertex
    const vertexData = new Float32Array(data.pointCount * 6);
    const [r, g, b, a] = data.color;

    for (let i = 0; i < data.pointCount; i++) {
      const idx = i * 6;
      vertexData[idx] = data.positions[i * 2]; // x
      vertexData[idx + 1] = data.positions[i * 2 + 1]; // y
      vertexData[idx + 2] = r;
      vertexData[idx + 3] = g;
      vertexData[idx + 4] = b;
      vertexData[idx + 5] = a;
    }

    // Upload to GPU
    gl.bindVertexArray(bufferInfo.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

    // Setup vertex attributes
    const stride = 6 * Float32Array.BYTES_PER_ELEMENT;

    const posLoc = this.shader!.attributes.get('a_position');
    if (posLoc !== undefined) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
    }

    const colorLoc = this.shader!.attributes.get('a_color');
    if (colorLoc !== undefined) {
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
    }

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Remove a series
   */
  removeSeries(seriesId: string): void {
    const bufferInfo = this.seriesBuffers.get(seriesId);
    if (bufferInfo) {
      this.gl.deleteVertexArray(bufferInfo.vao);
      this.gl.deleteBuffer(bufferInfo.buffer);
      this.seriesBuffers.delete(seriesId);
    }
  }

  /**
   * Clear all series data
   */
  clearAllSeries(): void {
    for (const [seriesId] of this.seriesBuffers) {
      this.removeSeries(seriesId);
    }
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
   * Render all lines
   */
  render(ctx: RenderContext, state: ChartState): void {
    if (this.seriesBuffers.size === 0) return;

    this.ensureInitialized();

    const { gl } = this;
    const shader = this.shader!;

    // Calculate plot bounds
    const plotLeft = this.margins.left * this.pixelRatio;
    const plotTop = this.margins.top * this.pixelRatio;
    const plotRight = ctx.width - this.margins.right * this.pixelRatio;
    const plotBottom = ctx.height - this.margins.bottom * this.pixelRatio;

    // Enable scissor test for clipping
    gl.enable(gl.SCISSOR_TEST);
    const scissorX = Math.floor(plotLeft);
    const scissorY = Math.floor(ctx.height - plotBottom);
    const scissorWidth = Math.ceil(plotRight - plotLeft);
    const scissorHeight = Math.ceil(plotBottom - plotTop);
    gl.scissor(scissorX, scissorY, scissorWidth, scissorHeight);

    // Enable blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Activate shader
    shader.use(gl);

    // Set common uniforms
    shader.setUniform('u_resolution', [ctx.width, ctx.height]);
    shader.setUniform('u_pixelRatio', ctx.pixelRatio);
    shader.setUniform('u_domainMin', [state.domain.x[0], state.domain.y[0]]);
    shader.setUniform('u_domainMax', [state.domain.x[1], state.domain.y[1]]);
    shader.setUniform('u_plotBounds', [plotLeft, plotTop, plotRight, plotBottom]);

    // Draw each series
    for (const [seriesId, bufferInfo] of this.seriesBuffers) {
      // Skip hidden series
      if (!state.visibleSeries.has(seriesId)) continue;
      if (bufferInfo.pointCount < 2) continue;

      gl.bindVertexArray(bufferInfo.vao);
      gl.lineWidth(bufferInfo.lineWidth); // Note: lineWidth > 1 not widely supported
      gl.drawArrays(gl.LINE_STRIP, 0, bufferInfo.pointCount);
    }

    gl.bindVertexArray(null);
    gl.disable(gl.SCISSOR_TEST);
  }

  /**
   * Clean up GPU resources
   */
  dispose(): void {
    this.clearAllSeries();
    this.shader = null;
  }
}
