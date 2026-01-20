/**
 * Network chart type definitions
 */

import type { RGBAColor } from './theme.js';
import type { ChartOptions } from './chart.js';

/**
 * Network node data point
 */
export interface NetworkNode {
  /** Unique node identifier */
  id: string;
  /** Optional x position (for pre-positioned layouts) */
  x?: number;
  /** Optional y position (for pre-positioned layouts) */
  y?: number;
  /** Node label for display */
  label?: string;
  /** Node size (relative value, scaled during rendering) */
  size?: number;
  /** Group identifier for coloring */
  group?: string | number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Network edge data point
 */
export interface NetworkEdge {
  /** Source node id */
  source: string;
  /** Target node id */
  target: string;
  /** Edge weight (affects curve/thickness) */
  weight?: number;
  /** Optional edge label */
  label?: string;
}

/**
 * Network data input format
 */
export interface NetworkData {
  /** Array of nodes */
  nodes: NetworkNode[];
  /** Array of edges */
  edges: NetworkEdge[];
}

/**
 * Layout type for network positioning
 */
export type NetworkLayoutType = 'force' | 'radial';

/**
 * Force-directed layout configuration
 */
export interface ForceLayoutConfig {
  /** Repulsion strength between nodes (default: 100) */
  repulsion?: number;
  /** Attraction strength along edges (default: 0.1) */
  attraction?: number;
  /** Damping factor for velocity (default: 0.9) */
  damping?: number;
  /** Maximum iterations (default: 300) */
  maxIterations?: number;
  /** Convergence threshold (default: 0.01) */
  convergenceThreshold?: number;
}

/**
 * Radial/circular layout configuration
 */
export interface RadialLayoutConfig {
  /** Whether to group nodes by category on the circle (default: true) */
  groupByCategory?: boolean;
  /** Radius multiplier (default: 0.4 of min dimension) */
  radiusMultiplier?: number;
  /** Start angle in degrees (default: -90, top of circle) */
  startAngle?: number;
}

/**
 * Processed network node for rendering
 */
export interface ProcessedNode {
  /** Original node id */
  id: string;
  /** Computed x position in data space */
  x: number;
  /** Computed y position in data space */
  y: number;
  /** Pixel x position */
  pixelX: number;
  /** Pixel y position */
  pixelY: number;
  /** Computed radius in pixels */
  radius: number;
  /** Node color based on group */
  color: RGBAColor;
  /** Node label */
  label?: string;
  /** Group identifier */
  group?: string | number;
  /** Original size value */
  size: number;
  /** Interaction state */
  hovered?: boolean;
  selected?: boolean;
  /** Connected to hovered/selected node */
  highlighted?: boolean;
}

/**
 * Processed network edge for rendering
 */
export interface ProcessedEdge {
  /** Source node id */
  sourceId: string;
  /** Target node id */
  targetId: string;
  /** Source x in pixels */
  sourceX: number;
  /** Source y in pixels */
  sourceY: number;
  /** Target x in pixels */
  targetX: number;
  /** Target y in pixels */
  targetY: number;
  /** Bezier control point x */
  controlX: number;
  /** Bezier control point y */
  controlY: number;
  /** Edge color */
  color: RGBAColor;
  /** Edge width in pixels */
  width: number;
  /** Edge weight */
  weight: number;
  /** Interaction state */
  highlighted?: boolean;
}

/**
 * Network chart options
 */
export interface NetworkChartOptions extends ChartOptions {
  /** Layout algorithm (default: 'force') */
  layout?: NetworkLayoutType;
  /** Force layout configuration */
  forceLayout?: ForceLayoutConfig;
  /** Radial layout configuration */
  radialLayout?: RadialLayoutConfig;
  /** Node size range [min, max] in pixels (default: [8, 32]) */
  nodeSizeRange?: [number, number];
  /** Default node color (default: blue) */
  nodeColor?: RGBAColor;
  /** Color palette for groups */
  groupColors?: RGBAColor[];
  /** Edge color (default: matches source node color) */
  edgeColor?: RGBAColor;
  /** Edge width range [min, max] based on weight (default: [1, 3]) */
  edgeWidthRange?: [number, number];
  /** Edge curve offset factor (default: 0.2) */
  edgeCurve?: number;
  /** Edge opacity (default: 0.6) */
  edgeOpacity?: number;
  /** Show node labels (default: true for small graphs) */
  showLabels?: boolean;
  /** Minimum node size to show label (default: 12) */
  labelThreshold?: number;
  /** Label font size in pixels (default: 11) */
  labelFontSize?: number;
  /** Label color (default: dark gray) */
  labelColor?: RGBAColor;
  /** Hover highlight opacity for non-connected elements (default: 0.15) */
  dimOpacity?: number;
  /** Hover brightness multiplier (default: 1.2) */
  hoverBrighten?: number;
  /** Show legend (default: true) */
  showLegend?: boolean;
  /** Legend position */
  legendPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Network chart configuration
 */
export interface NetworkChartConfig {
  /** Container element */
  container: HTMLElement;
  /** Chart options */
  options?: NetworkChartOptions;
}

/**
 * Event data for network node interactions
 */
export interface NetworkNodeEvent {
  /** The node that was interacted with */
  node: ProcessedNode;
  /** Connected nodes */
  connectedNodes: ProcessedNode[];
  /** Mouse/pointer position */
  position: { x: number; y: number };
  /** Original DOM event */
  originalEvent: PointerEvent;
}

/**
 * Network vertex data for GPU upload
 */
export interface NetworkVertexData {
  /** Node vertex data */
  nodeVertices: Float32Array;
  /** Number of node vertices */
  nodeVertexCount: number;
  /** Edge vertex data (triangles for curved lines) */
  edgeVertices: Float32Array;
  /** Number of edge vertices */
  edgeVertexCount: number;
  /** Node metadata for hit testing */
  nodes: ProcessedNode[];
  /** Edge metadata */
  edges: ProcessedEdge[];
}

/**
 * Default group color palette (10 distinct colors matching reference images)
 */
export const DEFAULT_GROUP_COLORS: RGBAColor[] = [
  [0.27, 0.53, 0.79, 1.0],  // Blue
  [0.69, 0.87, 0.29, 1.0],  // Lime green
  [0.36, 0.36, 0.45, 1.0],  // Dark gray
  [0.95, 0.61, 0.31, 1.0],  // Orange
  [0.45, 0.76, 0.85, 1.0],  // Light blue
  [0.95, 0.85, 0.35, 1.0],  // Yellow
  [0.91, 0.45, 0.55, 1.0],  // Pink/Red
  [0.55, 0.35, 0.65, 1.0],  // Purple
  [0.35, 0.75, 0.55, 1.0],  // Teal/Green
  [0.75, 0.55, 0.45, 1.0],  // Brown
];
