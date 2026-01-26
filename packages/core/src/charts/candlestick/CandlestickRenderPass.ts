/**
 * Candlestick render pass for drawing candlestick chart elements
 */

import type {
  RenderPass,
  RenderContext,
  ChartState,
  ShaderProgram,
  Margins,
} from '../../types/index.js';
import type { Candle, CandlestickOrientation } from '../../types/candlestick.js';
import { CANDLESTICK_BODY_SHADER, CANDLESTICK_WICK_SHADER } from '../../shaders/candlestick.js';

/**
 * Configuration for the candlestick render pass
 */
export interface CandlestickRenderPassConfig {
  /** WebGL2 rendering context */
  gl: WebGL2RenderingContext;
  /** Get shader program function */
  getShaderProgram: (id: string, source: { vertex: string; fragment: string }) => ShaderProgram;
  /** Chart margins */
  margins: Margins;
  /** Pixel ratio */
  pixelRatio: number;
  /** Chart orientation */
  orientation?: CandlestickOrientation;
  /** Hover brightness multiplier */
  hoverBrighten?: number;
  /** Wick width in pixels */
  wickWidth?: number;
}

/**
 * Render pass for drawing candlestick charts
 * Renders candle bodies as triangles and wicks as lines
 */
export class CandlestickRenderPass implements RenderPass {
  readonly id = 'candlestick';
  readonly order = 10; // Render after grid
  enabled = true;

  private gl: WebGL2RenderingContext;
  private getShaderProgram: CandlestickRenderPassConfig['getShaderProgram'];
  private bodyShader: ShaderProgram | null = null;
  private wickShader: ShaderProgram | null = null;
  private margins: Margins;
  private pixelRatio: number;
  private orientation: CandlestickOrientation;
  private hoverBrighten: number;
  private wickWidth: number;

  // GPU resources for body
  private bodyVao: WebGLVertexArrayObject | null = null;
  private bodyBuffer: WebGLBuffer | null = null;
  private bodyVertexCount: number = 0;

  // GPU resources for wicks
  private wickVao: WebGLVertexArrayObject | null = null;
  private wickBuffer: WebGLBuffer | null = null;
  private wickVertexCount: number = 0;

  // Candle data for hit testing
  private candles: Candle[] = [];

