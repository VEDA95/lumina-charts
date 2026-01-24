/**
 * Line chart shaders
 */

import { buildVertexShader, buildFragmentShader } from './common.js';
import type { ShaderSource } from '../types/index.js';

/**
 * Line shader using triangle strips for thick, anti-aliased lines
 * Each line segment is rendered as a quad (2 triangles)
 */
export const LINE_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
// Per-vertex attributes
in vec2 a_position;      // Current point position (data coords)
in vec2 a_nextPosition;  // Next point position (data coords)
in float a_direction;    // -1 or 1 for left/right side of line
in vec4 a_color;         // Line color
in float a_lineWidth;    // Line width in pixels

out vec4 v_color;
out float v_edgeDist;    // Distance from line center for AA

void main() {
  // Transform both points to pixel space
  vec2 p0 = dataToPixel(a_position);
  vec2 p1 = dataToPixel(a_nextPosition);

  // Calculate line direction and perpendicular
  vec2 dir = p1 - p0;
  float len = length(dir);

  // Handle degenerate case
  if (len < 0.0001) {
    gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
    v_color = vec4(0.0);
    v_edgeDist = 0.0;
    return;
  }

  dir = dir / len;
  vec2 normal = vec2(-dir.y, dir.x);

  // Offset perpendicular to line
  float halfWidth = a_lineWidth * 0.5 * u_pixelRatio;
  vec2 offset = normal * halfWidth * a_direction;

  vec2 pixelPos = p0 + offset;
  vec2 clipPos = pixelToClip(pixelPos);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);
  v_color = a_color;
  v_edgeDist = a_direction; // -1 to 1 across line width
}
`),

  fragment: buildFragmentShader(`
in vec4 v_color;
in float v_edgeDist;

out vec4 fragColor;

void main() {
  // Anti-alias the edge
  float dist = abs(v_edgeDist);
  float alpha = v_color.a * (1.0 - smoothstep(0.7, 1.0, dist));

  if (alpha < 0.01) discard;

  fragColor = vec4(v_color.rgb, alpha);
}
`),
};

/**
 * Simple line shader using GL_LINES (1px width, no AA)
 * Faster but lower quality
 */
export const SIMPLE_LINE_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
in vec2 a_position;
in vec4 a_color;

out vec4 v_color;

void main() {
  vec2 pixelPos = dataToPixel(a_position);
  vec2 clipPos = pixelToClip(pixelPos);
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
 * Line shader with dashed line support
 */
export const DASHED_LINE_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
in vec2 a_position;
in vec2 a_nextPosition;
in float a_direction;
in vec4 a_color;
in float a_lineWidth;
in float a_lineDist;     // Distance along line from start

out vec4 v_color;
out float v_edgeDist;
out float v_lineDist;

uniform float u_dashLength;
uniform float u_gapLength;

void main() {
  vec2 p0 = dataToPixel(a_position);
  vec2 p1 = dataToPixel(a_nextPosition);

  vec2 dir = p1 - p0;
  float len = length(dir);

  if (len < 0.0001) {
    gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  dir = dir / len;
  vec2 normal = vec2(-dir.y, dir.x);

  float halfWidth = a_lineWidth * 0.5 * u_pixelRatio;
  vec2 offset = normal * halfWidth * a_direction;

  vec2 pixelPos = p0 + offset;
  vec2 clipPos = pixelToClip(pixelPos);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);
  v_color = a_color;
  v_edgeDist = a_direction;
  v_lineDist = a_lineDist * u_pixelRatio;
}
`),

  fragment: buildFragmentShader(`
in vec4 v_color;
in float v_edgeDist;
in float v_lineDist;

uniform float u_dashLength;
uniform float u_gapLength;

out vec4 fragColor;

void main() {
  // Dash pattern
  float patternLength = u_dashLength + u_gapLength;
  float patternPos = mod(v_lineDist, patternLength);

  // In gap region
  if (patternPos > u_dashLength) {
    discard;
  }

  // Anti-alias edges
  float dist = abs(v_edgeDist);
  float alpha = v_color.a * (1.0 - smoothstep(0.7, 1.0, dist));

  // Anti-alias dash ends
  float dashEdge = min(patternPos, u_dashLength - patternPos);
  alpha *= smoothstep(0.0, 2.0, dashEdge);

  if (alpha < 0.01) discard;

  fragColor = vec4(v_color.rgb, alpha);
}
`),
};

/**
 * Area fill shader (for area charts / filled line charts)
 */
export const AREA_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
in vec2 a_position;
in vec4 a_color;

out vec4 v_color;
out vec2 v_position;

void main() {
  vec2 pixelPos = dataToPixel(a_position);
  vec2 clipPos = pixelToClip(pixelPos);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);
  v_color = a_color;
  v_position = a_position;
}
`),

  fragment: buildFragmentShader(`
in vec4 v_color;
in vec2 v_position;

out vec4 fragColor;

void main() {
  fragColor = v_color;
}
`),
};

/**
 * Gradient area fill shader
 * Supports both color gradient and opacity gradient modes
 */
export const GRADIENT_AREA_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
in vec2 a_position;
in float a_normalizedY;  // 0 at baseline, 1 at data point

out float v_normalizedY;
out vec2 v_position;

void main() {
  vec2 pixelPos = dataToPixel(a_position);
  vec2 clipPos = pixelToClip(pixelPos);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);
  v_normalizedY = a_normalizedY;
  v_position = a_position;
}
`),

  fragment: buildFragmentShader(`
in float v_normalizedY;
in vec2 v_position;

uniform vec4 u_colorTop;
uniform vec4 u_colorBottom;
uniform float u_opacityTop;    // Optional opacity override at top (0.0 = use color alpha)
uniform float u_opacityBottom; // Optional opacity override at bottom (0.0 = use color alpha)

out vec4 fragColor;

void main() {
  // Linear gradient from bottom to top
  vec4 color = mix(u_colorBottom, u_colorTop, v_normalizedY);

  // Apply opacity gradient if specified (values > 0 override color alpha)
  if (u_opacityTop > 0.0 || u_opacityBottom > 0.0) {
    float topAlpha = u_opacityTop > 0.0 ? u_opacityTop : u_colorTop.a;
    float bottomAlpha = u_opacityBottom > 0.0 ? u_opacityBottom : u_colorBottom.a;
    float alpha = mix(bottomAlpha, topAlpha, v_normalizedY);
    fragColor = vec4(color.rgb, alpha);
  } else {
    fragColor = color;
  }
}
`),
};
