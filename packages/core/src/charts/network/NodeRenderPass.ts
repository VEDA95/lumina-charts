/**
 * Node render pass for drawing circular nodes
 * Uses instanced rendering with quad vertices and SDF for anti-aliased circles
 */

import type {
  RenderPass,
  RenderContext,
  ChartState,
  ShaderProgram,
  Margins,
} from '../../types/index.js';
import type { ProcessedNode } from '../../types/network.js';
import { NETWORK_NODE_SHADER } from '../../shaders/network.js';

/**
 * Configuration for the node render pass
 */
export interface NodeRenderPassConfig {
  /** WebGL2 rendering context */
  gl: WebGL2RenderingContext;
  /** Get shader program function */
  getShaderProgram: (id: string, source: { vertex: string; fragment: string }) => ShaderProgram;
  /** Chart margins */
  margins: Margins;
  /** Pixel ratio */
  pixelRatio: number;
  /** Dim opacity for non-highlighted nodes */
  dimOpacity?: number;
  /** Hover brightness multiplier */
  hoverBrighten?: number;
}

/**
 * Render pass for drawing network nodes as circles
 */
export class NodeRenderPass implements RenderPass {
  readonly id = 'network-nodes';
  readonly order = 10; // Render after edges
  enabled = true;

  private gl: WebGL2RenderingContext;
  private getShaderProgram: NodeRenderPassConfig['getShaderProgram'];
  private shader: ShaderProgram | null = null;

  // WebGL resources
  private vao: WebGLVertexArrayObject | null = null;
  private quadBuffer: WebGLBuffer | null = null;
  private instanceBuffer: WebGLBuffer | null = null;
  private instanceCount: number = 0;

  // Config
  private _margins: Margins;
  private pixelRatio: number;
  private dimOpacity: number;
  private hoverBrighten: number;

  // Data
  private nodes: ProcessedNode[] = [];
  private hasHighlighted: boolean = false;

  private initialized = false;

  constructor(config: NodeRenderPassConfig) {
    this.gl = config.gl;
    this.getShaderProgram = config.getShaderProgram;
    this._margins = config.margins;
    this.pixelRatio = config.pixelRatio;
    this.dimOpacity = config.dimOpacity ?? 0.15;
    this.hoverBrighten = config.hoverBrighten ?? 1.2;
  }

  /**
   * Set margins
   */
  setMargins(margins: Margins): void {
    this._margins = margins;
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
   * Update node data
   */
  updateData(nodes: ProcessedNode[]): void {
    this.nodes = nodes;
    this.hasHighlighted = nodes.some(n => n.highlighted || n.hovered);
    this.uploadNodeData();
  }

  /**
   * Get nodes
   */
  getNodes(): ProcessedNode[] {
    return this.nodes;
  }

  /**
   * Hit test to find node at pixel coordinates
   */
  hitTest(pixelX: number, pixelY: number): ProcessedNode | null {
    // Check in reverse order (top-most nodes first)
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      const dx = pixelX - node.pixelX;
      const dy = pixelY - node.pixelY;
      if (dx * dx + dy * dy <= node.radius * node.radius) {
        return node;
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
    this.shader = this.getShaderProgram('network-node', NETWORK_NODE_SHADER);

    // Create VAO
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // Create quad buffer (unit quad: -1 to 1)
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    const quadVertices = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    // Setup quad vertex attribute (per-vertex)
    const quadLoc = gl.getAttribLocation(this.shader.program, 'a_quadVertex');
    if (quadLoc >= 0) {
      gl.enableVertexAttribArray(quadLoc);
      gl.vertexAttribPointer(quadLoc, 2, gl.FLOAT, false, 0, 0);
    }

    // Create instance buffer
    this.instanceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);

    // Instance attributes: [x, y, r, g, b, a, radius, highlighted, hovered, selected]
    const instanceStride = 10 * 4; // 10 floats * 4 bytes

    // Position (vec2)
    const posLoc = gl.getAttribLocation(this.shader.program, 'a_position');
    if (posLoc >= 0) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, instanceStride, 0);
      gl.vertexAttribDivisor(posLoc, 1);
    }

