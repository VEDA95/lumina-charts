/**
 * Candlestick chart type definitions
 */

import type { RGBAColor } from './theme.js';
import type { ChartOptions, AxisConfig } from './chart.js';

/**
 * OHLC data point for candlestick charts
 */
export interface OHLCDataPoint {
  /** Time or index value */
  x: number;
  /** Closing price (also serves as y for compatibility) */
  y: number;
  /** Opening price */
  open: number;
  /** Highest price */
  high: number;
  /** Lowest price */
  low: number;
}

/**
 * Processed candle for rendering
 */
export interface Candle {
  /** Candle index */
  index: number;
  /** X position (pixel) for vertical, Y position for horizontal */
  position: number;
  /** Open price */
  open: number;
  /** High price */
  high: number;
  /** Low price */
  low: number;
  /** Close price */
  close: number;
  /** Candle width (pixel) */
  width: number;
  /** Whether candle is bullish (close >= open) */
  bullish: boolean;
  /** Fill color */
  color: RGBAColor;
  /** Wick color */
  wickColor: RGBAColor;
  /** Whether hovered */
  hovered?: boolean;
  /** Whether selected */
  selected?: boolean;
  /** Original data index */
  dataIndex: number;
  /** Series ID */
  seriesId?: string;
  /** Original timestamp/x value */
  timestamp: number;
}

/**
 * Candlestick chart orientation
 */
export type CandlestickOrientation = 'vertical' | 'horizontal';

/**
 * Candlestick chart options
 */
export interface CandlestickChartOptions extends ChartOptions {
  /** Chart orientation (default: 'vertical') */
  orientation?: CandlestickOrientation;
  /** X-axis configuration */
  xAxis?: AxisConfig;
  /** Y-axis configuration */
  yAxis?: AxisConfig;
  /** Grid color */
  gridColor?: RGBAColor;
  /** Bullish (up) candle color */
  upColor?: RGBAColor;
  /** Bearish (down) candle color */
  downColor?: RGBAColor;
  /** Wick color (default: same as candle) */
  wickColor?: RGBAColor;
  /** Candle width ratio (0-1, portion of available space, default: 0.8) */
  candleWidth?: number;
  /** Wick width in pixels (default: 1) */
  wickWidth?: number;
  /** Hover brightness multiplier (default: 1.2) */
  hoverBrighten?: number;
  /** Show grid lines (default: true) */
  grid?: boolean;
}

/**
 * Candlestick chart configuration
 */
export interface CandlestickChartConfig {
  /** Container element */
  container: HTMLElement;
  /** Chart options */
  options?: CandlestickChartOptions;
}

/**
 * Event data for candle interactions
 */
export interface CandleEvent {
  /** The candle that was interacted with */
  candle: Candle;
  /** Mouse/pointer position */
  position: { x: number; y: number };
  /** Original DOM event */
  originalEvent: PointerEvent;
}

/**
 * Data structure for GPU vertex upload
 */
export interface CandlestickVertexData {
  /** Body vertex data (triangles) */
  bodyVertices: Float32Array;
  /** Number of body vertices */
  bodyVertexCount: number;
  /** Wick vertex data (lines) */
  wickVertices: Float32Array;
  /** Number of wick vertices */
  wickVertexCount: number;
  /** Candle metadata for hit testing */
  candles: Candle[];
}
