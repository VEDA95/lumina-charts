/**
 * Network chart shaders
 * Nodes: Circles rendered using instanced quads with SDF
 * Edges: Quadratic bezier curves tessellated into triangle strips
 */

import { buildVertexShader, buildFragmentShader } from './common.js';
import type { ShaderSource } from '../types/index.js';

/**
 * Node shader - renders circles using instanced quads with SDF
 * Uses instancing: quad vertices are reused, per-node data in instance buffer
 */
export const NETWORK_NODE_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
// Per-vertex (quad corners: -1 to 1)
in vec2 a_quadVertex;

// Per-instance attributes
in vec2 a_position;      // Pixel position (center)
in vec4 a_color;         // RGBA color
in float a_radius;       // Radius in pixels
in float a_highlighted;  // 1.0 if connected to hovered node
in float a_hovered;      // 1.0 if this node is hovered
in float a_selected;     // 1.0 if this node is selected

out vec4 v_color;
out vec2 v_quadCoord;
out float v_highlighted;
out float v_hovered;
out float v_selected;

uniform float u_dimOpacity;

void main() {
  // Offset quad vertex by radius to create sized quad
  vec2 pixelPos = a_position + a_quadVertex * (a_radius + 2.0);

  vec2 clipPos = pixelToClip(pixelPos);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);

  // Dim nodes not connected to hovered node (when something is hovered)
  float alpha = a_color.a;
  if (a_highlighted < 0.5 && a_hovered < 0.5 && u_dimOpacity < 1.0) {
    alpha *= u_dimOpacity;
  }

  v_color = vec4(a_color.rgb, alpha);
  v_quadCoord = a_quadVertex;
  v_highlighted = a_highlighted;
  v_hovered = a_hovered;
  v_selected = a_selected;
}
`),

  fragment: buildFragmentShader(`
in vec4 v_color;
in vec2 v_quadCoord;
in float v_highlighted;
in float v_hovered;
in float v_selected;

out vec4 fragColor;

uniform float u_hoverBrighten;

void main() {
  float dist = length(v_quadCoord);

  // Anti-aliased circle edge
  float alpha = 1.0 - smoothstep(0.9, 1.0, dist);

  if (alpha < 0.01) discard;

  vec3 color = v_color.rgb;

  // Brighten on hover
  if (v_hovered > 0.5) {
    color = min(color * u_hoverBrighten, vec3(1.0));
  }

  // Add selection ring (white outline)
  if (v_selected > 0.5) {
    float ringInner = 0.75;
    float ringOuter = 0.9;
    float ring = smoothstep(ringInner - 0.05, ringInner, dist) * (1.0 - smoothstep(ringOuter, ringOuter + 0.05, dist));
    color = mix(color, vec3(1.0), ring * 0.7);
  }

  fragColor = vec4(color, v_color.a * alpha);
}
`),
};

/**
 * Edge shader - renders bezier curves as triangle strips
 * Vertices are pre-tessellated on CPU, uploaded as triangles
 */
export const NETWORK_EDGE_SHADER: ShaderSource = {
  vertex: buildVertexShader(`
in vec2 a_position;      // Pixel position (tessellated bezier point)
in vec4 a_color;         // RGBA color
in float a_edgeDist;     // Distance from line center (-1 to 1)
in float a_highlighted;  // 1.0 if edge is highlighted

out vec4 v_color;
out float v_edgeDist;

uniform float u_dimOpacity;

void main() {
  vec2 clipPos = pixelToClip(a_position);
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);

  // Dim edges not connected to hovered node
  float alpha = a_color.a;
  if (a_highlighted < 0.5 && u_dimOpacity < 1.0) {
    alpha *= u_dimOpacity;
  }

  v_color = vec4(a_color.rgb, alpha);
  v_edgeDist = a_edgeDist;
}
`),

  fragment: buildFragmentShader(`
in vec4 v_color;
in float v_edgeDist;

out vec4 fragColor;

void main() {
  // Anti-alias the edge using distance from center
  float dist = abs(v_edgeDist);
  float alpha = v_color.a * (1.0 - smoothstep(0.6, 1.0, dist));

  if (alpha < 0.01) discard;

  fragColor = vec4(v_color.rgb, alpha);
}
`),
};
