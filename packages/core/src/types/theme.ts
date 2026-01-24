/**
 * Theme system types
 */

/**
 * Complete theme definition
 */
export interface Theme {
  /** Theme identifier */
  name: string;
  /** Color configuration */
  colors: Partial<ThemeColors>;
  /** Style configuration */
  styles: Partial<ThemeStyleConfig>;
}

/**
 * Theme color configuration
 */
export interface ThemeColors {
  /** Series colors (array of CSS color strings) */
  series: string[];
  /** Chart background color */
  background: string;
  /** Text/foreground color */
  foreground: string;
  /** Grid line color */
  grid: string;
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
 * Theme style configuration (non-color properties)
 */
export interface ThemeStyleConfig {
  /** Default line width in pixels */
  lineWidth: number;
  /** Default point size in pixels */
  pointSize: number;
  /** Default point shape */
  pointShape: 'circle' | 'square' | 'triangle' | 'diamond';
  /** Grid line width */
  gridLineWidth: number;
  /** Grid line dash pattern */
  gridDash: number[];
  /** Axis line width */
  axisLineWidth: number;
  /** Font sizes for different elements */
  fontSize: {
    axis: number;
    label: number;
    title: number;
    legend: number;
  };
  /** Font family */
  fontFamily: string;
  /** Animation configuration */
  animation: {
    duration: number;
    easing: string;
  };
  /** Bar corner radius in pixels (for rounded bars) */
  barCornerRadius?: number;
  /** Whether to show axis lines */
  showAxisLines?: boolean;
  /** Whether to show axis tick marks */
  showAxisTicks?: boolean;
  /** Tooltip style preset */
  tooltipStyle?: 'default' | 'shadcn';
  /** Legend indicator shape */
  legendIndicator?: 'circle' | 'square';
}

/**
 * Normalized RGBA color for WebGL (values 0-1)
 */
export type RGBAColor = readonly [number, number, number, number];

/**
 * Default theme style values
 */
export const DEFAULT_THEME_STYLES: ThemeStyleConfig = {
  lineWidth: 2,
  pointSize: 5,
  pointShape: 'circle',
  gridLineWidth: 1,
  gridDash: [],
  axisLineWidth: 1,
  fontSize: {
    axis: 11,
    label: 12,
    title: 14,
    legend: 12,
  },
  fontFamily: 'system-ui, -apple-system, sans-serif',
  animation: {
    duration: 200,
    easing: 'ease-out',
  },
};
