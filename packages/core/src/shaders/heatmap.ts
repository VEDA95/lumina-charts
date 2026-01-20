/**
 * Heatmap chart shaders
 * Uses the same vertex format as bar/boxplot: [x, y, r, g, b, a, hovered]
 */

import { buildVertexShader, buildFragmentShader } from './common.js';
import type { ShaderSource } from '../types/index.js';

/**
 * Heatmap cell shader - renders solid colored rectangles for each cell
 * Cells are rendered as two triangles (6 vertices per cell)
 * Input coordinates are in pixel space
 */
export const HEATMAP_CELL_SHADER: ShaderSource = {
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