  // Domain and plot area for rendering
  private domain: { x: [number, number]; y: [number, number] } = { x: [0, 1], y: [0, 1] };
  private plotArea: { x: number; y: number; width: number; height: number } = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };

  constructor(config: CandlestickRenderPassConfig) {
    this.gl = config.gl;
    this.getShaderProgram = config.getShaderProgram;
    this.margins = config.margins;
    this.pixelRatio = config.pixelRatio;
    this.orientation = config.orientation ?? 'vertical';
    this.hoverBrighten = config.hoverBrighten ?? 1.2;
    this.wickWidth = config.wickWidth ?? 1;
  }

  /**
   * Initialize shaders and GPU resources
   */
  private ensureInitialized(): void {
    if (this.bodyShader && this.wickShader) return;

    const { gl } = this;

    // Get or create shaders
    this.bodyShader = this.getShaderProgram('candlestick-body', CANDLESTICK_BODY_SHADER);
    this.wickShader = this.getShaderProgram('candlestick-wick', CANDLESTICK_WICK_SHADER);

    // Create VAO and buffer for bodies
    this.bodyVao = gl.createVertexArray();
    if (!this.bodyVao) {
      throw new Error('Failed to create body VAO for candlestick render pass');
    }
    this.bodyBuffer = gl.createBuffer();
    if (!this.bodyBuffer) {
      throw new Error('Failed to create body buffer for candlestick render pass');
    }

    // Create VAO and buffer for wicks
    this.wickVao = gl.createVertexArray();
    if (!this.wickVao) {
      throw new Error('Failed to create wick VAO for candlestick render pass');
    }
    this.wickBuffer = gl.createBuffer();
    if (!this.wickBuffer) {
      throw new Error('Failed to create wick buffer for candlestick render pass');
    }
  }

  /**
   * Set chart orientation
   */
  setOrientation(orientation: CandlestickOrientation): void {
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
   * Update candle data
   */
  updateData(candles: Candle[]): void {
    this.candles = candles;
    this.uploadCandleData();
  }

  /**
   * Transform a price value to pixel coordinates
   */
  private priceToPixel(price: number): number {
    const { y: yDomain } = this.domain;
    const normalized = (price - yDomain[0]) / (yDomain[1] - yDomain[0]);

    if (this.orientation === 'vertical') {
      // Y axis is inverted in screen space
      return this.plotArea.y + this.plotArea.height - normalized * this.plotArea.height;
    } else {
      // Horizontal: price is on X axis
      return this.plotArea.x + normalized * this.plotArea.width;
    }
  }

  /**
   * Get the time axis position for a candle
   */
  private getTimePosition(candle: Candle): number {
    return candle.position;
  }

  /**
   * Upload candle data to GPU
   */
  private uploadCandleData(): void {
    this.ensureInitialized();

    const { gl } = this;
    const bodyVertices: number[] = [];
    const wickVertices: number[] = [];

    // Build vertex data for all candles
    for (const candle of this.candles) {
      const timePos = this.getTimePosition(candle);
      const halfWidth = candle.width / 2;
      const hovered = candle.hovered ? 1.0 : 0.0;

      const openPixel = this.priceToPixel(candle.open);
      const closePixel = this.priceToPixel(candle.close);
      const highPixel = this.priceToPixel(candle.high);
      const lowPixel = this.priceToPixel(candle.low);

      const [r, g, b, a] = candle.color;
      const [wr, wg, wb, wa] = candle.wickColor;

      if (this.orientation === 'vertical') {
        // Vertical: X is time, Y is price
        const x = timePos;
        const top = Math.min(openPixel, closePixel);
        const bottom = Math.max(openPixel, closePixel);
        const left = x - halfWidth;
        const right = x + halfWidth;

        // Body vertices (2 triangles = 6 vertices)
        // Format: [x, y, r, g, b, a, hovered]
        // Triangle 1: top-left, bottom-left, top-right
        bodyVertices.push(left, top, r, g, b, a, hovered);
        bodyVertices.push(left, bottom, r, g, b, a, hovered);
        bodyVertices.push(right, top, r, g, b, a, hovered);
        // Triangle 2: top-right, bottom-left, bottom-right
        bodyVertices.push(right, top, r, g, b, a, hovered);
        bodyVertices.push(left, bottom, r, g, b, a, hovered);
        bodyVertices.push(right, bottom, r, g, b, a, hovered);

        // Wick vertices (1 line = 2 vertices from high to low)
        wickVertices.push(x, highPixel, wr, wg, wb, wa, hovered);
        wickVertices.push(x, lowPixel, wr, wg, wb, wa, hovered);
      } else {
        // Horizontal: Y is time, X is price
        const y = timePos;
        const left = Math.min(openPixel, closePixel);
        const right = Math.max(openPixel, closePixel);
        const top = y - halfWidth;
        const bottom = y + halfWidth;

        // Body vertices
        bodyVertices.push(left, top, r, g, b, a, hovered);
        bodyVertices.push(left, bottom, r, g, b, a, hovered);
        bodyVertices.push(right, top, r, g, b, a, hovered);
        bodyVertices.push(right, top, r, g, b, a, hovered);
        bodyVertices.push(left, bottom, r, g, b, a, hovered);
        bodyVertices.push(right, bottom, r, g, b, a, hovered);

        // Wick vertices (horizontal line from high to low)
        wickVertices.push(highPixel, y, wr, wg, wb, wa, hovered);
        wickVertices.push(lowPixel, y, wr, wg, wb, wa, hovered);
      }
    }

    // Upload body vertices
    const bodyData = new Float32Array(bodyVertices);
    this.bodyVertexCount = bodyVertices.length / 7; // 7 floats per vertex
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bodyBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, bodyData, gl.DYNAMIC_DRAW);

    // Upload wick vertices
    const wickData = new Float32Array(wickVertices);
    this.wickVertexCount = wickVertices.length / 7;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wickBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, wickData, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Get candles for hit testing
   */
  getCandles(): Candle[] {
    return this.candles;
  }

  /**
   * Hit test to find candle at pixel coordinates
   */
  hitTest(pixelX: number, pixelY: number): Candle | null {
    for (const candle of this.candles) {
      const timePos = this.getTimePosition(candle);
      const halfWidth = candle.width / 2;

      const highPixel = this.priceToPixel(candle.high);
      const lowPixel = this.priceToPixel(candle.low);

      if (this.orientation === 'vertical') {
        // Check X bounds (candle width)
        if (pixelX < timePos - halfWidth || pixelX > timePos + halfWidth) {
          continue;
        }

        // Check Y bounds (high to low range)
        const minY = Math.min(highPixel, lowPixel);
        const maxY = Math.max(highPixel, lowPixel);
        if (pixelY >= minY && pixelY <= maxY) {
          return candle;
        }
      } else {
        // Horizontal: check Y bounds for candle width, X for price range
        if (pixelY < timePos - halfWidth || pixelY > timePos + halfWidth) {
          continue;
        }

        const minX = Math.min(highPixel, lowPixel);
        const maxX = Math.max(highPixel, lowPixel);
        if (pixelX >= minX && pixelX <= maxX) {
          return candle;
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
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
    }

    // a_hovered (float)
    const hoveredLoc = shader.attributes.get('a_hovered');
    if (hoveredLoc !== undefined) {
      gl.enableVertexAttribArray(hoveredLoc);
      gl.vertexAttribPointer(hoveredLoc, 1, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
    }
  }

  /**
   * Render the candlesticks
   */
  render(ctx: RenderContext, _state: ChartState): void {
    if (this.bodyVertexCount === 0 && this.wickVertexCount === 0) return;

    this.ensureInitialized();

    const { gl } = this;

    // Enable scissor test to clip to plot area
    const plotLeft = this.margins.left * this.pixelRatio;
    const plotTop = this.margins.top * this.pixelRatio;
    const plotWidth = ctx.width - (this.margins.left + this.margins.right) * this.pixelRatio;
    const plotHeight = ctx.height - (this.margins.top + this.margins.bottom) * this.pixelRatio;

    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(plotLeft, ctx.height - plotTop - plotHeight, plotWidth, plotHeight);

    // Draw wicks first (behind bodies)
    if (this.wickVertexCount > 0) {
      const wickShader = this.wickShader!;

      gl.bindVertexArray(this.wickVao);
      this.setupVertexAttributes(wickShader, this.wickBuffer!);

      wickShader.use(gl);
      wickShader.setUniform('u_resolution', [ctx.width, ctx.height]);
      wickShader.setUniform('u_pixelRatio', ctx.pixelRatio);
      wickShader.setUniform('u_hoverBrighten', this.hoverBrighten);

      gl.lineWidth(this.wickWidth);
      gl.drawArrays(gl.LINES, 0, this.wickVertexCount);
    }

    // Draw bodies
    if (this.bodyVertexCount > 0) {
      const bodyShader = this.bodyShader!;

      gl.bindVertexArray(this.bodyVao);
      this.setupVertexAttributes(bodyShader, this.bodyBuffer!);

      bodyShader.use(gl);
      bodyShader.setUniform('u_resolution', [ctx.width, ctx.height]);
      bodyShader.setUniform('u_pixelRatio', ctx.pixelRatio);
      bodyShader.setUniform('u_hoverBrighten', this.hoverBrighten);

      gl.drawArrays(gl.TRIANGLES, 0, this.bodyVertexCount);
    }

    // Disable scissor test
    gl.disable(gl.SCISSOR_TEST);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Clear all candle data
   */
  clear(): void {
    this.candles = [];
    this.bodyVertexCount = 0;
    this.wickVertexCount = 0;
  }

  /**
   * Clean up GPU resources
   */
  dispose(): void {
    const { gl } = this;

    if (this.bodyVao) {
      gl.deleteVertexArray(this.bodyVao);
      this.bodyVao = null;
    }
    if (this.bodyBuffer) {
      gl.deleteBuffer(this.bodyBuffer);
      this.bodyBuffer = null;
    }
    if (this.wickVao) {
      gl.deleteVertexArray(this.wickVao);
      this.wickVao = null;
    }
    if (this.wickBuffer) {
      gl.deleteBuffer(this.wickBuffer);
      this.wickBuffer = null;
    }

    this.bodyShader = null;
    this.wickShader = null;
    this.bodyVertexCount = 0;
    this.wickVertexCount = 0;
    this.candles = [];
  }
}
