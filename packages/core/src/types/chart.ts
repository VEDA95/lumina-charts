/**
 * Chart configuration and state types
 */

import type { DataDomain, Series, DataPoint } from './data.js';
import type { ScaleType, ScaleConfig } from './scale.js';

/**
 * Chart margin configuration
 */
export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Base chart options shared by all chart types
 */
export interface ChartOptions {
  /** Chart margins */
  margins?: Margins;
  /** Theme name or configuration */
  theme?: string | ThemeConfig;
  /** Enable animations */
  animate?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Responsive sizing */
  responsive?: boolean;
  /** Maintain aspect ratio */
  maintainAspectRatio?: boolean;
  /** Aspect ratio (width/height) */
  aspectRatio?: number;
  /** Interaction configuration */
  interaction?: InteractionConfig;
  /** Tooltip configuration */
  tooltip?: TooltipConfig;
  /** Legend configuration */
  legend?: LegendConfig;
}

/**
 * Theme configuration (JS object portion)
 */
export interface ThemeConfig {
  /** Theme name */
  name?: string;
  /** Series colors */
  colors?: string[];
  /** Style overrides */
  styles?: Partial<ThemeStyles>;
}

/**
 * Theme style properties (non-color)
 */
export interface ThemeStyles {
  /** Default line width */
  lineWidth: number;
  /** Default point size */
  pointSize: number;
  /** Default point shape */
  pointShape: string;
  /** Grid line width */
  gridLineWidth: number;
  /** Grid dash pattern */
  gridDash: number[];
  /** Axis line width */
  axisLineWidth: number;
  /** Font sizes */
  fontSize: {
    axis: number;
    label: number;
    title: number;
    legend: number;
  };
  /** Font family */
  fontFamily: string;
  /** Animation settings */
  animation: {
    duration: number;
    easing: string;
  };
}

/**
 * Interaction configuration
 */
export interface InteractionConfig {
  /** Enable pan */
  pan?: boolean | PanConfig;
  /** Enable zoom */
  zoom?: boolean | ZoomConfig;
  /** Enable selection */
  select?: boolean | SelectConfig;
  /** Enable hover effects */
  hover?: boolean;
  /** Enable click handlers */
  click?: boolean;
}

export interface PanConfig {
  enabled: boolean;
  /** Mouse button for pan (0=left, 1=middle, 2=right) */
  button?: 0 | 1 | 2;
  /** Modifier key required */
  modifierKey?: 'ctrl' | 'alt' | 'shift' | 'meta';
}

export interface ZoomConfig {
  enabled: boolean;
  /** Enable wheel zoom */
  wheel?: boolean;
  /** Enable pinch zoom */
  pinch?: boolean;
  /** Zoom speed multiplier */
  speed?: number;
  /** Minimum zoom level */
  min?: number;
  /** Maximum zoom level */
  max?: number;
}

export interface SelectConfig {
  enabled: boolean;
  /** Selection mode */
  mode?: 'single' | 'multi' | 'brush' | 'lasso';
  /** Modifier key for multi-select */
  multiSelectKey?: 'ctrl' | 'alt' | 'shift' | 'meta';
}

/**
 * Tooltip configuration
 */
export interface TooltipConfig {
  /** Enable tooltips */
  enabled?: boolean;
  /** Follow cursor position */
  followCursor?: boolean;
  /** Delay before showing (ms) */
  showDelay?: number;
  /** Delay before hiding (ms) */
  hideDelay?: number;
  /** Offset from cursor/point */
  offset?: { x: number; y: number };
  /** Custom content formatter */
  formatter?: (content: TooltipContent) => string;
}

/**
 * Tooltip content structure
 */
export interface TooltipContent {
  /** Tooltip title */
  title?: string;
  /** Data items to display */
  items: TooltipItem[];
  /** Series color */
  color?: readonly [number, number, number, number];
  /** Custom HTML content */
  customHTML?: string;
}

export interface TooltipItem {
  /** Label text */
  label: string;
  /** Value text or number */
  value: string | number;
  /** Item color */
  color?: string;
}

/**
 * Legend configuration
 */
export interface LegendConfig {
  /** Show legend */
  show?: boolean;
  /** Legend position */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Legend alignment */
  align?: 'start' | 'center' | 'end';
  /** Maximum width (for left/right position) */
  maxWidth?: number;
  /** Maximum height (for top/bottom position) */
  maxHeight?: number;
}

/**
 * Axis configuration
 */
export interface AxisConfig {
  /** Show the axis */
  show?: boolean;
  /** Axis label */
  label?: string;
  /** Tick configuration */
  ticks?: TickConfig;
  /** Grid lines */
  grid?: boolean | GridConfig;
  /** Axis domain (auto-calculated if not provided) */
  domain?: [number, number];
  /** Scale type (shorthand) */
  type?: ScaleType;
  /** Detailed scale configuration (overrides type) */
  scale?: ScaleConfig;
  /** Value formatter */
  formatter?: (value: number | string | Date) => string;
}

export interface TickConfig {
  /** Show tick marks */
  show?: boolean;
  /** Number of ticks (hint) */
  count?: number;
  /** Explicit tick values */
  values?: number[];
  /** Tick size in pixels */
  size?: number;
  /** Tick padding from axis */
  padding?: number;
}

export interface GridConfig {
  /** Show grid lines */
  show?: boolean;
  /** Grid line style */
  style?: 'solid' | 'dashed' | 'dotted';
  /** Grid line width */
  width?: number;
}

/**
 * Runtime chart state
 */
export interface ChartState {
  /** Current data domain (visible area) */
  domain: DataDomain;
  /** Viewport dimensions */
  viewport: { width: number; height: number };
  /** Current transform state */
  transform: {
    scale: number;
    translateX: number;
    translateY: number;
  };
  /** Set of selected point IDs */
  selectedPoints: Set<string>;
  /** Currently hovered point ID */
  hoveredPoint: string | null;
  /** Set of visible series IDs */
  visibleSeries: Set<string>;
}

/**
 * Hit test result
 */
export interface HitTestResult {
  /** Series ID */
  seriesId: string;
  /** Point index within series */
  pointIndex: number;
  /** The data point */
  point: DataPoint;
  /** Distance from query point */
  distance: number;
}

/**
 * Chart type metadata
 */
export interface ChartType {
  /** Type identifier */
  type: string;
  /** Display name */
  name: string;
  /** Chart category */
  category: 'cartesian' | 'radial' | 'hierarchical' | 'network' | 'geo';
}
