/**
 * Pie/Donut chart shaders
 */

import { buildVertexShader, buildFragmentShader } from './common.js';
import type { ShaderSource } from '../types/index.js';

/**
 * Basic pie slice shader - renders colored wedges
 * Slices are rendered as triangle strips (vertices alternate inner/outer radius)
 * Input coordinates are in pixel space (pre-calculated from polar)
 */
export const PIE_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
in vec2 a_position;     // Pixel coordinates (already transformed from polar)
in vec4 a_color;        // Slice color
in float a_hovered;     // 1.0 if hovered, 0.0 otherwise
in float a_selected;    // 1.0 if selected, 0.0 otherwise

out vec4 v_color;
out float v_hovered;
out float v_selected;

uniform float u_hoverBrighten;  // Brightness multiplier for hover (default: 1.2)

void main() {
  vec2 clipPos = pixelToClip(a_position);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);

  // Apply hover brightening
  vec4 color = a_color;
  if (a_hovered > 0.5) {
    color.rgb = min(color.rgb * u_hoverBrighten, vec3(1.0));
  }

  v_color = color;
  v_hovered = a_hovered;
  v_selected = a_selected;
}
`),

  fragment: buildFragmentShader(`
in vec4 v_color;
in float v_hovered;
in float v_selected;

out vec4 fragColor;

void main() {
  fragColor = v_color;
}
`),
};

/**
 * Pie slice shader with border support
 * Uses radial distance to detect edges
 */
export const PIE_WITH_BORDER_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
in vec2 a_position;     // Pixel coordinates
in vec4 a_color;        // Slice color
in float a_hovered;     // 1.0 if hovered
in float a_selected;    // 1.0 if selected
in vec2 a_center;       // Center of pie in pixels
in float a_innerRadius; // Inner radius in pixels
in float a_outerRadius; // Outer radius in pixels
in float a_startAngle;  // Start angle in radians
in float a_endAngle;    // End angle in radians

out vec4 v_color;
out float v_hovered;
out float v_selected;
out vec2 v_center;
out float v_innerRadius;
out float v_outerRadius;
out float v_startAngle;
out float v_endAngle;
out vec2 v_pixelPos;

uniform float u_hoverBrighten;

void main() {
  vec2 clipPos = pixelToClip(a_position);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);

  vec4 color = a_color;
  if (a_hovered > 0.5) {
    color.rgb = min(color.rgb * u_hoverBrighten, vec3(1.0));
  }

  v_color = color;
  v_hovered = a_hovered;
  v_selected = a_selected;
  v_center = a_center;
  v_innerRadius = a_innerRadius;
  v_outerRadius = a_outerRadius;
  v_startAngle = a_startAngle;
  v_endAngle = a_endAngle;
  v_pixelPos = a_position;
}
`),

  fragment: buildFragmentShader(`
in vec4 v_color;
in float v_hovered;
in float v_selected;
in vec2 v_center;
in float v_innerRadius;
in float v_outerRadius;
in float v_startAngle;
in float v_endAngle;
in vec2 v_pixelPos;

uniform float u_borderWidth;
uniform vec4 u_borderColor;

out vec4 fragColor;

void main() {
  vec2 fromCenter = v_pixelPos - v_center;
  float dist = length(fromCenter);

  // Calculate distance from radial edges
  float distFromInner = dist - v_innerRadius;
  float distFromOuter = v_outerRadius - dist;

  // Calculate angle
  float angle = atan(fromCenter.y, fromCenter.x);

  // Normalize angle difference for edge detection
  float angularWidth = v_endAngle - v_startAngle;
  float midAngle = (v_startAngle + v_endAngle) * 0.5;

  // Distance from angular edges (in pixels, approximate)
  float avgRadius = (v_innerRadius + v_outerRadius) * 0.5;
  float distFromStartEdge = (angle - v_startAngle) * avgRadius;
  float distFromEndEdge = (v_endAngle - angle) * avgRadius;

  // Find minimum distance from any edge
  float minDist = min(min(distFromInner, distFromOuter), min(abs(distFromStartEdge), abs(distFromEndEdge)));

  // Border detection
  if (u_borderWidth > 0.0 && minDist < u_borderWidth) {
    fragColor = u_borderColor;
  } else {
    fragColor = v_color;
  }
}
`),
};
