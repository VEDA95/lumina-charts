/**
 * Boxplot render pass for drawing boxplot chart elements
 */

import type {
  RenderPass,
  RenderContext,
  ChartState,
  ShaderProgram,
  Margins,
} from '../../types/index.js';
import type { Boxplot, BoxplotOrientation } from '../../types/boxplot.js';
import {
  BOXPLOT_BOX_SHADER,
  BOXPLOT_LINE_SHADER,
  BOXPLOT_OUTLIER_SHADER,
} from '../../shaders/boxplot.js';

/**
 * Configuration for the boxplot render pass
 */
export interface BoxplotRenderPassConfig {
  /** WebGL2 rendering context */
  gl: WebGL2RenderingContext;
  /** Get shader program function */
  getShaderProgram: (id: string, source: { vertex: string; fragment: string }) => ShaderProgram;
  /** Chart margins */
  margins: Margins;
  /** Pixel ratio */
  pixelRatio: number;
  /** Chart orientation */
  orientation?: BoxplotOrientation;
  /** Hover brightness multiplier */
  hoverBrighten?: number;
  /** Whisker line width in pixels */
  whiskerWidth?: number;
  /** Outlier point size in pixels */
  outlierSize?: number;
}

/**
 * Render pass for drawing boxplot charts
 * Renders boxes as triangles, whiskers/medians as lines, outliers as diamonds
 */
export class BoxplotRenderPass implements RenderPass {
  readonly id = 'boxplot';
  readonly order = 10; // Render after grid
  enabled = true;

  private gl: WebGL2RenderingContext;
  private getShaderProgram: BoxplotRenderPassConfig['getShaderProgram'];
  private boxShader: ShaderProgram | null = null;
  private lineShader: ShaderProgram | null = null;
  private outlierShader: ShaderProgram | null = null;
  private margins: Margins;
  private pixelRatio: number;
  private orientation: BoxplotOrientation;
  private hoverBrighten: number;
  private whiskerWidth: number;
  private outlierSize: number;

  // GPU resources for box bodies
  private boxVao: WebGLVertexArrayObject | null = null;
  private boxBuffer: WebGLBuffer | null = null;
  private boxVertexCount: number = 0;

  // GPU resources for whiskers
  private whiskerVao: WebGLVertexArrayObject | null = null;
  private whiskerBuffer: WebGLBuffer | null = null;
  private whiskerVertexCount: number = 0;

  // GPU resources for median lines
  private medianVao: WebGLVertexArrayObject | null = null;
  private medianBuffer: WebGLBuffer | null = null;
  private medianVertexCount: number = 0;

  // GPU resources for outliers
  private outlierVao: WebGLVertexArrayObject | null = null;
  private outlierBuffer: WebGLBuffer | null = null;
  private outlierVertexCount: number = 0;

  // Boxplot data for hit testing
  private boxplots: Boxplot[] = [];

