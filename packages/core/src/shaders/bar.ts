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

/**
 * Bar shader with rounded corners using SDF (Signed Distance Function)
 * Renders smooth, anti-aliased rounded rectangles
 */
export const BAR_ROUNDED_SHADER: ShaderSource = {
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

uniform float u_cornerRadius;

out vec4 fragColor;

// Signed distance function for a rounded box
// p: point to test, center: box center, halfSize: half dimensions, radius: corner radius
float sdRoundedBox(vec2 p, vec2 center, vec2 halfSize, float radius) {
  vec2 q = abs(p - center) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

void main() {
  // Bar bounds: left, top, right, bottom
  vec2 center = vec2(
    (v_barBounds.x + v_barBounds.z) * 0.5,
    (v_barBounds.y + v_barBounds.w) * 0.5
  );
  vec2 halfSize = vec2(
    (v_barBounds.z - v_barBounds.x) * 0.5,
    (v_barBounds.w - v_barBounds.y) * 0.5
  );

  // Clamp corner radius to not exceed half of smallest dimension
  float maxRadius = min(halfSize.x, halfSize.y);
  float radius = min(u_cornerRadius, maxRadius);

  // Calculate signed distance
  float dist = sdRoundedBox(v_pixelPos, center, halfSize, radius);

  // Anti-alias the edge with smooth transition
  float alpha = 1.0 - smoothstep(-1.0, 1.0, dist);

  // Discard fully transparent pixels
  if (alpha < 0.01) discard;

  fragColor = vec4(v_color.rgb, v_color.a * alpha);
}
`),
};