    // Color (vec4)
    const colorLoc = gl.getAttribLocation(this.shader.program, 'a_color');
    if (colorLoc >= 0) {
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, instanceStride, 2 * 4);
      gl.vertexAttribDivisor(colorLoc, 1);
    }

    // Radius (float)
    const radiusLoc = gl.getAttribLocation(this.shader.program, 'a_radius');
    if (radiusLoc >= 0) {
      gl.enableVertexAttribArray(radiusLoc);
      gl.vertexAttribPointer(radiusLoc, 1, gl.FLOAT, false, instanceStride, 6 * 4);
      gl.vertexAttribDivisor(radiusLoc, 1);
    }

    // Highlighted (float)
    const highlightedLoc = gl.getAttribLocation(this.shader.program, 'a_highlighted');
    if (highlightedLoc >= 0) {
      gl.enableVertexAttribArray(highlightedLoc);
      gl.vertexAttribPointer(highlightedLoc, 1, gl.FLOAT, false, instanceStride, 7 * 4);
      gl.vertexAttribDivisor(highlightedLoc, 1);
    }

    // Hovered (float)
    const hoveredLoc = gl.getAttribLocation(this.shader.program, 'a_hovered');
    if (hoveredLoc >= 0) {
      gl.enableVertexAttribArray(hoveredLoc);
      gl.vertexAttribPointer(hoveredLoc, 1, gl.FLOAT, false, instanceStride, 8 * 4);
      gl.vertexAttribDivisor(hoveredLoc, 1);
    }

    // Selected (float)
    const selectedLoc = gl.getAttribLocation(this.shader.program, 'a_selected');
    if (selectedLoc >= 0) {
      gl.enableVertexAttribArray(selectedLoc);
      gl.vertexAttribPointer(selectedLoc, 1, gl.FLOAT, false, instanceStride, 9 * 4);
      gl.vertexAttribDivisor(selectedLoc, 1);
    }

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.initialized = true;
  }

  /**
   * Upload node data to GPU as instance attributes
   */
  private uploadNodeData(): void {
    this.ensureInitialized();

    const { gl } = this;

    // Build instance data: [x, y, r, g, b, a, radius, highlighted, hovered, selected]
    const instanceData: number[] = [];

    for (const node of this.nodes) {
      const [r, g, b, a] = node.color;
      instanceData.push(
        node.pixelX, node.pixelY,
        r, g, b, a,
        node.radius,
        node.highlighted ? 1.0 : 0.0,
        node.hovered ? 1.0 : 0.0,
        node.selected ? 1.0 : 0.0
      );
    }

    this.instanceCount = this.nodes.length;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instanceData), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Render the nodes
   */
  render(ctx: RenderContext, _state: ChartState): void {
    if (!this.enabled || this.instanceCount === 0 || !this.shader) return;

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

    const hoverBrightenLoc = gl.getUniformLocation(this.shader.program, 'u_hoverBrighten');
    gl.uniform1f(hoverBrightenLoc, this.hoverBrighten);

    // Only apply dimming if something is highlighted/hovered
    const dimOpacityLoc = gl.getUniformLocation(this.shader.program, 'u_dimOpacity');
    gl.uniform1f(dimOpacityLoc, this.hasHighlighted ? this.dimOpacity : 1.0);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Bind VAO and draw instanced
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.instanceCount);

    // Cleanup
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }

  /**
   * Dispose WebGL resources
   */
  dispose(): void {
    const { gl } = this;

    if (this.quadBuffer) {
      gl.deleteBuffer(this.quadBuffer);
      this.quadBuffer = null;
    }

    if (this.instanceBuffer) {
      gl.deleteBuffer(this.instanceBuffer);
      this.instanceBuffer = null;
    }

    if (this.vao) {
      gl.deleteVertexArray(this.vao);
      this.vao = null;
    }

    this.initialized = false;
  }
}
