/**
 * Histogram render pass for drawing histogram bars
 */

import type {
  RenderPass,
  RenderContext,
  ChartState,
  ShaderProgram,
  Margins,
  RGBAColor,
} from '../../types/index.js';
import { BAR_SHADER, BAR_ROUNDED_SHADER } from '../../shaders/bar.js';
import type { Bin } from './binning.js';

/**
 * Configuration for the histogram render pass
 */
export interface HistogramRenderPassConfig {
  /** WebGL2 rendering context */
  gl: WebGL2RenderingContext;
  /** Get shader program function */
  getShaderProgram: (id: string, source: { vertex: string; fragment: string }) => ShaderProgram;
  /** Chart margins */
  margins: Margins;
  /** Pixel ratio */
  pixelRatio: number;
  /** Corner radius for rounded bars (0 = square corners) */
  cornerRadius?: number;
}

/**
 * Histogram bar data for rendering
 */
export interface HistogramBarData {
  /** Left edge in data coordinates */
  x0: number;
  /** Right edge in data coordinates */
  x1: number;
  /** Bar height (count/frequency) */
  count: number;
  /** Bar color */
  color: RGBAColor;
  /** Bin index for hit testing */
  binIndex: number;
}

/**
 * Render pass for drawing histogram bars
 * Similar to BarRenderPass but uses data coordinates for bin edges
 */
export class HistogramRenderPass implements RenderPass {
  readonly id = 'histogram';
  readonly order = 10; // Render after grid
  enabled = true;

  private gl: WebGL2RenderingContext;
  private getShaderProgram: HistogramRenderPassConfig['getShaderProgram'];
  private shader: ShaderProgram | null = null;
  private roundedShader: ShaderProgram | null = null;
  private margins: Margins;
  private pixelRatio: number;
  private cornerRadius: number;

  // GPU resources
  private vao: WebGLVertexArrayObject | null = null;
  private buffer: WebGLBuffer | null = null;
  private vertexCount: number = 0;

  // Bar data for hit testing
  private bars: HistogramBarData[] = [];

  constructor(config: HistogramRenderPassConfig) {
    this.gl = config.gl;
    this.getShaderProgram = config.getShaderProgram;
    this.margins = config.margins;
    this.pixelRatio = config.pixelRatio;
    this.cornerRadius = config.cornerRadius ?? 0;
  }

  /**
   * Initialize shader and GPU resources
   */
  private ensureInitialized(): void {
    if (this.shader) return;

    const { gl } = this;

    // Get or create shaders (both regular and rounded)
    this.shader = this.getShaderProgram('histogram-bar', BAR_SHADER);
    this.roundedShader = this.getShaderProgram('histogram-bar-rounded', BAR_ROUNDED_SHADER);

    // Create VAO
    this.vao = gl.createVertexArray();
    if (!this.vao) {
      throw new Error('Failed to create VAO for histogram render pass');
    }

    // Create buffer
    this.buffer = gl.createBuffer();
    if (!this.buffer) {
      throw new Error('Failed to create buffer for histogram render pass');
    }
  }

  /**
   * Update corner radius
   */
  setCornerRadius(radius: number): void {
    this.cornerRadius = radius;
  }

  /**
   * Get current corner radius
   */
  getCornerRadius(): number {
    return this.cornerRadius;
  }

  /**
   * Update histogram data from bins
   */
  updateData(bins: Bin[], color: RGBAColor, gap: number = 0): void {
    this.bars = bins.map((bin, index) => ({
      x0: bin.x0,
      x1: bin.x1,
      count: bin.count,
      color,
      binIndex: index,
    }));

    // Store gap for later use in render
    this.barGap = gap;
  }

  private barGap: number = 0;

