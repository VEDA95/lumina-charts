/**
 * Common shader utilities and headers
 */

/**
 * GLSL version and precision header for vertex shaders
 */
export const VERTEX_HEADER = `#version 300 es
precision highp float;
precision highp int;
`;

/**
 * GLSL version and precision header for fragment shaders
 */
export const FRAGMENT_HEADER = `#version 300 es
precision highp float;
precision highp int;
`;

/**
 * Common uniforms used across all shaders
 */
export const COMMON_UNIFORMS = `
// Projection and view matrices
uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;

// Viewport info
uniform vec2 u_resolution;
uniform float u_pixelRatio;

// Data domain for coordinate transformation
uniform vec2 u_domainMin;
uniform vec2 u_domainMax;

// Plot area bounds (in pixels)
uniform vec4 u_plotBounds; // left, top, right, bottom
`;

/**
 * Utility function to transform data coordinates to normalized device coordinates
 */
export const DATA_TO_NDC = `
// Transform data coordinates to normalized device coordinates [-1, 1]
vec2 dataToNDC(vec2 dataPoint) {
  vec2 normalized = (dataPoint - u_domainMin) / (u_domainMax - u_domainMin);
  return normalized * 2.0 - 1.0;
}
`;

/**
 * Utility function to transform data coordinates to pixel coordinates
 */
export const DATA_TO_PIXEL = `
// Transform data coordinates to pixel coordinates
// u_plotBounds = (left, top, right, bottom)
vec2 dataToPixel(vec2 dataPoint) {
  vec2 normalized = (dataPoint - u_domainMin) / (u_domainMax - u_domainMin);
  // X: left to right (normal)
  float pixelX = u_plotBounds.x + normalized.x * (u_plotBounds.z - u_plotBounds.x);
  // Y: inverted - low data Y (bottom) maps to high pixel Y (bottom of screen)
  float pixelY = u_plotBounds.w - normalized.y * (u_plotBounds.w - u_plotBounds.y);
  return vec2(pixelX, pixelY);
}
`;

/**
 * Utility function to transform pixel coordinates to clip space
 */
export const PIXEL_TO_CLIP = `
// Transform pixel coordinates to clip space [-1, 1]
vec2 pixelToClip(vec2 pixel) {
  return (pixel / u_resolution) * 2.0 - 1.0;
}
`;

/**
 * Utility functions for color manipulation
 */
export const COLOR_UTILS = `
// Premultiply alpha
vec4 premultiplyAlpha(vec4 color) {
  return vec4(color.rgb * color.a, color.a);
}

// Convert HSL to RGB
vec3 hslToRgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;

  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
  float m = l - c / 2.0;

  vec3 rgb;
  if (h < 1.0/6.0) rgb = vec3(c, x, 0.0);
  else if (h < 2.0/6.0) rgb = vec3(x, c, 0.0);
  else if (h < 3.0/6.0) rgb = vec3(0.0, c, x);
  else if (h < 4.0/6.0) rgb = vec3(0.0, x, c);
  else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c);
  else rgb = vec3(c, 0.0, x);

  return rgb + m;
}
`;

/**
 * Anti-aliasing utilities
 */
export const AA_UTILS = `
// Smooth step for anti-aliasing
float aastep(float threshold, float value) {
  float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654752;
  return smoothstep(threshold - afwidth, threshold + afwidth, value);
}

// Smooth edge for anti-aliasing with specified width
float smoothEdge(float edge, float dist, float width) {
  return smoothstep(edge - width, edge + width, dist);
}
`;

/**
 * Build a complete vertex shader with common includes
 */
export function buildVertexShader(mainCode: string, additionalIncludes: string = ''): string {
  return `${VERTEX_HEADER}
${COMMON_UNIFORMS}
${DATA_TO_NDC}
${DATA_TO_PIXEL}
${PIXEL_TO_CLIP}
${additionalIncludes}

${mainCode}`;
}

/**
 * Build a complete fragment shader with common includes
 */
export function buildFragmentShader(mainCode: string, additionalIncludes: string = ''): string {
  return `${FRAGMENT_HEADER}
${COLOR_UTILS}
${AA_UTILS}
${additionalIncludes}

${mainCode}`;
}
