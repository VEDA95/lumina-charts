/**
 * Boxplot chart type definitions
 */

import type { RGBAColor } from './theme.js';
import type { ChartOptions, AxisConfig } from './chart.js';

/**
 * Quartile data point for boxplot charts
 */
export interface QuartileDataPoint {
  /** Category index or position */
  x: number;
  /** Y value (median for compatibility) */
  y: number;
  /** Minimum value (lower whisker) */
  min: number;
  /** First quartile (Q1) - bottom of box */
  q1: number;
  /** Median (Q2) - line inside box */
  median: number;
  /** Third quartile (Q3) - top of box */
  q3: number;
  /** Maximum value (upper whisker) */
  max: number;
  /** Outlier values (optional) */
  outliers?: number[];
}

/**
 * Processed boxplot for rendering
 */
export interface Boxplot {
  /** Index */
  index: number;
  /** Position on category axis (pixels) */
  position: number;
  /** Box width (pixels) */
  width: number;
  /** Data values */
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
  /** Colors */
  boxColor: RGBAColor;
  medianColor: RGBAColor;
  whiskerColor: RGBAColor;
  outlierColor: RGBAColor;
  /** Interaction state */
  hovered?: boolean;
  selected?: boolean;
  /** Metadata */
  dataIndex: number;
  seriesId?: string;
  categoryName?: string;
}

/**
 * Boxplot chart orientation
 */
export type BoxplotOrientation = 'vertical' | 'horizontal';

/**
 * Boxplot chart options
 */
export interface BoxplotChartOptions extends ChartOptions {
  /** Chart orientation (default: 'vertical') */
  orientation?: BoxplotOrientation;
  /** X-axis configuration */
  xAxis?: AxisConfig;
  /** Y-axis configuration */
  yAxis?: AxisConfig;
  /** Grid color */
  gridColor?: RGBAColor;
  /** Box fill color */
  boxColor?: RGBAColor;
  /** Median line color */
  medianColor?: RGBAColor;
  /** Whisker line color */
  whiskerColor?: RGBAColor;
  /** Outlier point color */
  outlierColor?: RGBAColor;
  /** Box width ratio (0-1, default: 0.6) */
  boxWidth?: number;
  /** Whisker line width (pixels, default: 1) */
  whiskerWidth?: number;
  /** Outlier point size (pixels, default: 4) */
  outlierSize?: number;
  /** Hover brightness multiplier (default: 1.2) */
  hoverBrighten?: number;
  /** Show grid lines (default: true) */
  grid?: boolean;
}

/**
 * Boxplot chart configuration
 */
export interface BoxplotChartConfig {
  /** Container element */
  container: HTMLElement;
  /** Chart options */
  options?: BoxplotChartOptions;
}

/**
 * Event data for boxplot interactions
 */
export interface BoxplotEvent {
  /** The boxplot that was interacted with */
  boxplot: Boxplot;
  /** Mouse/pointer position */
  position: { x: number; y: number };
  /** Original DOM event */
  originalEvent: PointerEvent;
}

/**
 * Data structure for GPU vertex upload
 */
export interface BoxplotVertexData {
  /** Box body vertex data (triangles) */
  boxVertices: Float32Array;
  /** Number of box vertices */
  boxVertexCount: number;
  /** Whisker vertex data (lines) */
  whiskerVertices: Float32Array;
  /** Number of whisker vertices */
  whiskerVertexCount: number;
  /** Median line vertex data (lines) */
  medianVertices: Float32Array;
  /** Number of median vertices */
  medianVertexCount: number;
  /** Outlier vertex data (triangles for diamonds) */
  outlierVertices: Float32Array;
  /** Number of outlier vertices */
  outlierVertexCount: number;
  /** Boxplot metadata for hit testing */
  boxplots: Boxplot[];
}
