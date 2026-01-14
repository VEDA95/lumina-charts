/**
 * Bar chart shaders
 */

import { buildVertexShader, buildFragmentShader } from './common.js';
import type { ShaderSource } from '../types/index.js';

/**
 * Basic bar shader - renders solid colored rectangles
 * Bars are rendered as two triangles (6 vertices per bar)
 * Input coordinates are in pixel space
 */
export const BAR_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
in vec2 a_position;  // Pixel coordinates
in vec4 a_color;

out vec4 v_color;

void main() {
  vec2 clipPos = pixelToClip(a_position);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);
  v_color = a_color;
}
`),

  fragment: buildFragmentShader(`
in vec4 v_color;

out vec4 fragColor;

void main() {
  fragColor = v_color;
}
`),
};

/**
 * Bar shader with border/stroke support
 * Each vertex includes edge distance for border calculation
 */
export const BAR_WITH_BORDER_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
in vec2 a_position;  // Pixel coordinates
in vec4 a_color;
in vec4 a_barBounds; // left, top, right, bottom in pixels

out vec4 v_color;
out vec4 v_barBounds;
out vec2 v_pixelPos;

void main() {
  vec2 clipPos = pixelToClip(a_position);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);
  v_color = a_color;
  v_barBounds = a_barBounds;
  v_pixelPos = a_position;
}
`),

  fragment: buildFragmentShader(`
in vec4 v_color;
in vec4 v_barBounds;
in vec2 v_pixelPos;

uniform float u_borderWidth;
uniform vec4 u_borderColor;

out vec4 fragColor;

void main() {
  // Calculate distance from edges
  float distLeft = v_pixelPos.x - v_barBounds.x;
  float distRight = v_barBounds.z - v_pixelPos.x;
  float distTop = v_pixelPos.y - v_barBounds.y;
  float distBottom = v_barBounds.w - v_pixelPos.y;

  float minDist = min(min(distLeft, distRight), min(distTop, distBottom));

  // Border region
  if (minDist < u_borderWidth) {
    fragColor = u_borderColor;
  } else {
    fragColor = v_color;
  }
}
`),
};
