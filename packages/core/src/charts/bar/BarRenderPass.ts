/**
 * Bar render pass for drawing bar chart rectangles
 */

import type {
  RenderPass,
  RenderContext,
  ChartState,
  ShaderProgram,
  Margins,
  RGBAColor,
} from '../../types/index.js';
import { BAR_SHADER } from '../../shaders/bar.js';

/**
 * Configuration for the bar render pass
 */
export interface BarRenderPassConfig {
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
 * Bar data for rendering
 */
export interface BarData {
  /** X position in pixels (left edge of bar) */
  x: number;
  /** Y position in pixels (top edge of bar) */
  y: number;
  /** Bar width in pixels */
  width: number;
  /** Bar height in pixels */
  height: number;
  /** Bar color */
  color: RGBAColor;
  /** Series ID this bar belongs to */
  seriesId: string;
  /** Category index */
  categoryIndex: number;
}

/**
 * Render pass for drawing bar charts
 * Renders bars as two triangles (6 vertices) per bar
 */
export class BarRenderPass implements RenderPass {
  readonly id = 'bar';
  readonly order = 10; // Render after grid
  enabled = true;

  private gl: WebGL2RenderingContext;
  private getShaderProgram: BarRenderPassConfig['getShaderProgram'];
  private shader: ShaderProgram | null = null;
  private margins: Margins;
  private pixelRatio: number;

  // GPU resources
  private vao: WebGLVertexArrayObject | null = null;
  private buffer: WebGLBuffer | null = null;
  private vertexCount: number = 0;

  // Bar data for hit testing
  private bars: BarData[] = [];

  constructor(config: BarRenderPassConfig) {
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
    this.shader = this.getShaderProgram('bar', BAR_SHADER);

    // Create VAO
    this.vao = gl.createVertexArray();
    if (!this.vao) {
      throw new Error('Failed to create VAO for bar render pass');
    }

    // Create buffer
    this.buffer = gl.createBuffer();
    if (!this.buffer) {
      throw new Error('Failed to create buffer for bar render pass');
    }
  }

  /**
   * Update bar data
   */
  updateData(bars: BarData[]): void {
    this.bars = bars;
    this.uploadBarData();
  }

  /**
   * Upload bar data to GPU
   */
  private uploadBarData(): void {
    this.ensureInitialized();

    const { gl } = this;
    const vertices: number[] = [];

    // Build vertex data for all bars
    // Each bar is 2 triangles = 6 vertices
    // Vertex format: [x, y, r, g, b, a]
    for (const bar of this.bars) {
      const { x, y, width, height, color } = bar;
      const [r, g, b, a] = color;

      // Bar corners (in pixel coordinates)
      const left = x;
      const right = x + width;
      const top = y;
      const bottom = y + height;

      // Triangle 1: top-left, bottom-left, top-right
      vertices.push(left, top, r, g, b, a);
      vertices.push(left, bottom, r, g, b, a);
      vertices.push(right, top, r, g, b, a);

      // Triangle 2: top-right, bottom-left, bottom-right
      vertices.push(right, top, r, g, b, a);
      vertices.push(left, bottom, r, g, b, a);
      vertices.push(right, bottom, r, g, b, a);
    }

    const vertexData = new Float32Array(vertices);
    this.vertexCount = vertices.length / 6; // 6 floats per vertex

    // Upload to GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Get bars for hit testing
   */
  getBars(): BarData[] {
    return this.bars;
  }

  /**
   * Hit test to find bar at pixel coordinates
   */
  hitTest(pixelX: number, pixelY: number): BarData | null {
    for (const bar of this.bars) {
      if (
        pixelX >= bar.x &&
        pixelX <= bar.x + bar.width &&
        pixelY >= bar.y &&
        pixelY <= bar.y + bar.height
      ) {
        return bar;
      }
    }
    return null;
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
   * Render the bars
   */
  render(ctx: RenderContext, _state: ChartState): void {
    if (this.vertexCount === 0) return;

    this.ensureInitialized();

    const { gl } = this;
    const shader = this.shader!;

    // Setup VAO
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    const stride = 6 * Float32Array.BYTES_PER_ELEMENT;

    // a_position (vec2)
    const posLoc = shader.attributes.get('a_position');
    if (posLoc !== undefined) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
    }

    // a_color (vec4)
    const colorLoc = shader.attributes.get('a_color');
    if (colorLoc !== undefined) {
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
    }

    // Activate shader
    shader.use(gl);

    // Set uniforms
    shader.setUniform('u_resolution', [ctx.width, ctx.height]);
    shader.setUniform('u_pixelRatio', ctx.pixelRatio);

    // Enable scissor test to clip to plot area
    const plotLeft = this.margins.left * this.pixelRatio;
    const plotTop = this.margins.top * this.pixelRatio;
    const plotWidth = ctx.width - (this.margins.left + this.margins.right) * this.pixelRatio;
    const plotHeight = ctx.height - (this.margins.top + this.margins.bottom) * this.pixelRatio;

    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(plotLeft, ctx.height - plotTop - plotHeight, plotWidth, plotHeight);

    // Draw triangles
    gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

    // Disable scissor test
    gl.disable(gl.SCISSOR_TEST);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Clear all bar data
   */
  clear(): void {
    this.bars = [];
    this.vertexCount = 0;
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

    this.shader = null;
    this.vertexCount = 0;
    this.bars = [];
  }
}
