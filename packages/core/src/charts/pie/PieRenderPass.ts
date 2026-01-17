/**
 * Pie render pass for drawing pie/donut chart wedges
 */

import type { RenderPass, RenderContext, ChartState, ShaderProgram, RGBAColor } from '../../types/index.js';
import type { PieSlice } from '../../types/pie.js';
import { PIE_SHADER } from '../../shaders/pie.js';

/**
 * Configuration for the pie render pass
 */
export interface PieRenderPassConfig {
  /** WebGL2 rendering context */
  gl: WebGL2RenderingContext;
  /** Get shader program function */
  getShaderProgram: (id: string, source: { vertex: string; fragment: string }) => ShaderProgram;
  /** Pixel ratio */
  pixelRatio: number;
  /** Number of segments per slice for smooth curves */
  segmentsPerSlice?: number;
  /** Hover brightness multiplier */
  hoverBrighten?: number;
}

/**
 * Render pass for drawing pie/donut charts
 * Renders slices as triangle strips using pre-computed vertices
 */
export class PieRenderPass implements RenderPass {
  readonly id = 'pie';
  readonly order = 10;
  enabled = true;

  private gl: WebGL2RenderingContext;
  private getShaderProgram: PieRenderPassConfig['getShaderProgram'];
  private shader: ShaderProgram | null = null;
  private pixelRatio: number;
  private segmentsPerSlice: number;
  private hoverBrighten: number;

  // GPU resources
  private vao: WebGLVertexArrayObject | null = null;
  private buffer: WebGLBuffer | null = null;
  private vertexCount: number = 0;

  // Slice data for hit testing
  private slices: PieSlice[] = [];
  private centerX: number = 0;
  private centerY: number = 0;
  private innerRadius: number = 0;
  private outerRadius: number = 0;

  constructor(config: PieRenderPassConfig) {
    this.gl = config.gl;
    this.getShaderProgram = config.getShaderProgram;
    this.pixelRatio = config.pixelRatio;
    this.segmentsPerSlice = config.segmentsPerSlice ?? 30;
    this.hoverBrighten = config.hoverBrighten ?? 1.2;
  }

  /**
   * Initialize shader and GPU resources
   */
  private ensureInitialized(): void {
    if (this.shader) return;

    const { gl } = this;

    // Get or create shader
    this.shader = this.getShaderProgram('pie', PIE_SHADER);

    // Create VAO
    this.vao = gl.createVertexArray();
    if (!this.vao) {
      throw new Error('Failed to create VAO for pie render pass');
    }

    // Create buffer
    this.buffer = gl.createBuffer();
    if (!this.buffer) {
      throw new Error('Failed to create buffer for pie render pass');
    }
  }

  /**
   * Update slice data
   */
  updateData(
    slices: PieSlice[],
    centerX: number,
    centerY: number,
    innerRadius: number,
    outerRadius: number,
    explodeOffset: number = 0
  ): void {
    this.slices = slices;
    this.centerX = centerX;
    this.centerY = centerY;
    this.innerRadius = innerRadius;
    this.outerRadius = outerRadius;
    this.uploadSliceData(explodeOffset);
  }

