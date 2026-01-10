/**
 * WebGL renderer types
 */

import type { ChartState } from './chart.js';

/**
 * Configuration for WebGL renderer initialization
 */
export interface WebGLRendererConfig {
  /** Target canvas element */
  canvas: HTMLCanvasElement;
  /** Enable antialiasing */
  antialias?: boolean;
  /** Enable alpha channel */
  alpha?: boolean;
  /** Use premultiplied alpha */
  premultipliedAlpha?: boolean;
  /** Preserve drawing buffer contents */
  preserveDrawingBuffer?: boolean;
  /** GPU power preference */
  powerPreference?: 'default' | 'high-performance' | 'low-power';
  /** Device pixel ratio override */
  pixelRatio?: number;
}

/**
 * Context passed to render passes
 */
export interface RenderContext {
  /** WebGL2 rendering context */
  gl: WebGL2RenderingContext;
  /** Canvas element */
  canvas: HTMLCanvasElement;
  /** Current pixel ratio */
  pixelRatio: number;
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Projection matrix (4x4) */
  projectionMatrix: Float32Array;
  /** View matrix (4x4) */
  viewMatrix: Float32Array;
}

/**
 * A render pass executes a specific rendering stage
 */
export interface RenderPass {
  /** Unique identifier for this pass */
  id: string;
  /** Render order (lower = earlier) */
  order: number;
  /** Whether this pass is enabled */
  enabled: boolean;
  /** Execute the render pass */
  render(ctx: RenderContext, state: ChartState): void;
  /** Clean up GPU resources */
  dispose(): void;
}

/**
 * Compiled shader program wrapper
 */
export interface ShaderProgram {
  /** WebGL program object */
  program: WebGLProgram;
  /** Map of uniform names to locations */
  uniforms: Map<string, WebGLUniformLocation>;
  /** Map of attribute names to locations */
  attributes: Map<string, number>;
  /** Activate this program */
  use(gl: WebGL2RenderingContext): void;
  /** Set a uniform value */
  setUniform(name: string, value: UniformValue): void;
  /** Clean up program resources */
  dispose(): void;
}

/**
 * Supported uniform value types
 */
export type UniformValue =
  | number
  | boolean
  | Float32Array
  | Int32Array
  | Uint32Array
  | readonly [number, number]
  | readonly [number, number, number]
  | readonly [number, number, number, number];

/**
 * Shader source definition
 */
export interface ShaderSource {
  /** Vertex shader GLSL source */
  vertex: string;
  /** Fragment shader GLSL source */
  fragment: string;
}

/**
 * Viewport dimensions and position
 */
export interface Viewport {
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}
