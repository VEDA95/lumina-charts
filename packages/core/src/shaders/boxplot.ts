/**
 * Boxplot chart shaders
 * Reuses the same vertex format as candlestick: [x, y, r, g, b, a, hovered]
 */

import { buildVertexShader, buildFragmentShader } from './common.js';
import type { ShaderSource } from '../types/index.js';

/**
 * Box body shader - renders solid colored rectangles for Q1-Q3 range
 * Boxes are rendered as two triangles (6 vertices per box)
 * Input coordinates are in pixel space
 */
export const BOXPLOT_BOX_SHADER: ShaderSource = {
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
 * Whisker/line shader - renders thin lines for whiskers and median
 * Lines are rendered as GL_LINES (2 vertices per line)
 * Input coordinates are in pixel space
 */
export const BOXPLOT_LINE_SHADER: ShaderSource = {
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
 * Outlier point shader - renders small diamond shapes for outlier values
 * Diamonds are rendered as two triangles (6 vertices per outlier)
 * Input coordinates are in pixel space
 */
export const BOXPLOT_OUTLIER_SHADER: ShaderSource = {
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