  /**
   * Upload slice data to GPU
   */
  private uploadSliceData(explodeOffset: number): void {
    this.ensureInitialized();

    const { gl } = this;
    const vertices: number[] = [];

    // Build vertex data for all slices
    // Each slice is a triangle strip: alternating inner/outer vertices along the arc
    // Vertex format: [x, y, r, g, b, a, hovered, selected] = 8 floats
    for (const slice of this.slices) {
      const angleStep = (slice.endAngle - slice.startAngle) / this.segmentsPerSlice;

      // Calculate explode offset for selected slices
      let offsetX = 0;
      let offsetY = 0;
      if (slice.selected && explodeOffset > 0) {
        const midAngle = (slice.startAngle + slice.endAngle) / 2;
        offsetX = Math.cos(midAngle) * explodeOffset * this.pixelRatio;
        offsetY = Math.sin(midAngle) * explodeOffset * this.pixelRatio;
      }

      const cx = this.centerX + offsetX;
      const cy = this.centerY + offsetY;
      const [r, g, b, a] = slice.color;
      const hovered = slice.hovered ? 1.0 : 0.0;
      const selected = slice.selected ? 1.0 : 0.0;

      // Generate triangle strip vertices
      for (let i = 0; i <= this.segmentsPerSlice; i++) {
        const angle = slice.startAngle + angleStep * i;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Inner vertex
        const innerX = cx + cos * this.innerRadius;
        const innerY = cy + sin * this.innerRadius;
        vertices.push(innerX, innerY, r, g, b, a, hovered, selected);

        // Outer vertex
        const outerX = cx + cos * this.outerRadius;
        const outerY = cy + sin * this.outerRadius;
        vertices.push(outerX, outerY, r, g, b, a, hovered, selected);
      }

      // Add degenerate triangles to separate slices (unless it's the last slice)
      if (slice !== this.slices[this.slices.length - 1]) {
        // Repeat last vertex twice
        const lastAngle = slice.endAngle;
        const lastCos = Math.cos(lastAngle);
        const lastSin = Math.sin(lastAngle);
        const lastOuterX = cx + lastCos * this.outerRadius;
        const lastOuterY = cy + lastSin * this.outerRadius;
        vertices.push(lastOuterX, lastOuterY, r, g, b, a, hovered, selected);

        // Get next slice's first vertex (will be added at start of next iteration)
        const nextSlice = this.slices[this.slices.indexOf(slice) + 1];
        if (nextSlice) {
          let nextOffsetX = 0;
          let nextOffsetY = 0;
          if (nextSlice.selected && explodeOffset > 0) {
            const nextMidAngle = (nextSlice.startAngle + nextSlice.endAngle) / 2;
            nextOffsetX = Math.cos(nextMidAngle) * explodeOffset * this.pixelRatio;
            nextOffsetY = Math.sin(nextMidAngle) * explodeOffset * this.pixelRatio;
          }
          const nextCx = this.centerX + nextOffsetX;
          const nextCy = this.centerY + nextOffsetY;
          const nextAngle = nextSlice.startAngle;
          const nextCos = Math.cos(nextAngle);
          const nextSin = Math.sin(nextAngle);
          const nextInnerX = nextCx + nextCos * this.innerRadius;
          const nextInnerY = nextCy + nextSin * this.innerRadius;
          const [nr, ng, nb, na] = nextSlice.color;
          const nextHovered = nextSlice.hovered ? 1.0 : 0.0;
          const nextSelected = nextSlice.selected ? 1.0 : 0.0;
          vertices.push(nextInnerX, nextInnerY, nr, ng, nb, na, nextHovered, nextSelected);
        }
      }
    }

    const vertexData = new Float32Array(vertices);
    this.vertexCount = vertices.length / 8; // 8 floats per vertex

    // Upload to GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Update hover state for a slice
   */
  setHoveredSlice(index: number | null, explodeOffset: number = 0): void {
    let changed = false;
    for (let i = 0; i < this.slices.length; i++) {
      const shouldBeHovered = i === index;
      if (this.slices[i].hovered !== shouldBeHovered) {
        this.slices[i].hovered = shouldBeHovered;
        changed = true;
      }
    }
    if (changed) {
      this.uploadSliceData(explodeOffset);
    }
  }

  /**
   * Update selection state for a slice
   */
  setSelectedSlice(index: number | null, explodeOffset: number = 0): void {
    let changed = false;
    for (let i = 0; i < this.slices.length; i++) {
      const shouldBeSelected = i === index;
      if (this.slices[i].selected !== shouldBeSelected) {
        this.slices[i].selected = shouldBeSelected;
        changed = true;
      }
    }
    if (changed) {
      this.uploadSliceData(explodeOffset);
    }
  }

  /**
   * Toggle selection state for a slice
   */
  toggleSelectedSlice(index: number, explodeOffset: number = 0): void {
    if (index >= 0 && index < this.slices.length) {
      this.slices[index].selected = !this.slices[index].selected;
      this.uploadSliceData(explodeOffset);
    }
  }

  /**
   * Get slices for external use
   */
  getSlices(): PieSlice[] {
    return this.slices;
  }

  /**
   * Hit test to find slice at pixel coordinates
   */
  hitTest(pixelX: number, pixelY: number): PieSlice | null {
    const dx = pixelX - this.centerX;
    const dy = pixelY - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if within the ring
    if (distance < this.innerRadius || distance > this.outerRadius) {
      return null;
    }

    // Calculate angle (atan2 gives us angle from -PI to PI)
    let angle = Math.atan2(dy, dx);

    // Find slice containing this angle
    for (const slice of this.slices) {
      // Normalize angles for comparison
      let start = slice.startAngle;
      let end = slice.endAngle;
      let testAngle = angle;

      // Handle angle wrapping
      // Normalize to 0 to 2PI range
      while (start < 0) start += Math.PI * 2;
      while (end < 0) end += Math.PI * 2;
      while (testAngle < 0) testAngle += Math.PI * 2;

      // Check if angle is within slice
      if (end > start) {
        if (testAngle >= start && testAngle <= end) {
          return slice;
        }
      } else {
        // Slice wraps around 0
        if (testAngle >= start || testAngle <= end) {
          return slice;
        }
      }
    }

    // Also check with original angle for slices that might span across -PI/PI boundary
    for (const slice of this.slices) {
      if (angle >= slice.startAngle && angle <= slice.endAngle) {
        return slice;
      }
    }

    return null;
  }

  /**
   * Update pixel ratio
   */
  setPixelRatio(pixelRatio: number): void {
    this.pixelRatio = pixelRatio;
  }

  /**
   * Update hover brightness
   */
  setHoverBrighten(brighten: number): void {
    this.hoverBrighten = brighten;
  }

  /**
   * Render the pie slices
   */
  render(ctx: RenderContext, _state: ChartState): void {
    if (this.vertexCount === 0) return;

    this.ensureInitialized();

    const { gl } = this;
    const shader = this.shader!;

    // Setup VAO
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    const stride = 8 * Float32Array.BYTES_PER_ELEMENT;

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

    // a_selected (float)
    const selectedLoc = shader.attributes.get('a_selected');
    if (selectedLoc !== undefined) {
      gl.enableVertexAttribArray(selectedLoc);
      gl.vertexAttribPointer(selectedLoc, 1, gl.FLOAT, false, stride, 7 * Float32Array.BYTES_PER_ELEMENT);
    }

    // Activate shader
    shader.use(gl);

    // Set uniforms
    shader.setUniform('u_resolution', [ctx.width, ctx.height]);
    shader.setUniform('u_pixelRatio', ctx.pixelRatio);
    shader.setUniform('u_hoverBrighten', this.hoverBrighten);

    // Draw triangle strip
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.vertexCount);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Clear all slice data
   */
  clear(): void {
    this.slices = [];
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
    this.slices = [];
  }
}
