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
import { SIMPLE_LINE_SHADER, GRADIENT_AREA_SHADER } from '../../shaders/line.js';
import { POINT_SHADER } from '../../shaders/point.js';

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
  /** Whether to show data points */
  showPoints?: boolean;
  /** Point size in pixels */
  pointSize?: number;
  /** Point color (defaults to line color) */
  pointColor?: RGBAColor;
  /** Original data point positions (for showing points on smooth lines) */
  originalPositions?: Float32Array;
  /** Number of original points (for smooth lines) */
  originalPointCount?: number;
  /** Whether to show filled area under the line */
  showArea?: boolean;
  /** Area fill opacity at the top (default: 0.4) */
  areaOpacity?: number;
  /** Whether to use gradient fill for area (default: true) */
  areaGradient?: boolean;
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
  private pointShader: ShaderProgram | null = null;
  private areaShader: ShaderProgram | null = null;
  private margins: Margins;
  private pixelRatio: number;

  // GPU resources per series for lines
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

  // GPU resources per series for points
  private pointBuffers: Map<
    string,
    {
      vao: WebGLVertexArrayObject;
      buffer: WebGLBuffer;
      pointCount: number;
      pointSize: number;
      pointColor: RGBAColor;
    }
  > = new Map();

  // GPU resources per series for area fills
  private areaBuffers: Map<
    string,
    {
      vao: WebGLVertexArrayObject;
      buffer: WebGLBuffer;
      color: RGBAColor;
      vertexCount: number;
      opacity: number;
      useGradient: boolean;
    }
  > = new Map();

  constructor(config: LineRenderPassConfig) {
    this.gl = config.gl;
    this.getShaderProgram = config.getShaderProgram;
    this.margins = config.margins;
    this.pixelRatio = config.pixelRatio;
  }

  /**
   * Initialize shaders
   */
  private ensureInitialized(): void {
    if (!this.shader) {
      this.shader = this.getShaderProgram('line-simple', SIMPLE_LINE_SHADER);
    }
    if (!this.pointShader) {
      this.pointShader = this.getShaderProgram('line-points', POINT_SHADER);
    }
    if (!this.areaShader) {
      this.areaShader = this.getShaderProgram('line-area', GRADIENT_AREA_SHADER);
    }
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

    // Handle point data if showPoints is enabled
    if (data.showPoints) {
      this.updatePointData(data);
    } else {
      // Remove point buffer if points are disabled
      this.removePointBuffer(data.seriesId);
    }

    // Handle area data if showArea is enabled
    if (data.showArea) {
      this.updateAreaData(data);
    } else {
      // Remove area buffer if area is disabled
      this.removeAreaBuffer(data.seriesId);
    }
  }

  /**
   * Update point data for a series
   */
  private updatePointData(data: LineSeriesData): void {
    const { gl } = this;
    let pointInfo = this.pointBuffers.get(data.seriesId);

    // Use original positions for points if available (for smooth lines)
    const positions = data.originalPositions ?? data.positions;
    const pointCount = data.originalPointCount ?? data.pointCount;
    const pointSize = data.pointSize ?? 8;
    const pointColor = data.pointColor ?? data.color;

    // Create new point buffer info if needed
    if (!pointInfo) {
      const vao = gl.createVertexArray();
      const buffer = gl.createBuffer();

      if (!vao || !buffer) {
        throw new Error('Failed to create WebGL point resources');
      }

      pointInfo = {
        vao,
        buffer,
        pointCount: 0,
        pointSize,
        pointColor,
      };
      this.pointBuffers.set(data.seriesId, pointInfo);
    }

    // Update point buffer data
    pointInfo.pointCount = pointCount;
    pointInfo.pointSize = pointSize;
    pointInfo.pointColor = pointColor;

    // Build vertex data for points: [x, y, r, g, b, a, size, shape] per point
    // shape: 0 = circle
    const vertexData = new Float32Array(pointCount * 8);
    const [pr, pg, pb, pa] = pointColor;

    for (let i = 0; i < pointCount; i++) {
      const idx = i * 8;
      vertexData[idx] = positions[i * 2]; // x
      vertexData[idx + 1] = positions[i * 2 + 1]; // y
      vertexData[idx + 2] = pr; // r
      vertexData[idx + 3] = pg; // g
      vertexData[idx + 4] = pb; // b
      vertexData[idx + 5] = pa; // a
      vertexData[idx + 6] = pointSize; // size
      vertexData[idx + 7] = 0; // shape (circle)
    }

    // Upload to GPU
    gl.bindVertexArray(pointInfo.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, pointInfo.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

    // Setup vertex attributes for point shader
    // Stride: x(1) + y(1) + color(4) + size(1) + shape(1) = 8 floats
    const stride = 8 * Float32Array.BYTES_PER_ELEMENT;

    const posLoc = this.pointShader!.attributes.get('a_position');
    if (posLoc !== undefined) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
    }

    const colorLoc = this.pointShader!.attributes.get('a_color');
    if (colorLoc !== undefined) {
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
    }

    const sizeLoc = this.pointShader!.attributes.get('a_size');
    if (sizeLoc !== undefined) {
      gl.enableVertexAttribArray(sizeLoc);
      gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
    }

    const shapeLoc = this.pointShader!.attributes.get('a_shape');
    if (shapeLoc !== undefined) {
      gl.enableVertexAttribArray(shapeLoc);
      gl.vertexAttribPointer(shapeLoc, 1, gl.FLOAT, false, stride, 7 * Float32Array.BYTES_PER_ELEMENT);
    }

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Remove point buffer for a series
   */
  private removePointBuffer(seriesId: string): void {
    const pointInfo = this.pointBuffers.get(seriesId);
    if (pointInfo) {
      this.gl.deleteVertexArray(pointInfo.vao);
      this.gl.deleteBuffer(pointInfo.buffer);
      this.pointBuffers.delete(seriesId);
    }
  }

  /**
   * Update area fill data for a series
   */
  private updateAreaData(data: LineSeriesData): void {
    const { gl } = this;
    let areaInfo = this.areaBuffers.get(data.seriesId);

    const opacity = data.areaOpacity ?? 0.4;
    const useGradient = data.areaGradient !== false;

    // Create new area buffer info if needed
    if (!areaInfo) {
      const vao = gl.createVertexArray();
      const buffer = gl.createBuffer();

      if (!vao || !buffer) {
        throw new Error('Failed to create WebGL area resources');
      }

      areaInfo = {
        vao,
        buffer,
        color: data.color,
        vertexCount: 0,
        opacity,
        useGradient,
      };
      this.areaBuffers.set(data.seriesId, areaInfo);
    }

    // Update area info
    areaInfo.color = data.color;
    areaInfo.opacity = opacity;
    areaInfo.useGradient = useGradient;

    // Build triangle strip vertices for the area
    // For each point, we create two vertices: one at the data point, one at y=baseline
    // Format: [x, y, normalizedY] where normalizedY is 0 at baseline, 1 at data point
    const pointCount = data.pointCount;
    if (pointCount < 2) {
      areaInfo.vertexCount = 0;
      return;
    }

    // Calculate y baseline (typically the minimum y in the domain, passed as 0 in data coords)
    // We'll use the first point's baseline - in practice this should be domain.y[0]
    // For now, we'll pass the positions and let the shader figure out the baseline

    // Each segment creates 2 triangles = 6 vertices
    // But using TRIANGLE_STRIP: pointCount * 2 vertices (top and bottom for each x)
    const vertexData = new Float32Array(pointCount * 2 * 3); // x, y, normalizedY per vertex

    for (let i = 0; i < pointCount; i++) {
      const x = data.positions[i * 2];
      const y = data.positions[i * 2 + 1];

      // Bottom vertex (at y = 0, or baseline)
      const bottomIdx = i * 2 * 3;
      vertexData[bottomIdx] = x;
      vertexData[bottomIdx + 1] = 0; // baseline (will be domain.y[0] in data coords)
      vertexData[bottomIdx + 2] = 0; // normalizedY = 0 at bottom

      // Top vertex (at data point)
      const topIdx = (i * 2 + 1) * 3;
      vertexData[topIdx] = x;
      vertexData[topIdx + 1] = y;
      vertexData[topIdx + 2] = 1; // normalizedY = 1 at top
    }

    areaInfo.vertexCount = pointCount * 2;

    // Upload to GPU
    gl.bindVertexArray(areaInfo.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, areaInfo.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

    // Setup vertex attributes for area shader
    const stride = 3 * Float32Array.BYTES_PER_ELEMENT;

    const posLoc = this.areaShader!.attributes.get('a_position');
    if (posLoc !== undefined) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
    }

    const normalizedYLoc = this.areaShader!.attributes.get('a_normalizedY');
    if (normalizedYLoc !== undefined) {
      gl.enableVertexAttribArray(normalizedYLoc);
      gl.vertexAttribPointer(normalizedYLoc, 1, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
    }

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Remove area buffer for a series
   */
  private removeAreaBuffer(seriesId: string): void {
    const areaInfo = this.areaBuffers.get(seriesId);
    if (areaInfo) {
      this.gl.deleteVertexArray(areaInfo.vao);
      this.gl.deleteBuffer(areaInfo.buffer);
      this.areaBuffers.delete(seriesId);
    }
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
    // Also remove point and area buffers
    this.removePointBuffer(seriesId);
    this.removeAreaBuffer(seriesId);
  }

  /**
   * Clear all series data
   */
  clearAllSeries(): void {
    for (const [seriesId] of this.seriesBuffers) {
      this.removeSeries(seriesId);
    }
    // Ensure all point and area buffers are also cleared
    for (const [seriesId] of this.pointBuffers) {
      this.removePointBuffer(seriesId);
    }
    for (const [seriesId] of this.areaBuffers) {
      this.removeAreaBuffer(seriesId);
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

    // Draw area fills first (behind lines)
    this.renderAreas(ctx, state, plotLeft, plotTop, plotRight, plotBottom);

    // Activate line shader
    shader.use(gl);

    // Set common uniforms
    shader.setUniform('u_resolution', [ctx.width, ctx.height]);
    shader.setUniform('u_pixelRatio', ctx.pixelRatio);
    shader.setUniform('u_domainMin', [state.domain.x[0], state.domain.y[0]]);
    shader.setUniform('u_domainMax', [state.domain.x[1], state.domain.y[1]]);
    shader.setUniform('u_plotBounds', [plotLeft, plotTop, plotRight, plotBottom]);

    // Draw each series line
    for (const [seriesId, bufferInfo] of this.seriesBuffers) {
      // Skip hidden series
      if (!state.visibleSeries.has(seriesId)) continue;
      if (bufferInfo.pointCount < 2) continue;

      gl.bindVertexArray(bufferInfo.vao);
      gl.lineWidth(bufferInfo.lineWidth); // Note: lineWidth > 1 not widely supported
      gl.drawArrays(gl.LINE_STRIP, 0, bufferInfo.pointCount);
    }

    gl.bindVertexArray(null);

    // Draw points on top of lines
    this.renderPoints(ctx, state, plotLeft, plotTop, plotRight, plotBottom);

    gl.disable(gl.SCISSOR_TEST);
  }

  /**
   * Render area fills for all series
   */
  private renderAreas(
    ctx: RenderContext,
    state: ChartState,
    plotLeft: number,
    plotTop: number,
    plotRight: number,
    plotBottom: number
  ): void {
    if (this.areaBuffers.size === 0) return;

    const { gl } = this;
    const areaShader = this.areaShader!;

    // Activate area shader
    areaShader.use(gl);

    // Set uniforms
    areaShader.setUniform('u_resolution', [ctx.width, ctx.height]);
    areaShader.setUniform('u_pixelRatio', ctx.pixelRatio);
    areaShader.setUniform('u_domainMin', [state.domain.x[0], state.domain.y[0]]);
    areaShader.setUniform('u_domainMax', [state.domain.x[1], state.domain.y[1]]);
    areaShader.setUniform('u_plotBounds', [plotLeft, plotTop, plotRight, plotBottom]);

    // Draw area fills for each series
    for (const [seriesId, areaInfo] of this.areaBuffers) {
      // Skip hidden series
      if (!state.visibleSeries.has(seriesId)) continue;
      if (areaInfo.vertexCount < 4) continue;

      const [r, g, b, a] = areaInfo.color;

      if (areaInfo.useGradient) {
        // Gradient: solid at top, transparent at bottom
        areaShader.setUniform('u_colorTop', [r, g, b, a]);
        areaShader.setUniform('u_colorBottom', [r, g, b, 0]);
        areaShader.setUniform('u_opacityTop', areaInfo.opacity);
        areaShader.setUniform('u_opacityBottom', 0);
      } else {
        // Solid color with specified opacity
        areaShader.setUniform('u_colorTop', [r, g, b, areaInfo.opacity]);
        areaShader.setUniform('u_colorBottom', [r, g, b, areaInfo.opacity]);
        areaShader.setUniform('u_opacityTop', 0);
        areaShader.setUniform('u_opacityBottom', 0);
      }

      gl.bindVertexArray(areaInfo.vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, areaInfo.vertexCount);
    }

    gl.bindVertexArray(null);
  }

  /**
   * Render data points for all series
   */
  private renderPoints(
    ctx: RenderContext,
    state: ChartState,
    plotLeft: number,
    plotTop: number,
    plotRight: number,
    plotBottom: number
  ): void {
    if (this.pointBuffers.size === 0) return;

    const { gl } = this;
    const pointShader = this.pointShader!;

    // Activate point shader
    pointShader.use(gl);

    // Set uniforms
    pointShader.setUniform('u_resolution', [ctx.width, ctx.height]);
    pointShader.setUniform('u_pixelRatio', ctx.pixelRatio);
    pointShader.setUniform('u_domainMin', [state.domain.x[0], state.domain.y[0]]);
    pointShader.setUniform('u_domainMax', [state.domain.x[1], state.domain.y[1]]);
    pointShader.setUniform('u_plotBounds', [plotLeft, plotTop, plotRight, plotBottom]);

    // Draw points for each series
    for (const [seriesId, pointInfo] of this.pointBuffers) {
      // Skip hidden series
      if (!state.visibleSeries.has(seriesId)) continue;
      if (pointInfo.pointCount < 1) continue;

      gl.bindVertexArray(pointInfo.vao);
      gl.drawArrays(gl.POINTS, 0, pointInfo.pointCount);
    }

    gl.bindVertexArray(null);
  }

  /**
   * Clean up GPU resources
   */
  dispose(): void {
    this.clearAllSeries();
    this.shader = null;
    this.pointShader = null;
    this.areaShader = null;
  }
}