  /**
   * Get bars for hit testing
   */
  getBars(): HistogramBarData[] {
    return this.bars;
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
   * Render the histogram bars
   */
  render(ctx: RenderContext, state: ChartState): void {
    if (this.bars.length === 0) return;

    this.ensureInitialized();

    const { gl } = this;
    const useRounded = this.cornerRadius > 0;
    const shader = useRounded ? this.roundedShader! : this.shader!;

    // Calculate plot area
    const plotLeft = this.margins.left * this.pixelRatio;
    const plotTop = this.margins.top * this.pixelRatio;
    const plotRight = ctx.width - this.margins.right * this.pixelRatio;
    const plotBottom = ctx.height - this.margins.bottom * this.pixelRatio;
    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;

    const domain = state.domain;
    const domainWidth = domain.x[1] - domain.x[0];
    const domainHeight = domain.y[1] - domain.y[0];

    // Build vertex data
    const vertices: number[] = [];
    const halfGap = (this.barGap * this.pixelRatio) / 2;

    for (const bar of this.bars) {
      const [r, g, b, a] = bar.color;

      // Convert data coordinates to pixel coordinates
      const normalizedX0 = (bar.x0 - domain.x[0]) / domainWidth;
      const normalizedX1 = (bar.x1 - domain.x[0]) / domainWidth;
      const normalizedY = (bar.count - domain.y[0]) / domainHeight;

      let left = plotLeft + normalizedX0 * plotWidth + halfGap;
      let right = plotLeft + normalizedX1 * plotWidth - halfGap;
      const top = plotBottom - normalizedY * plotHeight;
      const bottom = plotBottom;

      // Ensure minimum bar width
      if (right - left < 1) {
        const center = (left + right) / 2;
        left = center - 0.5;
        right = center + 0.5;
      }

      if (useRounded) {
        // Triangle 1: top-left, bottom-left, top-right (with bar bounds)
        vertices.push(left, top, r, g, b, a, left, top, right, bottom);
        vertices.push(left, bottom, r, g, b, a, left, top, right, bottom);
        vertices.push(right, top, r, g, b, a, left, top, right, bottom);

        // Triangle 2: top-right, bottom-left, bottom-right (with bar bounds)
        vertices.push(right, top, r, g, b, a, left, top, right, bottom);
        vertices.push(left, bottom, r, g, b, a, left, top, right, bottom);
        vertices.push(right, bottom, r, g, b, a, left, top, right, bottom);
      } else {
        // Triangle 1: top-left, bottom-left, top-right
        vertices.push(left, top, r, g, b, a);
        vertices.push(left, bottom, r, g, b, a);
        vertices.push(right, top, r, g, b, a);

        // Triangle 2: top-right, bottom-left, bottom-right
        vertices.push(right, top, r, g, b, a);
        vertices.push(left, bottom, r, g, b, a);
        vertices.push(right, bottom, r, g, b, a);
      }
    }

    const floatsPerVertex = useRounded ? 10 : 6;
    const vertexData = new Float32Array(vertices);
    this.vertexCount = vertices.length / floatsPerVertex;

    if (this.vertexCount === 0) return;

    // Upload to GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

    // Setup VAO
    gl.bindVertexArray(this.vao);

    const stride = floatsPerVertex * Float32Array.BYTES_PER_ELEMENT;

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

    // a_barBounds (vec4) - only for rounded shader
    if (useRounded) {
      const boundsLoc = shader.attributes.get('a_barBounds');
      if (boundsLoc !== undefined) {
        gl.enableVertexAttribArray(boundsLoc);
        gl.vertexAttribPointer(boundsLoc, 4, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
      }
    }

    // Activate shader
    shader.use(gl);

    // Set uniforms
    shader.setUniform('u_resolution', [ctx.width, ctx.height]);
    shader.setUniform('u_pixelRatio', ctx.pixelRatio);
    if (useRounded) {
      shader.setUniform('u_cornerRadius', this.cornerRadius * this.pixelRatio);
    }

    // Enable scissor test to clip to plot area
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
   * Hit test to find bin at pixel coordinates
   */
  hitTest(
    pixelX: number,
    pixelY: number,
    ctx: RenderContext,
    state: ChartState
  ): HistogramBarData | null {
    const plotLeft = this.margins.left * this.pixelRatio;
    const plotTop = this.margins.top * this.pixelRatio;
    const plotRight = ctx.width - this.margins.right * this.pixelRatio;
    const plotBottom = ctx.height - this.margins.bottom * this.pixelRatio;
    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;

    const domain = state.domain;
    const domainWidth = domain.x[1] - domain.x[0];
    const domainHeight = domain.y[1] - domain.y[0];

    for (const bar of this.bars) {
      const normalizedX0 = (bar.x0 - domain.x[0]) / domainWidth;
      const normalizedX1 = (bar.x1 - domain.x[0]) / domainWidth;
      const normalizedY = (bar.count - domain.y[0]) / domainHeight;

      const left = plotLeft + normalizedX0 * plotWidth;
      const right = plotLeft + normalizedX1 * plotWidth;
      const top = plotBottom - normalizedY * plotHeight;
      const bottom = plotBottom;

      if (pixelX >= left && pixelX <= right && pixelY >= top && pixelY <= bottom) {
        return bar;
      }
    }

    return null;
  }

  /**
   * Clear all data
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
