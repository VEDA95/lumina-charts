/**
 * Grid render pass for drawing background grid lines
 */

import type {
  RenderPass,
  RenderContext,
  ChartState,
  ShaderProgram,
  Margins,
  RGBAColor,
} from '../types/index.js';
import { GRID_SHADER } from '../shaders/grid.js';

/**
 * Configuration for the grid render pass
 */
export interface GridRenderPassConfig {
  /** WebGL2 rendering context */
  gl: WebGL2RenderingContext;
  /** Get shader program function */
  getShaderProgram: (id: string, source: { vertex: string; fragment: string }) => ShaderProgram;
  /** Chart margins */
  margins: Margins;
  /** Pixel ratio */
  pixelRatio: number;
  /** Grid line color */
  color?: RGBAColor;
  /** Show horizontal grid lines */
  showHorizontal?: boolean;
  /** Show vertical grid lines */
  showVertical?: boolean;
}

/**
 * Render pass for drawing grid lines
 */
export class GridRenderPass implements RenderPass {
  readonly id = 'grid';
  readonly order = 0; // Render first, behind data
  enabled = true;

  private gl: WebGL2RenderingContext;
  private getShaderProgram: GridRenderPassConfig['getShaderProgram'];
  private shader: ShaderProgram | null = null;
  private margins: Margins;
  private pixelRatio: number;

  // Configuration
  private color: RGBAColor;
  private showHorizontal: boolean;
  private showVertical: boolean;

  // GPU resources
  private vao: WebGLVertexArrayObject | null = null;
  private buffer: WebGLBuffer | null = null;
  private vertexCount: number = 0;

  // Tick positions (set externally from axis renderer)
  // Stored as numbers (timestamps for Date values)
  private xTicks: number[] = [];
  private yTicks: number[] = [];

  constructor(config: GridRenderPassConfig) {
    this.gl = config.gl;
    this.getShaderProgram = config.getShaderProgram;
    this.margins = config.margins;
    this.pixelRatio = config.pixelRatio;
    this.color = config.color ?? [0.9, 0.9, 0.9, 1.0]; // Light gray
    this.showHorizontal = config.showHorizontal ?? true;
    this.showVertical = config.showVertical ?? true;
  }

  /**
   * Initialize shader and GPU resources
   */
  private ensureInitialized(): void {
    if (this.shader) return;

    const { gl } = this;

    // Get or create shader
    this.shader = this.getShaderProgram('grid', GRID_SHADER);

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
  }

  /**
   * Set tick positions from axis renderer
   * Accepts numbers, strings, or Date values (converted to timestamps for positioning)
   */
  setTicks(xTicks: (number | string | Date)[], yTicks: (number | string | Date)[]): void {
    // Convert ticks to numbers for positioning calculations
    this.xTicks = xTicks.map((tick) => {
      if (tick instanceof Date) return tick.getTime();
      if (typeof tick === 'number') return tick;
      return 0; // Skip string ticks (band scale) - they're handled differently
    });
    this.yTicks = yTicks.map((tick) => {
      if (tick instanceof Date) return tick.getTime();
      if (typeof tick === 'number') return tick;
      return 0;
    });
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
   * Update grid color
   */
  setColor(color: RGBAColor): void {
    this.color = color;
  }

  /**
   * Update visibility options
   */
  setVisibility(horizontal: boolean, vertical: boolean): void {
    this.showHorizontal = horizontal;
    this.showVertical = vertical;
  }

  /**
   * Build vertex data for grid lines
   */
  private buildVertexData(ctx: RenderContext, state: ChartState): Float32Array {
    const vertices: number[] = [];

    // Calculate plot area bounds in pixels
    const plotLeft = this.margins.left * this.pixelRatio;
    const plotTop = this.margins.top * this.pixelRatio;
    const plotRight = ctx.width - this.margins.right * this.pixelRatio;
    const plotBottom = ctx.height - this.margins.bottom * this.pixelRatio;
    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;

    const domainWidth = state.domain.x[1] - state.domain.x[0];
    const domainHeight = state.domain.y[1] - state.domain.y[0];

    const [r, g, b, a] = this.color;

    // Vertical grid lines (at x tick positions)
    if (this.showVertical) {
      for (const tick of this.xTicks) {
        // Convert data coordinate to pixel
        const normalizedX = (tick - state.domain.x[0]) / domainWidth;
        const pixelX = plotLeft + normalizedX * plotWidth;

        // Skip if outside plot area
        if (pixelX < plotLeft || pixelX > plotRight) continue;

        // Line from top to bottom
        // Vertex format: [x, y, r, g, b, a]
        vertices.push(pixelX, plotTop, r, g, b, a);
        vertices.push(pixelX, plotBottom, r, g, b, a);
      }
    }

    // Horizontal grid lines (at y tick positions)
    if (this.showHorizontal) {
      for (const tick of this.yTicks) {
        // Convert data coordinate to pixel (y is flipped)
        const normalizedY = (tick - state.domain.y[0]) / domainHeight;
        const pixelY = plotBottom - normalizedY * plotHeight;

        // Skip if outside plot area
        if (pixelY < plotTop || pixelY > plotBottom) continue;

        // Line from left to right
        vertices.push(plotLeft, pixelY, r, g, b, a);
        vertices.push(plotRight, pixelY, r, g, b, a);
      }
    }

    return new Float32Array(vertices);
  }

  /**
   * Render the grid
   */
  render(ctx: RenderContext, state: ChartState): void {
    if (!this.showHorizontal && !this.showVertical) return;
    if (this.xTicks.length === 0 && this.yTicks.length === 0) return;

    this.ensureInitialized();

    const { gl } = this;
    const shader = this.shader!;

    // Build vertex data
    const vertexData = this.buildVertexData(ctx, state);
    this.vertexCount = vertexData.length / 6; // 6 floats per vertex

    if (this.vertexCount === 0) return;

    // Upload data to buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

    // Setup VAO
    gl.bindVertexArray(this.vao);

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

    // Set common uniforms (needed for pixelToClip)
    shader.setUniform('u_resolution', [ctx.width, ctx.height]);
    shader.setUniform('u_pixelRatio', ctx.pixelRatio);

    // Draw lines
    gl.drawArrays(gl.LINES, 0, this.vertexCount);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
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
  }
}
