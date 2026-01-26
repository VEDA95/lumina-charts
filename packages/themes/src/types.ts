/**
 * Theme type definitions
 */

import type { RGBAColor } from './utils.js';

/**
 * Complete theme definition
 */
export interface Theme {
  /** Theme identifier */
  name: string;
  /** Color configuration */
  colors: ThemeColors;
  /** Style configuration */
  styles: ThemeStyles;
}

/**
 * Theme color configuration
 */
export interface ThemeColors {
  /** Series colors (array of CSS hex strings) */
  series: string[];
  /** Series colors as RGBA for WebGL */
  seriesRGBA: RGBAColor[];
  /** Chart background color */
  background: string;
  /** Chart background as RGBA */
  backgroundRGBA: RGBAColor;
  /** Text/foreground color */
  foreground: string;
  /** Grid line color */
  grid: string;
  /** Grid line color as RGBA */
  gridRGBA: RGBAColor;
  /** Axis line color */
  axis: string;
  /** Axis label color */
  axisLabel: string;
  /** Tooltip colors */
  tooltip: {
    background: string;
    text: string;
    border: string;
  };
  /** Selection colors */
  selection: {
    fill: string;
    stroke: string;
  };
  /** Crosshair color */
  crosshair: string;
}

/**
 * Theme style configuration
 */
export interface ThemeStyles {
  /** Default line width in pixels */
  lineWidth: number;
  /** Default point size in pixels */
  pointSize: number;
  /** Grid line width */
  gridLineWidth: number;
  /** Whether to show axis lines */
  showAxisLines: boolean;
  /** Whether to show axis tick marks */
  showAxisTicks: boolean;
  /** Bar corner radius */
  barCornerRadius: number;
}
