/**
 * Point/scatter plot shaders
 */

import { buildVertexShader, buildFragmentShader } from './common.js';
import type { ShaderSource } from '../types/index.js';

/**
 * Point shader for scatter plots
 * Supports multiple shapes: circle, square, triangle, diamond
 */
export const POINT_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
// Per-vertex attributes
in vec2 a_position;    // Data coordinates (x, y)
in vec4 a_color;       // RGBA color
in float a_size;       // Point size in pixels
in float a_shape;      // Shape: 0=circle, 1=square, 2=triangle, 3=diamond

// Outputs to fragment shader
out vec4 v_color;
out float v_size;
out float v_shape;

void main() {
  // Transform data coordinates to clip space
  vec2 pixelPos = dataToPixel(a_position);
  vec2 clipPos = pixelToClip(pixelPos);

  // Flip Y axis (WebGL has Y up, we want Y down for screen coords)
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);
  gl_PointSize = a_size * u_pixelRatio;

  v_color = a_color;
  v_size = a_size;
  v_shape = a_shape;
}
`),

  fragment: buildFragmentShader(`
in vec4 v_color;
in float v_size;
in float v_shape;

out vec4 fragColor;

void main() {
  // gl_PointCoord is [0, 1] from top-left
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  float dist = length(coord);
  float alpha = v_color.a;

  // Circle (shape = 0)
  if (v_shape < 0.5) {
    // Anti-aliased circle edge
    float edgeWidth = 2.0 / v_size;
    alpha *= 1.0 - smoothstep(1.0 - edgeWidth, 1.0, dist);
  }
  // Square (shape = 1)
  else if (v_shape < 1.5) {
    // Square is the default - no modification needed
    float maxDist = max(abs(coord.x), abs(coord.y));
    float edgeWidth = 2.0 / v_size;
    alpha *= 1.0 - smoothstep(1.0 - edgeWidth, 1.0, maxDist);
  }
  // Triangle (shape = 2)
  else if (v_shape < 2.5) {
    // Equilateral triangle pointing up
    float d = max(
      abs(coord.x) * 0.866025404 + coord.y * 0.5,  // 0.866 = sqrt(3)/2
      -coord.y * 0.5 - 0.25
    );
    float edgeWidth = 2.0 / v_size;
    alpha *= 1.0 - smoothstep(0.5 - edgeWidth, 0.5, d);
  }
  // Diamond (shape = 3)
  else {
    float d = abs(coord.x) + abs(coord.y);
    float edgeWidth = 2.0 / v_size;
    alpha *= 1.0 - smoothstep(1.0 - edgeWidth, 1.0, d);
  }

  if (alpha < 0.01) discard;

  fragColor = vec4(v_color.rgb, alpha);
}
`),
};

/**
 * Point shader with outline/stroke support
 */
export const POINT_WITH_STROKE_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
in vec2 a_position;
in vec4 a_fillColor;
in vec4 a_strokeColor;
in float a_size;
in float a_strokeWidth;
in float a_shape;

out vec4 v_fillColor;
out vec4 v_strokeColor;
out float v_size;
out float v_strokeWidth;
out float v_shape;

void main() {
  vec2 pixelPos = dataToPixel(a_position);
  vec2 clipPos = pixelToClip(pixelPos);
  clipPos.y = -clipPos.y;

  // Increase point size to accommodate stroke
  float totalSize = a_size + a_strokeWidth * 2.0;

  gl_Position = vec4(clipPos, 0.0, 1.0);
  gl_PointSize = totalSize * u_pixelRatio;

  v_fillColor = a_fillColor;
  v_strokeColor = a_strokeColor;
  v_size = a_size;
  v_strokeWidth = a_strokeWidth;
  v_shape = a_shape;
}
`),

  fragment: buildFragmentShader(`
in vec4 v_fillColor;
in vec4 v_strokeColor;
in float v_size;
in float v_strokeWidth;
in float v_shape;

out vec4 fragColor;

void main() {
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  float totalSize = v_size + v_strokeWidth * 2.0;

  // Scale coord to account for stroke padding
  float scale = totalSize / v_size;
  vec2 scaledCoord = coord * scale;

  float dist = length(scaledCoord);

  // Circle only for now (simplest case with stroke)
  float innerRadius = 1.0;
  float outerRadius = 1.0 + (v_strokeWidth * 2.0 / v_size);

  float edgeWidth = 2.0 / v_size;

  // Fill region
  float fillAlpha = 1.0 - smoothstep(innerRadius - edgeWidth, innerRadius, dist);

  // Stroke region (between inner and outer)
  float strokeAlpha = (1.0 - smoothstep(outerRadius - edgeWidth, outerRadius, dist))
                    * smoothstep(innerRadius - edgeWidth, innerRadius, dist);

  vec4 color = mix(
    vec4(v_strokeColor.rgb, v_strokeColor.a * strokeAlpha),
    vec4(v_fillColor.rgb, v_fillColor.a * fillAlpha),
    fillAlpha
  );

  if (color.a < 0.01) discard;

  fragColor = color;
}
`),
};

/**
 * Instanced point shader for rendering many identical points efficiently
 */
export const INSTANCED_POINT_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
// Per-vertex (quad corners)
in vec2 a_quadVertex;  // [-1, 1] for quad corners

// Per-instance attributes
in vec2 a_position;
in vec4 a_color;
in float a_size;
in float a_shape;

out vec4 v_color;
out vec2 v_quadCoord;
out float v_shape;
out float v_size;

void main() {
  vec2 pixelPos = dataToPixel(a_position);

  // Offset by quad vertex scaled by point size
  vec2 offset = a_quadVertex * a_size * 0.5 * u_pixelRatio;
  pixelPos += offset;

  vec2 clipPos = pixelToClip(pixelPos);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);

  v_color = a_color;
  v_quadCoord = a_quadVertex;
  v_shape = a_shape;
  v_size = a_size;
}
`),

  fragment: buildFragmentShader(`
in vec4 v_color;
in vec2 v_quadCoord;
in float v_shape;
in float v_size;

out vec4 fragColor;

void main() {
  float dist = length(v_quadCoord);
  float alpha = v_color.a;

  // Circle
  if (v_shape < 0.5) {
    float edgeWidth = 2.0 / v_size;
    alpha *= 1.0 - smoothstep(1.0 - edgeWidth, 1.0, dist);
  }
  // Square
  else if (v_shape < 1.5) {
    float maxDist = max(abs(v_quadCoord.x), abs(v_quadCoord.y));
    float edgeWidth = 2.0 / v_size;
    alpha *= 1.0 - smoothstep(1.0 - edgeWidth, 1.0, maxDist);
  }
  // Triangle
  else if (v_shape < 2.5) {
    float d = max(
      abs(v_quadCoord.x) * 0.866025404 + v_quadCoord.y * 0.5,
      -v_quadCoord.y * 0.5 - 0.25
    );
    float edgeWidth = 2.0 / v_size;
    alpha *= 1.0 - smoothstep(0.5 - edgeWidth, 0.5, d);
  }
  // Diamond
  else {
    float d = abs(v_quadCoord.x) + abs(v_quadCoord.y);
    float edgeWidth = 2.0 / v_size;
    alpha *= 1.0 - smoothstep(1.0 - edgeWidth, 1.0, d);
  }

  if (alpha < 0.01) discard;

  fragColor = vec4(v_color.rgb, alpha);
}
`),
};
