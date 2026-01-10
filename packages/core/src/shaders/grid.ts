/**
 * Grid and axis shaders
 */

import { buildVertexShader, buildFragmentShader } from './common.js';
import type { ShaderSource } from '../types/index.js';

/**
 * Grid line shader
 */
export const GRID_SHADER: ShaderSource = {
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
 * Dashed grid line shader
 */
export const DASHED_GRID_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
in vec2 a_position;     // Pixel coordinates
in vec2 a_startPos;     // Start of line (for dash calculation)
in vec4 a_color;

out vec4 v_color;
out float v_lineDist;

void main() {
  vec2 clipPos = pixelToClip(a_position);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);
  v_color = a_color;
  v_lineDist = distance(a_position, a_startPos);
}
`),

  fragment: buildFragmentShader(`
in vec4 v_color;
in float v_lineDist;

uniform float u_dashLength;
uniform float u_gapLength;

out vec4 fragColor;

void main() {
  float patternLength = u_dashLength + u_gapLength;
  float patternPos = mod(v_lineDist, patternLength);

  if (patternPos > u_dashLength) {
    discard;
  }

  fragColor = v_color;
}
`),
};

/**
 * Crosshair shader
 */
export const CROSSHAIR_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
in vec2 a_position;  // Pixel coordinates

uniform vec4 u_color;

out vec4 v_color;

void main() {
  vec2 clipPos = pixelToClip(a_position);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);
  v_color = u_color;
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
 * Selection box/brush shader
 */
export const SELECTION_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
in vec2 a_position;  // Pixel coordinates

void main() {
  vec2 clipPos = pixelToClip(a_position);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);
}
`),

  fragment: buildFragmentShader(`
uniform vec4 u_fillColor;
uniform vec4 u_strokeColor;
uniform float u_strokeWidth;
uniform vec2 u_boxMin;     // Min corner in pixels
uniform vec2 u_boxMax;     // Max corner in pixels

out vec4 fragColor;

void main() {
  vec2 fragCoord = gl_FragCoord.xy;

  // Distance from edges
  float distLeft = fragCoord.x - u_boxMin.x;
  float distRight = u_boxMax.x - fragCoord.x;
  float distBottom = fragCoord.y - u_boxMin.y;
  float distTop = u_boxMax.y - fragCoord.y;

  float minDist = min(min(distLeft, distRight), min(distBottom, distTop));

  // Stroke region
  if (minDist < u_strokeWidth) {
    fragColor = u_strokeColor;
  } else {
    fragColor = u_fillColor;
  }
}
`),
};

/**
 * Zoom lens shader (magnifying glass effect)
 */
export const ZOOM_LENS_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
in vec2 a_position;
in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
  vec2 clipPos = pixelToClip(a_position);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`),

  fragment: buildFragmentShader(`
in vec2 v_texCoord;

uniform sampler2D u_texture;
uniform vec2 u_center;        // Lens center in texture coords
uniform float u_radius;       // Lens radius in texture coords
uniform float u_magnification;
uniform vec4 u_borderColor;
uniform float u_borderWidth;

out vec4 fragColor;

void main() {
  vec2 fromCenter = v_texCoord - u_center;
  float dist = length(fromCenter);

  // Outside lens
  if (dist > u_radius) {
    discard;
  }

  // Border
  if (dist > u_radius - u_borderWidth) {
    fragColor = u_borderColor;
    return;
  }

  // Magnified sampling
  vec2 magnifiedCoord = u_center + fromCenter / u_magnification;
  fragColor = texture(u_texture, magnifiedCoord);
}
`),
};
