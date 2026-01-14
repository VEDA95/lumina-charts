/**
 * Render pass for histogram overlay lines (KDE, cumulative distribution)
 */

import type {
  RenderPass,
  RenderContext,
  ChartState,
  ShaderProgram,
  Margins,
  RGBAColor,
} from '../../types/index.js';
import { LINE_SHADER } from '../../shaders/line.js';
import type { CurvePoint } from './statistics.js';

/**
 * Configuration for the histogram line render pass
 */
export interface HistogramLinePassConfig {
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
 * Line data for an overlay curve
 */
export interface OverlayCurve {
  /** Curve points */
  points: CurvePoint[];
  /** Line color */
  color: RGBAColor;
  /** Line width in pixels */
  lineWidth: number;
  /** Use secondary Y axis (for cumulative 0-1 scale) */
  useSecondaryY?: boolean;
}

/**
 * Render pass for drawing overlay lines on histograms
 */
export class HistogramLinePass implements RenderPass {
  readonly id = 'histogram-line';
  readonly order = 15; // Render after histogram bars
  enabled = true;

  private gl: WebGL2RenderingContext;
  private getShaderProgram: HistogramLinePassConfig['getShaderProgram'];
  private shader: ShaderProgram | null = null;
  private margins: Margins;
  private pixelRatio: number;

  // GPU resources
  private vao: WebGLVertexArrayObject | null = null;
  private buffer: WebGLBuffer | null = null;

  // Curve data
  private curves: OverlayCurve[] = [];

  constructor(config: HistogramLinePassConfig) {
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

    this.shader = this.getShaderProgram('histogram-line', LINE_SHADER);

    // Create VAO
    this.vao = gl.createVertexArray();
    if (!this.vao) {
      throw new Error('Failed to create VAO for histogram line pass');
    }

    // Create buffer
    this.buffer = gl.createBuffer();
    if (!this.buffer) {
      throw new Error('Failed to create buffer for histogram line pass');
    }
  }

  /**
   * Update curve data
   */
  updateData(curves: OverlayCurve[]): void {
    this.curves = curves;
  }

  /**
   * Clear all curves
   */
  clear(): void {
    this.curves = [];
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
   * Render the overlay lines
   */
  render(ctx: RenderContext, state: ChartState): void {
    if (this.curves.length === 0) return;

    this.ensureInitialized();

    const { gl } = this;
    const shader = this.shader!;

    // Calculate plot area for clipping
    const plotLeft = this.margins.left * this.pixelRatio;
    const plotTop = this.margins.top * this.pixelRatio;
    const plotRight = ctx.width - this.margins.right * this.pixelRatio;
    const plotBottom = ctx.height - this.margins.bottom * this.pixelRatio;
    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;

    // Activate shader
    shader.use(gl);

    // Set common uniforms
    shader.setUniform('u_resolution', [ctx.width, ctx.height]);
    shader.setUniform('u_pixelRatio', ctx.pixelRatio);
    shader.setUniform('u_domainMin', [state.domain.x[0], state.domain.y[0]]);
    shader.setUniform('u_domainMax', [state.domain.x[1], state.domain.y[1]]);
    shader.setUniform('u_plotBounds', [plotLeft, plotTop, plotRight, plotBottom]);

    // Enable scissor test
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(plotLeft, ctx.height - plotTop - plotHeight, plotWidth, plotHeight);

    // Render each curve
    for (const curve of this.curves) {
      if (curve.points.length < 2) continue;

      // Build vertex data for this curve
      const vertices = this.buildLineVertices(curve, state);
      if (vertices.length === 0) continue;

      const vertexData = new Float32Array(vertices);

      // Upload to GPU
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

      // Setup VAO
      gl.bindVertexArray(this.vao);

      // Stride: position(2) + nextPosition(2) + direction(1) + color(4) + lineWidth(1) = 10 floats
      const stride = 10 * Float32Array.BYTES_PER_ELEMENT;

      // a_position (vec2)
      const posLoc = shader.attributes.get('a_position');
      if (posLoc !== undefined) {
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
      }

      // a_nextPosition (vec2)
      const nextPosLoc = shader.attributes.get('a_nextPosition');
      if (nextPosLoc !== undefined) {
        gl.enableVertexAttribArray(nextPosLoc);
        gl.vertexAttribPointer(nextPosLoc, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
      }

      // a_direction (float)
      const dirLoc = shader.attributes.get('a_direction');
      if (dirLoc !== undefined) {
        gl.enableVertexAttribArray(dirLoc);
        gl.vertexAttribPointer(dirLoc, 1, gl.FLOAT, false, stride, 4 * Float32Array.BYTES_PER_ELEMENT);
      }

      // a_color (vec4)
      const colorLoc = shader.attributes.get('a_color');
      if (colorLoc !== undefined) {
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 5 * Float32Array.BYTES_PER_ELEMENT);
      }

      // a_lineWidth (float)
      const widthLoc = shader.attributes.get('a_lineWidth');
      if (widthLoc !== undefined) {
        gl.enableVertexAttribArray(widthLoc);
        gl.vertexAttribPointer(widthLoc, 1, gl.FLOAT, false, stride, 9 * Float32Array.BYTES_PER_ELEMENT);
      }

      // Draw triangles
      const vertexCount = vertices.length / 10;
      gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    }

    // Cleanup
    gl.disable(gl.SCISSOR_TEST);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Build line vertices for a curve
   * Each segment becomes a quad (2 triangles, 6 vertices)
   */
  private buildLineVertices(curve: OverlayCurve, state: ChartState): number[] {
    const vertices: number[] = [];
    const { points, color, lineWidth, useSecondaryY } = curve;
    const [r, g, b, a] = color;

    // For secondary Y axis (cumulative), map 0-1 to the full domain height
    const yMin = state.domain.y[0];
    const yMax = state.domain.y[1];

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];

      // Transform Y if using secondary axis (0-1 cumulative)
      let y0 = p0.y;
      let y1 = p1.y;

      if (useSecondaryY) {
        // Map 0-1 to the Y domain
        y0 = yMin + y0 * (yMax - yMin);
        y1 = yMin + y1 * (yMax - yMin);
      }

      // For each segment, we need 6 vertices (2 triangles forming a quad)
      // The shader offsets a_position perpendicular to the line direction
      // For p1 vertices, we reverse nextPosition and flip direction to compensate

      // Vertex format: position(2), nextPosition(2), direction(1), color(4), lineWidth(1)

      // Triangle 1: p0-left, p0-right, p1-left
      vertices.push(p0.x, y0, p1.x, y1, -1, r, g, b, a, lineWidth);  // p0-left
      vertices.push(p0.x, y0, p1.x, y1, 1, r, g, b, a, lineWidth);   // p0-right
      vertices.push(p1.x, y1, p0.x, y0, 1, r, g, b, a, lineWidth);   // p1-left (direction flipped)

      // Triangle 2: p1-left, p0-right, p1-right
      vertices.push(p1.x, y1, p0.x, y0, 1, r, g, b, a, lineWidth);   // p1-left (direction flipped)
      vertices.push(p0.x, y0, p1.x, y1, 1, r, g, b, a, lineWidth);   // p0-right
      vertices.push(p1.x, y1, p0.x, y0, -1, r, g, b, a, lineWidth);  // p1-right (direction flipped)
    }

    return vertices;
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
    this.curves = [];
  }
}
