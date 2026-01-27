/**
 * Heatmap render pass for drawing heatmap cells
 */

import type {
  RenderPass,
  RenderContext,
  ChartState,
  ShaderProgram,
  Margins,
} from '../../types/index.js';
import type { HeatmapCell } from '../../types/heatmap.js';
import { HEATMAP_CELL_SHADER } from '../../shaders/heatmap.js';

/**
 * Configuration for the heatmap render pass
 */
export interface HeatmapRenderPassConfig {
  /** WebGL2 rendering context */
  gl: WebGL2RenderingContext;
  /** Get shader program function */
  getShaderProgram: (id: string, source: { vertex: string; fragment: string }) => ShaderProgram;
  /** Chart margins */
  margins: Margins;
  /** Pixel ratio */
  pixelRatio: number;
  /** Hover brightness multiplier */
  hoverBrighten?: number;
}

/**
 * Render pass for drawing heatmap cells
 * Renders cells as triangles (2 per cell)
 */
export class HeatmapRenderPass implements RenderPass {
  readonly id = 'heatmap';
  readonly order = 10; // Render after grid
  enabled = true;

  private gl: WebGL2RenderingContext;
  private getShaderProgram: HeatmapRenderPassConfig['getShaderProgram'];
  private shader: ShaderProgram | null = null;

  // WebGL resources
  private vao: WebGLVertexArrayObject | null = null;
  private buffer: WebGLBuffer | null = null;
  private vertexCount: number = 0;

  // Config
  private margins: Margins;
  private pixelRatio: number;
  private hoverBrighten: number;

  // Data
  private cells: HeatmapCell[] = [];

  private initialized = false;

  constructor(config: HeatmapRenderPassConfig) {
    this.gl = config.gl;
    this.getShaderProgram = config.getShaderProgram;
    this.margins = config.margins;
    this.pixelRatio = config.pixelRatio;
    this.hoverBrighten = config.hoverBrighten ?? 1.2;
  }

  /**
   * Set margins
   */
  setMargins(margins: Margins): void {
    this.margins = margins;
  }

  /**
   * Set pixel ratio
   */
  setPixelRatio(pixelRatio: number): void {
    this.pixelRatio = pixelRatio;
  }

  /**
   * Update heatmap cell data
   */
  updateData(cells: HeatmapCell[]): void {
    this.cells = cells;
    this.uploadCellData();
  }

  /**
   * Get cells for hit testing
   */
  getCells(): HeatmapCell[] {
    return this.cells;
  }

  /**
   * Hit test to find cell at pixel coordinates
   */
  hitTest(pixelX: number, pixelY: number): HeatmapCell | null {
    for (const cell of this.cells) {
      if (
        pixelX >= cell.pixelX &&
        pixelX <= cell.pixelX + cell.pixelWidth &&
        pixelY >= cell.pixelY &&
        pixelY <= cell.pixelY + cell.pixelHeight
      ) {
        return cell;
      }
    }
    return null;
  }

  /**
   * Ensure WebGL resources are initialized
   */
  private ensureInitialized(): void {
    if (this.initialized) return;

    const { gl } = this;

    // Get shader
    this.shader = this.getShaderProgram('heatmap-cell', HEATMAP_CELL_SHADER);

    // Create VAO
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // Create buffer
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    // Setup vertex attributes: [x, y, r, g, b, a, hovered]
    const stride = 7 * 4; // 7 floats * 4 bytes

    // Position (vec2)
    const posLoc = gl.getAttribLocation(this.shader.program, 'a_position');
    if (posLoc >= 0) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
    }

    // Color (vec4)
    const colorLoc = gl.getAttribLocation(this.shader.program, 'a_color');
    if (colorLoc >= 0) {
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 2 * 4);
    }

    // Hovered (float)
    const hoveredLoc = gl.getAttribLocation(this.shader.program, 'a_hovered');
    if (hoveredLoc >= 0) {
      gl.enableVertexAttribArray(hoveredLoc);
      gl.vertexAttribPointer(hoveredLoc, 1, gl.FLOAT, false, stride, 6 * 4);
    }

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.initialized = true;
  }

  /**
   * Upload cell data to GPU
   */
  private uploadCellData(): void {
    this.ensureInitialized();

    const { gl } = this;
    const vertices: number[] = [];

    for (const cell of this.cells) {
      const { pixelX, pixelY, pixelWidth, pixelHeight, color, hovered } = cell;
      const [r, g, b, a] = color;
      const h = hovered ? 1.0 : 0.0;

      const left = pixelX;
      const right = pixelX + pixelWidth;
      const top = pixelY;
      const bottom = pixelY + pixelHeight;

      // Two triangles forming a rectangle (6 vertices)
      // Triangle 1: top-left, bottom-left, top-right
      vertices.push(left, top, r, g, b, a, h);
      vertices.push(left, bottom, r, g, b, a, h);
      vertices.push(right, top, r, g, b, a, h);

      // Triangle 2: top-right, bottom-left, bottom-right
      vertices.push(right, top, r, g, b, a, h);
      vertices.push(left, bottom, r, g, b, a, h);
      vertices.push(right, bottom, r, g, b, a, h);
    }

    const vertexData = new Float32Array(vertices);
    this.vertexCount = vertices.length / 7;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Render the heatmap cells
   */
  render(ctx: RenderContext, _state: ChartState): void {
    if (!this.enabled || this.vertexCount === 0 || !this.shader) return;

    this.ensureInitialized();

    const { gl } = this;
    const { width, height } = ctx;

    // Calculate plot area
    const plotLeft = this.margins.left * this.pixelRatio;
    const plotTop = this.margins.top * this.pixelRatio;
    const plotWidth = width - (this.margins.left + this.margins.right) * this.pixelRatio;
    const plotHeight = height - (this.margins.top + this.margins.bottom) * this.pixelRatio;

    // Use shader
    gl.useProgram(this.shader.program);

    // Set uniforms
    const resolutionLoc = gl.getUniformLocation(this.shader.program, 'u_resolution');
    gl.uniform2f(resolutionLoc, width, height);

    const pixelRatioLoc = gl.getUniformLocation(this.shader.program, 'u_pixelRatio');
    gl.uniform1f(pixelRatioLoc, this.pixelRatio);

    const hoverBrightenLoc = gl.getUniformLocation(this.shader.program, 'u_hoverBrighten');
    gl.uniform1f(hoverBrightenLoc, this.hoverBrighten);

    // Bind VAO
    gl.bindVertexArray(this.vao);

    // Enable scissor test to clip to plot area
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(plotLeft, height - plotTop - plotHeight, plotWidth, plotHeight);

    // Draw cells
    gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

    // Cleanup
    gl.disable(gl.SCISSOR_TEST);
    gl.bindVertexArray(null);
  }

  /**
   * Dispose WebGL resources
   */
  dispose(): void {
    const { gl } = this;

    if (this.buffer) {
      gl.deleteBuffer(this.buffer);
      this.buffer = null;
    }

    if (this.vao) {
      gl.deleteVertexArray(this.vao);
      this.vao = null;
    }

    this.initialized = false;
  }
}