  // Domain and plot area for rendering
  private domain: { x: [number, number]; y: [number, number] } = { x: [0, 1], y: [0, 1] };
  private plotArea: { x: number; y: number; width: number; height: number } = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };

  constructor(config: BoxplotRenderPassConfig) {
    this.gl = config.gl;
    this.getShaderProgram = config.getShaderProgram;
    this.margins = config.margins;
    this.pixelRatio = config.pixelRatio;
    this.orientation = config.orientation ?? 'vertical';
    this.hoverBrighten = config.hoverBrighten ?? 1.2;
    this.whiskerWidth = config.whiskerWidth ?? 2; // Increase default for better visibility
    this.outlierSize = config.outlierSize ?? 4;
  }

  /**
   * Initialize shaders and GPU resources
   */
  private ensureInitialized(): void {
    if (this.boxShader && this.lineShader && this.outlierShader) return;

    const { gl } = this;

    // Get or create shaders
    this.boxShader = this.getShaderProgram('boxplot-box', BOXPLOT_BOX_SHADER);
    this.lineShader = this.getShaderProgram('boxplot-line', BOXPLOT_LINE_SHADER);
    this.outlierShader = this.getShaderProgram('boxplot-outlier', BOXPLOT_OUTLIER_SHADER);

    // Create VAO and buffer for boxes
    this.boxVao = gl.createVertexArray();
    this.boxBuffer = gl.createBuffer();

    // Create VAO and buffer for whiskers
    this.whiskerVao = gl.createVertexArray();
    this.whiskerBuffer = gl.createBuffer();

    // Create VAO and buffer for medians
    this.medianVao = gl.createVertexArray();
    this.medianBuffer = gl.createBuffer();

    // Create VAO and buffer for outliers
    this.outlierVao = gl.createVertexArray();
    this.outlierBuffer = gl.createBuffer();
  }

  /**
   * Set chart orientation
   */
  setOrientation(orientation: BoxplotOrientation): void {
    this.orientation = orientation;
  }

  /**
   * Set domain for coordinate transformation
   */
  setDomain(domain: { x: [number, number]; y: [number, number] }): void {
    this.domain = domain;
  }

  /**
   * Set plot area for coordinate transformation
   */
  setPlotArea(plotArea: { x: number; y: number; width: number; height: number }): void {
    this.plotArea = plotArea;
  }

  /**
   * Update boxplot data
   */
  updateData(boxplots: Boxplot[]): void {
    this.boxplots = boxplots;
    this.uploadBoxplotData();
  }

  /**
   * Transform a value to pixel coordinates on the value axis
   */
  private valueToPixel(value: number): number {
    if (this.orientation === 'vertical') {
      // Vertical: values are on Y axis
      const { y: yDomain } = this.domain;
      const normalized = (value - yDomain[0]) / (yDomain[1] - yDomain[0]);
      // Y axis is inverted in screen space
      return this.plotArea.y + this.plotArea.height - normalized * this.plotArea.height;
    } else {
      // Horizontal: values are on X axis
      const { x: xDomain } = this.domain;
      const normalized = (value - xDomain[0]) / (xDomain[1] - xDomain[0]);
      return this.plotArea.x + normalized * this.plotArea.width;
    }
  }

  /**
   * Upload boxplot data to GPU
   */
  private uploadBoxplotData(): void {
    this.ensureInitialized();

    const { gl } = this;
    const boxVertices: number[] = [];
    const whiskerVertices: number[] = [];
    const medianVertices: number[] = [];
    const outlierVertices: number[] = [];

    for (const box of this.boxplots) {
      const pos = box.position;
      const halfWidth = box.width / 2;
      const hovered = box.hovered ? 1.0 : 0.0;

      const minPixel = this.valueToPixel(box.min);
      const q1Pixel = this.valueToPixel(box.q1);
      const medianPixel = this.valueToPixel(box.median);
      const q3Pixel = this.valueToPixel(box.q3);
      const maxPixel = this.valueToPixel(box.max);

      const [br, bg, bb, ba] = box.boxColor;
      const [mr, mg, mb, ma] = box.medianColor;
      const [wr, wg, wb, wa] = box.whiskerColor;
      const [or, og, ob, oa] = box.outlierColor;

      // Line thickness for whiskers and median (in pixels)
      const lineThickness = this.whiskerWidth * this.pixelRatio;
      const halfThickness = lineThickness / 2;

      if (this.orientation === 'vertical') {
        // Vertical: X is category position, Y is value
        const left = pos - halfWidth;
        const right = pos + halfWidth;
        const top = Math.min(q1Pixel, q3Pixel);
        const bottom = Math.max(q1Pixel, q3Pixel);

        // Box body (2 triangles = 6 vertices)
        boxVertices.push(left, top, br, bg, bb, ba, hovered);
        boxVertices.push(left, bottom, br, bg, bb, ba, hovered);
        boxVertices.push(right, top, br, bg, bb, ba, hovered);
        boxVertices.push(right, top, br, bg, bb, ba, hovered);
        boxVertices.push(left, bottom, br, bg, bb, ba, hovered);
        boxVertices.push(right, bottom, br, bg, bb, ba, hovered);

        // Whiskers as rectangles (2 triangles each = 6 vertices)
        // Lower whisker: min to Q1 (vertical rectangle)
        whiskerVertices.push(pos - halfThickness, minPixel, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos - halfThickness, q1Pixel, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos + halfThickness, minPixel, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos + halfThickness, minPixel, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos - halfThickness, q1Pixel, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos + halfThickness, q1Pixel, wr, wg, wb, wa, hovered);

        // Upper whisker: Q3 to max (vertical rectangle)
        whiskerVertices.push(pos - halfThickness, q3Pixel, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos - halfThickness, maxPixel, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos + halfThickness, q3Pixel, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos + halfThickness, q3Pixel, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos - halfThickness, maxPixel, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos + halfThickness, maxPixel, wr, wg, wb, wa, hovered);

        // Whisker caps as rectangles (horizontal)
        const capWidth = halfWidth * 0.5;
        // Min cap
        whiskerVertices.push(pos - capWidth, minPixel - halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos - capWidth, minPixel + halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos + capWidth, minPixel - halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos + capWidth, minPixel - halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos - capWidth, minPixel + halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos + capWidth, minPixel + halfThickness, wr, wg, wb, wa, hovered);
        // Max cap
        whiskerVertices.push(pos - capWidth, maxPixel - halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos - capWidth, maxPixel + halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos + capWidth, maxPixel - halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos + capWidth, maxPixel - halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos - capWidth, maxPixel + halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(pos + capWidth, maxPixel + halfThickness, wr, wg, wb, wa, hovered);

        // Median line as rectangle (horizontal)
        medianVertices.push(left, medianPixel - halfThickness, mr, mg, mb, ma, hovered);
        medianVertices.push(left, medianPixel + halfThickness, mr, mg, mb, ma, hovered);
        medianVertices.push(right, medianPixel - halfThickness, mr, mg, mb, ma, hovered);
        medianVertices.push(right, medianPixel - halfThickness, mr, mg, mb, ma, hovered);
        medianVertices.push(left, medianPixel + halfThickness, mr, mg, mb, ma, hovered);
        medianVertices.push(right, medianPixel + halfThickness, mr, mg, mb, ma, hovered);

        // Outliers (diamonds)
        for (const outlier of box.outliers) {
          const oy = this.valueToPixel(outlier);
          const size = this.outlierSize;
          // Diamond shape: 2 triangles
          // Top triangle
          outlierVertices.push(pos, oy - size, or, og, ob, oa, hovered);
          outlierVertices.push(pos - size, oy, or, og, ob, oa, hovered);
          outlierVertices.push(pos + size, oy, or, og, ob, oa, hovered);
          // Bottom triangle
          outlierVertices.push(pos, oy + size, or, og, ob, oa, hovered);
          outlierVertices.push(pos - size, oy, or, og, ob, oa, hovered);
          outlierVertices.push(pos + size, oy, or, og, ob, oa, hovered);
        }
      } else {
        // Horizontal: Y is category position, X is value
        const top = pos - halfWidth;
        const bottom = pos + halfWidth;
        const left = Math.min(q1Pixel, q3Pixel);
        const right = Math.max(q1Pixel, q3Pixel);

        // Box body
        boxVertices.push(left, top, br, bg, bb, ba, hovered);
        boxVertices.push(left, bottom, br, bg, bb, ba, hovered);
        boxVertices.push(right, top, br, bg, bb, ba, hovered);
        boxVertices.push(right, top, br, bg, bb, ba, hovered);
        boxVertices.push(left, bottom, br, bg, bb, ba, hovered);
        boxVertices.push(right, bottom, br, bg, bb, ba, hovered);

        // Whiskers as rectangles (horizontal)
        // Left whisker: min to Q1
        whiskerVertices.push(minPixel, pos - halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(minPixel, pos + halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(q1Pixel, pos - halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(q1Pixel, pos - halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(minPixel, pos + halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(q1Pixel, pos + halfThickness, wr, wg, wb, wa, hovered);

        // Right whisker: Q3 to max
        whiskerVertices.push(q3Pixel, pos - halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(q3Pixel, pos + halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(maxPixel, pos - halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(maxPixel, pos - halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(q3Pixel, pos + halfThickness, wr, wg, wb, wa, hovered);
        whiskerVertices.push(maxPixel, pos + halfThickness, wr, wg, wb, wa, hovered);

        // Whisker caps as rectangles (vertical)
        const capWidth = halfWidth * 0.5;
        // Min cap
        whiskerVertices.push(minPixel - halfThickness, pos - capWidth, wr, wg, wb, wa, hovered);
        whiskerVertices.push(minPixel + halfThickness, pos - capWidth, wr, wg, wb, wa, hovered);
        whiskerVertices.push(minPixel - halfThickness, pos + capWidth, wr, wg, wb, wa, hovered);
        whiskerVertices.push(minPixel - halfThickness, pos + capWidth, wr, wg, wb, wa, hovered);
        whiskerVertices.push(minPixel + halfThickness, pos - capWidth, wr, wg, wb, wa, hovered);
        whiskerVertices.push(minPixel + halfThickness, pos + capWidth, wr, wg, wb, wa, hovered);
        // Max cap
        whiskerVertices.push(maxPixel - halfThickness, pos - capWidth, wr, wg, wb, wa, hovered);
        whiskerVertices.push(maxPixel + halfThickness, pos - capWidth, wr, wg, wb, wa, hovered);
        whiskerVertices.push(maxPixel - halfThickness, pos + capWidth, wr, wg, wb, wa, hovered);
        whiskerVertices.push(maxPixel - halfThickness, pos + capWidth, wr, wg, wb, wa, hovered);
        whiskerVertices.push(maxPixel + halfThickness, pos - capWidth, wr, wg, wb, wa, hovered);
        whiskerVertices.push(maxPixel + halfThickness, pos + capWidth, wr, wg, wb, wa, hovered);

        // Median line as rectangle (vertical)
        medianVertices.push(medianPixel - halfThickness, top, mr, mg, mb, ma, hovered);
        medianVertices.push(medianPixel + halfThickness, top, mr, mg, mb, ma, hovered);
        medianVertices.push(medianPixel - halfThickness, bottom, mr, mg, mb, ma, hovered);
        medianVertices.push(medianPixel - halfThickness, bottom, mr, mg, mb, ma, hovered);
        medianVertices.push(medianPixel + halfThickness, top, mr, mg, mb, ma, hovered);
        medianVertices.push(medianPixel + halfThickness, bottom, mr, mg, mb, ma, hovered);

        // Outliers (diamonds)
        for (const outlier of box.outliers) {
          const ox = this.valueToPixel(outlier);
          const size = this.outlierSize;
          // Diamond shape rotated for horizontal
          outlierVertices.push(ox - size, pos, or, og, ob, oa, hovered);
          outlierVertices.push(ox, pos - size, or, og, ob, oa, hovered);
          outlierVertices.push(ox, pos + size, or, og, ob, oa, hovered);
          outlierVertices.push(ox + size, pos, or, og, ob, oa, hovered);
          outlierVertices.push(ox, pos - size, or, og, ob, oa, hovered);
          outlierVertices.push(ox, pos + size, or, og, ob, oa, hovered);
        }
      }
    }

    // Upload box vertices
    const boxData = new Float32Array(boxVertices);
    this.boxVertexCount = boxVertices.length / 7;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.boxBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, boxData, gl.DYNAMIC_DRAW);

    // Upload whisker vertices
    const whiskerData = new Float32Array(whiskerVertices);
    this.whiskerVertexCount = whiskerVertices.length / 7;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.whiskerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, whiskerData, gl.DYNAMIC_DRAW);

    // Upload median vertices
    const medianData = new Float32Array(medianVertices);
    this.medianVertexCount = medianVertices.length / 7;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.medianBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, medianData, gl.DYNAMIC_DRAW);

    // Upload outlier vertices
    const outlierData = new Float32Array(outlierVertices);
    this.outlierVertexCount = outlierVertices.length / 7;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.outlierBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, outlierData, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Get boxplots for hit testing
   */
  getBoxplots(): Boxplot[] {
    return this.boxplots;
  }

  /**
   * Hit test to find boxplot at pixel coordinates
   */
  hitTest(pixelX: number, pixelY: number): Boxplot | null {
    for (const box of this.boxplots) {
      const pos = box.position;
      const halfWidth = box.width / 2;

      const minPixel = this.valueToPixel(box.min);
      const maxPixel = this.valueToPixel(box.max);

      if (this.orientation === 'vertical') {
        // Check X bounds (box width)
        if (pixelX < pos - halfWidth || pixelX > pos + halfWidth) {
          continue;
        }

        // Check Y bounds (min to max range)
        const minY = Math.min(minPixel, maxPixel);
        const maxY = Math.max(minPixel, maxPixel);
        if (pixelY >= minY && pixelY <= maxY) {
          return box;
        }
      } else {
        // Horizontal: check Y bounds for box width, X for value range
        if (pixelY < pos - halfWidth || pixelY > pos + halfWidth) {
          continue;
        }

        const minX = Math.min(minPixel, maxPixel);
        const maxX = Math.max(minPixel, maxPixel);
        if (pixelX >= minX && pixelX <= maxX) {
          return box;
        }
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
   * Setup vertex attributes for a shader
   */
  private setupVertexAttributes(shader: ShaderProgram, buffer: WebGLBuffer): void {
    const { gl } = this;
    const stride = 7 * Float32Array.BYTES_PER_ELEMENT;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

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
      gl.vertexAttribPointer(
        colorLoc,
        4,
        gl.FLOAT,
        false,
        stride,
        2 * Float32Array.BYTES_PER_ELEMENT
      );
    }

    // a_hovered (float)
    const hoveredLoc = shader.attributes.get('a_hovered');
    if (hoveredLoc !== undefined) {
      gl.enableVertexAttribArray(hoveredLoc);
      gl.vertexAttribPointer(
        hoveredLoc,
        1,
        gl.FLOAT,
        false,
        stride,
        6 * Float32Array.BYTES_PER_ELEMENT
      );
    }
  }

  /**
   * Render the boxplots
   */
  render(ctx: RenderContext, _state: ChartState): void {
    const hasData =
      this.boxVertexCount > 0 ||
      this.whiskerVertexCount > 0 ||
      this.medianVertexCount > 0 ||
      this.outlierVertexCount > 0;
    if (!hasData) return;

    this.ensureInitialized();

    const { gl } = this;

    // Enable scissor test to clip to plot area
    const plotLeft = this.margins.left * this.pixelRatio;
    const plotTop = this.margins.top * this.pixelRatio;
    const plotWidth = ctx.width - (this.margins.left + this.margins.right) * this.pixelRatio;
    const plotHeight = ctx.height - (this.margins.top + this.margins.bottom) * this.pixelRatio;

    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(plotLeft, ctx.height - plotTop - plotHeight, plotWidth, plotHeight);

    // Draw whiskers first (behind boxes) - using triangles for thick lines
    if (this.whiskerVertexCount > 0) {
      const boxShader = this.boxShader!; // Use box shader since whiskers are now triangles

      gl.bindVertexArray(this.whiskerVao);
      this.setupVertexAttributes(boxShader, this.whiskerBuffer!);

      boxShader.use(gl);
      boxShader.setUniform('u_resolution', [ctx.width, ctx.height]);
      boxShader.setUniform('u_pixelRatio', ctx.pixelRatio);
      boxShader.setUniform('u_hoverBrighten', this.hoverBrighten);

      gl.drawArrays(gl.TRIANGLES, 0, this.whiskerVertexCount);
    }

    // Draw box bodies
    if (this.boxVertexCount > 0) {
      const boxShader = this.boxShader!;

      gl.bindVertexArray(this.boxVao);
      this.setupVertexAttributes(boxShader, this.boxBuffer!);

      boxShader.use(gl);
      boxShader.setUniform('u_resolution', [ctx.width, ctx.height]);
      boxShader.setUniform('u_pixelRatio', ctx.pixelRatio);
      boxShader.setUniform('u_hoverBrighten', this.hoverBrighten);

      gl.drawArrays(gl.TRIANGLES, 0, this.boxVertexCount);
    }

    // Draw median lines (on top of boxes) - using triangles for thick lines
    if (this.medianVertexCount > 0) {
      const boxShader = this.boxShader!; // Use box shader since medians are now triangles

      gl.bindVertexArray(this.medianVao);
      this.setupVertexAttributes(boxShader, this.medianBuffer!);

      boxShader.use(gl);
      boxShader.setUniform('u_resolution', [ctx.width, ctx.height]);
      boxShader.setUniform('u_pixelRatio', ctx.pixelRatio);
      boxShader.setUniform('u_hoverBrighten', this.hoverBrighten);

      gl.drawArrays(gl.TRIANGLES, 0, this.medianVertexCount);
    }

    // Draw outliers (on top of everything)
    if (this.outlierVertexCount > 0) {
      const outlierShader = this.outlierShader!;

      gl.bindVertexArray(this.outlierVao);
      this.setupVertexAttributes(outlierShader, this.outlierBuffer!);

      outlierShader.use(gl);
      outlierShader.setUniform('u_resolution', [ctx.width, ctx.height]);
      outlierShader.setUniform('u_pixelRatio', ctx.pixelRatio);
      outlierShader.setUniform('u_hoverBrighten', this.hoverBrighten);

      gl.drawArrays(gl.TRIANGLES, 0, this.outlierVertexCount);
    }

    // Disable scissor test
    gl.disable(gl.SCISSOR_TEST);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Clear all boxplot data
   */
  clear(): void {
    this.boxplots = [];
    this.boxVertexCount = 0;
    this.whiskerVertexCount = 0;
    this.medianVertexCount = 0;
    this.outlierVertexCount = 0;
  }

  /**
   * Clean up GPU resources
   */
  dispose(): void {
    const { gl } = this;

    if (this.boxVao) {
      gl.deleteVertexArray(this.boxVao);
      this.boxVao = null;
    }
    if (this.boxBuffer) {
      gl.deleteBuffer(this.boxBuffer);
      this.boxBuffer = null;
    }
    if (this.whiskerVao) {
      gl.deleteVertexArray(this.whiskerVao);
      this.whiskerVao = null;
    }
    if (this.whiskerBuffer) {
      gl.deleteBuffer(this.whiskerBuffer);
      this.whiskerBuffer = null;
    }
    if (this.medianVao) {
      gl.deleteVertexArray(this.medianVao);
      this.medianVao = null;
    }
    if (this.medianBuffer) {
      gl.deleteBuffer(this.medianBuffer);
      this.medianBuffer = null;
    }
    if (this.outlierVao) {
      gl.deleteVertexArray(this.outlierVao);
      this.outlierVao = null;
    }
    if (this.outlierBuffer) {
      gl.deleteBuffer(this.outlierBuffer);
      this.outlierBuffer = null;
    }

    this.boxShader = null;
    this.lineShader = null;
    this.outlierShader = null;
    this.boxVertexCount = 0;
    this.whiskerVertexCount = 0;
    this.medianVertexCount = 0;
    this.outlierVertexCount = 0;
    this.boxplots = [];
  }
}
