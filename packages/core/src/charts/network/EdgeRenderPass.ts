/**
 * Edge render pass for drawing bezier curved edges
 * Renders before nodes (lower z-order)
 */

import type {
  RenderPass,
  RenderContext,
  ChartState,
  ShaderProgram,
  Margins,
} from '../../types/index.js';
import type { ProcessedEdge } from '../../types/network.js';
import { NETWORK_EDGE_SHADER } from '../../shaders/network.js';

/**
 * Configuration for the edge render pass
 */
export interface EdgeRenderPassConfig {
  /** WebGL2 rendering context */
  gl: WebGL2RenderingContext;
  /** Get shader program function */
  getShaderProgram: (id: string, source: { vertex: string; fragment: string }) => ShaderProgram;
  /** Chart margins */
  margins: Margins;
  /** Pixel ratio */
  pixelRatio: number;
  /** Dim opacity for non-highlighted edges */
  dimOpacity?: number;
  /** Number of bezier curve segments */
  bezierSegments?: number;
}

/**
 * Render pass for drawing network edges as bezier curves
 */
export class EdgeRenderPass implements RenderPass {
  readonly id = 'network-edges';
  readonly order = 5; // Render before nodes
  enabled = true;

  private gl: WebGL2RenderingContext;
  private getShaderProgram: EdgeRenderPassConfig['getShaderProgram'];
  private shader: ShaderProgram | null = null;

  // WebGL resources
  private vao: WebGLVertexArrayObject | null = null;
  private buffer: WebGLBuffer | null = null;
  private vertexCount: number = 0;

  // Config
  private margins: Margins;
  private pixelRatio: number;
  private dimOpacity: number;
  private bezierSegments: number;

  // Data
  private edges: ProcessedEdge[] = [];
  private hasHighlighted: boolean = false;

  private initialized = false;

  constructor(config: EdgeRenderPassConfig) {
    this.gl = config.gl;
    this.getShaderProgram = config.getShaderProgram;
    this.margins = config.margins;
    this.pixelRatio = config.pixelRatio;
    this.dimOpacity = config.dimOpacity ?? 0.15;
    this.bezierSegments = config.bezierSegments ?? 20;
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
   * Set dim opacity
   */
  setDimOpacity(dimOpacity: number): void {
    this.dimOpacity = dimOpacity;
  }

  /**
   * Update edge data
   */
  updateData(edges: ProcessedEdge[]): void {
    this.edges = edges;
    this.hasHighlighted = edges.some(e => e.highlighted);
    this.uploadEdgeData();
  }

  /**
   * Get edges
   */
  getEdges(): ProcessedEdge[] {
    return this.edges;
  }

  /**
   * Ensure WebGL resources are initialized
   */
  private ensureInitialized(): void {
    if (this.initialized) return;

    const { gl } = this;

    // Get shader
    this.shader = this.getShaderProgram('network-edge', NETWORK_EDGE_SHADER);

    // Create VAO
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // Create buffer
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    // Setup vertex attributes: [x, y, r, g, b, a, edgeDist, highlighted]
    const stride = 8 * 4; // 8 floats * 4 bytes

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

    // Edge distance (float)
    const edgeDistLoc = gl.getAttribLocation(this.shader.program, 'a_edgeDist');
    if (edgeDistLoc >= 0) {
      gl.enableVertexAttribArray(edgeDistLoc);
      gl.vertexAttribPointer(edgeDistLoc, 1, gl.FLOAT, false, stride, 6 * 4);
    }

    // Highlighted (float)
    const highlightedLoc = gl.getAttribLocation(this.shader.program, 'a_highlighted');
    if (highlightedLoc >= 0) {
      gl.enableVertexAttribArray(highlightedLoc);
      gl.vertexAttribPointer(highlightedLoc, 1, gl.FLOAT, false, stride, 7 * 4);
    }

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.initialized = true;
  }

  /**
   * Tessellate a quadratic bezier curve into triangles
   */
  private tessellateBezier(
    x0: number, y0: number,
    cx: number, cy: number,
    x1: number, y1: number,
    width: number,
    color: [number, number, number, number],
    highlighted: boolean
  ): number[] {
    const vertices: number[] = [];
    const [r, g, b, a] = color;
    const h = highlighted ? 1.0 : 0.0;

    for (let i = 0; i < this.bezierSegments; i++) {
      const t0 = i / this.bezierSegments;
      const t1 = (i + 1) / this.bezierSegments;

      // Quadratic bezier: P = (1-t)^2*P0 + 2(1-t)t*C + t^2*P1
      const px0 = (1 - t0) * (1 - t0) * x0 + 2 * (1 - t0) * t0 * cx + t0 * t0 * x1;
      const py0 = (1 - t0) * (1 - t0) * y0 + 2 * (1 - t0) * t0 * cy + t0 * t0 * y1;
      const px1 = (1 - t1) * (1 - t1) * x0 + 2 * (1 - t1) * t1 * cx + t1 * t1 * x1;
      const py1 = (1 - t1) * (1 - t1) * y0 + 2 * (1 - t1) * t1 * cy + t1 * t1 * y1;

      // Calculate perpendicular for line width
      const dx = px1 - px0;
      const dy = py1 - py0;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.001) continue;

      const nx = (-dy / len) * width * 0.5;
      const ny = (dx / len) * width * 0.5;

      // Create quad (2 triangles) for this segment
      // Triangle 1
      vertices.push(px0 - nx, py0 - ny, r, g, b, a, -1.0, h);
      vertices.push(px0 + nx, py0 + ny, r, g, b, a, 1.0, h);
      vertices.push(px1 - nx, py1 - ny, r, g, b, a, -1.0, h);

      // Triangle 2
      vertices.push(px1 - nx, py1 - ny, r, g, b, a, -1.0, h);
      vertices.push(px0 + nx, py0 + ny, r, g, b, a, 1.0, h);
      vertices.push(px1 + nx, py1 + ny, r, g, b, a, 1.0, h);
    }

    return vertices;
  }

  /**
   * Upload edge data to GPU
   */
  private uploadEdgeData(): void {
    this.ensureInitialized();

    const { gl } = this;
    const vertices: number[] = [];

    for (const edge of this.edges) {
      const edgeVertices = this.tessellateBezier(
        edge.sourceX, edge.sourceY,
        edge.controlX, edge.controlY,
        edge.targetX, edge.targetY,
        edge.width,
        edge.color,
        edge.highlighted ?? false
      );
      vertices.push(...edgeVertices);
    }

    const vertexData = new Float32Array(vertices);
    this.vertexCount = vertices.length / 8;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Render the edges
   */
  render(ctx: RenderContext, _state: ChartState): void {
    if (!this.enabled || this.vertexCount === 0 || !this.shader) return;

    this.ensureInitialized();

    const { gl } = this;
    const { width, height } = ctx;

    // Use shader
    gl.useProgram(this.shader.program);

    // Set uniforms
    const resolutionLoc = gl.getUniformLocation(this.shader.program, 'u_resolution');
    gl.uniform2f(resolutionLoc, width, height);

    const pixelRatioLoc = gl.getUniformLocation(this.shader.program, 'u_pixelRatio');
    gl.uniform1f(pixelRatioLoc, this.pixelRatio);

    // Only apply dimming if something is highlighted
    const dimOpacityLoc = gl.getUniformLocation(this.shader.program, 'u_dimOpacity');
    gl.uniform1f(dimOpacityLoc, this.hasHighlighted ? this.dimOpacity : 1.0);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Bind VAO and draw
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

    // Cleanup
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
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
