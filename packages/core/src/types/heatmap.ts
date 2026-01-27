/**
 * Heatmap chart type definitions
 */

import type { RGBAColor } from './theme.js';
import type { ChartOptions, AxisConfig } from './chart.js';

/**
 * Sparse heatmap data point
 */
export interface HeatmapDataPoint {
  /** Column index */
  x: number;
  /** Row index */
  y: number;
  /** Cell value */
  value: number;
  /** Optional custom label */
  label?: string;
}

/**
 * Dense matrix input format
 */
export interface HeatmapMatrixData {
  /** 2D array of values [row][col] */
  matrix: number[][];
  /** Row labels (Y-axis) */
  rowLabels?: string[];
  /** Column labels (X-axis) */
  colLabels?: string[];
}

/**
 * Color scale types
 */
export type ColorScaleType = 'sequential' | 'diverging' | 'discrete';

/**
 * Color scale configuration
 */
export interface ColorScaleConfig {
  /** Scale type */
  type: ColorScaleType;
  /** Gradient colors (min to max for sequential, low-mid-high for diverging) */
  colors: RGBAColor[];
  /** Value domain [min, max] - auto-calculated if omitted */
  domain?: [number, number];
  /** Midpoint value for diverging scales */
  midpoint?: number;
  /** Number of discrete steps/buckets */
  steps?: number;
}

/**
 * Processed heatmap cell for rendering
 */
export interface HeatmapCell {
  /** Row index */
  row: number;
  /** Column index */
  col: number;
  /** Data value */
  value: number;
  /** Computed color */
  color: RGBAColor;
  /** Pixel X position */
  pixelX: number;
  /** Pixel Y position */
  pixelY: number;
  /** Cell width in pixels */
  pixelWidth: number;
  /** Cell height in pixels */
  pixelHeight: number;
  /** Row label */
  rowLabel?: string;
  /** Column label */
  colLabel?: string;
  /** Interaction state */
  hovered?: boolean;
  selected?: boolean;
}

/**
 * Heatmap chart options
 */
export interface HeatmapChartOptions extends ChartOptions {
  /** X-axis configuration */
  xAxis?: AxisConfig;
  /** Y-axis configuration */
  yAxis?: AxisConfig;
  /** Grid color */
  gridColor?: RGBAColor;
  /** Color scale configuration */
  colorScale?: ColorScaleConfig;
  /** Gap between cells in pixels (default: 1) */
  cellGap?: number;
  /** Show value labels in cells (default: false) */
  showLabels?: boolean;
  /** Label text color */
  labelColor?: RGBAColor;
  /** Minimum cell size in pixels to show labels (default: 30) */
  labelThreshold?: number;
  /** Hover brightness multiplier (default: 1.2) */
  hoverBrighten?: number;
  /** Show background grid (default: false) */
  grid?: boolean;
  /** Color for null/missing values */
  nullColor?: RGBAColor;
}

/**
 * Heatmap chart configuration
 */
export interface HeatmapChartConfig {
  /** Container element */
  container: HTMLElement;
  /** Chart options */
  options?: HeatmapChartOptions;
}

/**
 * Event data for heatmap cell interactions
 */
export interface HeatmapCellEvent {
  /** The cell that was interacted with */
  cell: HeatmapCell;
  /** Mouse/pointer position */
  position: { x: number; y: number };
  /** Original DOM event */
  originalEvent: PointerEvent;
}

/**
 * Data structure for GPU vertex upload
 */
export interface HeatmapVertexData {
  /** Cell vertex data (triangles) */
  vertices: Float32Array;
  /** Number of vertices */
  vertexCount: number;
  /** Cell metadata for hit testing */
  cells: HeatmapCell[];
}

/**
 * Default color scales
 */
export const SEQUENTIAL_BLUE: RGBAColor[] = [
  [0.97, 0.97, 1.0, 1.0], // Light blue
  [0.2, 0.4, 0.8, 1.0], // Dark blue
];

export const SEQUENTIAL_GREEN: RGBAColor[] = [
  [0.9, 1.0, 0.9, 1.0], // Light green
  [0.1, 0.6, 0.2, 1.0], // Dark green
];

export const DIVERGING_RWB: RGBAColor[] = [
  [0.2, 0.4, 0.8, 1.0], // Blue (low)
  [1.0, 1.0, 1.0, 1.0], // White (mid)
  [0.8, 0.2, 0.2, 1.0], // Red (high)
];

export const VIRIDIS: RGBAColor[] = [
  [0.27, 0.0, 0.33, 1.0],
  [0.28, 0.47, 0.81, 1.0],
  [0.13, 0.72, 0.55, 1.0],
  [0.99, 0.91, 0.14, 1.0],
];

export const PLASMA: RGBAColor[] = [
  [0.05, 0.03, 0.53, 1.0],
  [0.8, 0.15, 0.47, 1.0],
  [0.98, 0.6, 0.21, 1.0],
  [0.94, 0.98, 0.13, 1.0],
];
