/**
 * Candlestick chart shaders
 */

import { buildVertexShader, buildFragmentShader } from './common.js';
import type { ShaderSource } from '../types/index.js';

/**
 * Candlestick body shader - renders solid colored rectangles for candle bodies
 * Bodies are rendered as two triangles (6 vertices per candle)
 * Input coordinates are in pixel space
 */
export const CANDLESTICK_BODY_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
in vec2 a_position;  // Pixel coordinates
in vec4 a_color;
in float a_hovered;  // 1.0 if hovered, 0.0 otherwise

out vec4 v_color;

uniform float u_hoverBrighten;

void main() {
  vec2 clipPos = pixelToClip(a_position);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);

  // Apply brightness when hovered
  if (a_hovered > 0.5) {
    v_color = vec4(a_color.rgb * u_hoverBrighten, a_color.a);
  } else {
    v_color = a_color;
  }
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
 * Candlestick wick shader - renders thin lines for high-low range
 * Wicks are rendered as GL_LINES (2 vertices per wick)
 * Input coordinates are in pixel space
 */
export const CANDLESTICK_WICK_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
in vec2 a_position;  // Pixel coordinates
in vec4 a_color;
in float a_hovered;  // 1.0 if hovered, 0.0 otherwise

out vec4 v_color;

uniform float u_hoverBrighten;

void main() {
  vec2 clipPos = pixelToClip(a_position);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);

  // Apply brightness when hovered
  if (a_hovered > 0.5) {
    v_color = vec4(a_color.rgb * u_hoverBrighten, a_color.a);
  } else {
    v_color = a_color;
  }
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
 * Combined candlestick shader with border support for bodies
 * Each vertex includes bounds for border calculation
 */
export const CANDLESTICK_BODY_BORDER_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
in vec2 a_position;  // Pixel coordinates
in vec4 a_color;
in vec4 a_bounds;    // left, top, right, bottom in pixels
in float a_hovered;  // 1.0 if hovered, 0.0 otherwise

out vec4 v_color;
out vec4 v_bounds;
out vec2 v_pixelPos;

uniform float u_hoverBrighten;

void main() {
  vec2 clipPos = pixelToClip(a_position);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);
  v_bounds = a_bounds;
  v_pixelPos = a_position;

  // Apply brightness when hovered
  if (a_hovered > 0.5) {
    v_color = vec4(a_color.rgb * u_hoverBrighten, a_color.a);
  } else {
    v_color = a_color;
  }
}
`),

  fragment: buildFragmentShader(`
in vec4 v_color;
in vec4 v_bounds;
in vec2 v_pixelPos;

uniform float u_borderWidth;
uniform vec4 u_borderColor;

out vec4 fragColor;

void main() {
  // Calculate distance from edges
  float distLeft = v_pixelPos.x - v_bounds.x;
  float distRight = v_bounds.z - v_pixelPos.x;
  float distTop = v_pixelPos.y - v_bounds.y;
  float distBottom = v_bounds.w - v_pixelPos.y;

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
