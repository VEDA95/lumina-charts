/**
 * Pie and Donut chart type definitions
 */

import type { RGBAColor } from './theme.js';
import type { ChartOptions } from './chart.js';

/**
 * Represents a single slice in a pie/donut chart
 */
export interface PieSlice {
  /** Slice index */
  index: number;
  /** Slice label */
  label: string;
  /** Raw value */
  value: number;
  /** Percentage of total (0-1) */
  percentage: number;
  /** Start angle in radians */
  startAngle: number;
  /** End angle in radians */
  endAngle: number;
  /** Slice color */
  color: RGBAColor;
  /** Whether slice is selected */
  selected?: boolean;
  /** Whether slice is hovered */
  hovered?: boolean;
  /** Series ID this slice belongs to */
  seriesId?: string;
  /** Original data point index */
  dataIndex?: number;
}

/**
 * Label configuration for pie charts
 */
export interface PieLabelConfig {
  /** Label position */
  position?: 'inside' | 'outside' | 'none';
  /** Show percentages */
  showPercentage?: boolean;
  /** Show values */
  showValue?: boolean;
  /** Minimum angle in degrees to show label (hides labels for tiny slices) */
  minAngleForLabel?: number;
  /** Custom label formatter */
  formatter?: (slice: PieSlice) => string;
  /** Font size for labels */
  fontSize?: number;
  /** Font color for labels */
  fontColor?: string;
  /** Distance from center for outside labels (ratio of outer radius) */
  outsideDistance?: number;
}

/**
 * Pie/Donut chart specific options
 */
export interface PieChartOptions extends ChartOptions {
  /** Inner radius ratio (0 = pie, >0 = donut). Value between 0 and 1. */
  innerRadius?: number;
  /** Outer radius ratio relative to container size (default: 0.8) */
  outerRadius?: number;
  /** Start angle in degrees (default: -90, which is top) */
  startAngle?: number;
  /** Padding angle between slices in degrees */
  padAngle?: number;
  /** Sort slices by value */
  sortSlices?: 'none' | 'ascending' | 'descending';
  /** Label configuration */
  labels?: PieLabelConfig;
  /** Offset in pixels for exploded (selected) slices */
  explodeOffset?: number;
  /** Custom slice colors (cycles through for multiple slices) */
  colors?: RGBAColor[];
  /** Highlight color multiplier for hovered slices (default: 1.2) */
  hoverBrighten?: number;
  /** Show slice borders */
  showBorder?: boolean;
  /** Border color */
  borderColor?: RGBAColor;
  /** Border width in pixels */
  borderWidth?: number;
}

/**
 * Pie chart configuration
 */
export interface PieChartConfig {
  /** Container element */
  container: HTMLElement;
  /** Chart options */
  options?: PieChartOptions;
}

/**
 * Event data for pie slice interactions
 */
export interface PieSliceEvent {
  /** The slice that was interacted with */
  slice: PieSlice;
  /** Mouse/pointer position */
  position: { x: number; y: number };
  /** Original DOM event */
  originalEvent: PointerEvent;
}

/**
 * Data structure for GPU vertex upload
 */
export interface PieVertexData {
  /** Interleaved vertex data */
  vertices: Float32Array;
  /** Number of vertices */
  vertexCount: number;
  /** Slice metadata for hit testing */
  slices: PieSlice[];
}
