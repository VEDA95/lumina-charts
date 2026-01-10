/**
 * Event types for chart interactions
 */

import type { DataPoint, Series, DataDomain } from './data.js';
import type { HitTestResult } from './chart.js';

/**
 * Chart event map for typed event handling
 */
export interface ChartEvents {
  /** Data point clicked */
  click: (event: PointEvent) => void;
  /** Data point hovered */
  hover: (event: HoverEvent) => void;
  /** Hover ended */
  hoverEnd: () => void;
  /** Selection changed */
  selectionChange: (event: SelectionEvent) => void;
  /** Chart zoomed */
  zoom: (event: ZoomEvent) => void;
  /** Chart panned */
  pan: (event: PanEvent) => void;
  /** Data updated */
  dataUpdate: (event: DataUpdateEvent) => void;
  /** Chart resized */
  resize: (event: ResizeEvent) => void;
  /** Render completed */
  render: () => void;
  /** Chart ready */
  ready: () => void;
  /** Chart destroyed */
  destroy: () => void;
}

/**
 * Base event with common properties
 */
export interface BaseChartEvent {
  /** Original DOM event (if applicable) */
  originalEvent?: Event;
  /** Event timestamp */
  timestamp: number;
}

/**
 * Point interaction event
 */
export interface PointEvent extends BaseChartEvent {
  /** Hit test result */
  hit: HitTestResult;
  /** The series containing the point */
  series: Series;
  /** The data point */
  point: DataPoint;
  /** Pixel coordinates */
  pixel: { x: number; y: number };
  /** Data coordinates */
  data: { x: number; y: number };
}

/**
 * Hover event
 */
export interface HoverEvent extends BaseChartEvent {
  /** Hit test result (null if hovering empty space) */
  hit: HitTestResult | null;
  /** The series containing the point (if any) */
  series?: Series;
  /** The data point (if any) */
  point?: DataPoint;
  /** Pixel coordinates */
  pixel: { x: number; y: number };
  /** Data coordinates */
  data: { x: number; y: number };
}

/**
 * Selection change event
 */
export interface SelectionEvent extends BaseChartEvent {
  /** Selected point IDs */
  selected: Set<string>;
  /** Newly added selections */
  added: string[];
  /** Removed selections */
  removed: string[];
  /** Selection bounds (for brush selection) */
  bounds?: DataDomain;
}

/**
 * Zoom event
 */
export interface ZoomEvent extends BaseChartEvent {
  /** New domain after zoom */
  domain: DataDomain;
  /** Zoom factor */
  factor: number;
  /** Zoom center in data coordinates */
  center: { x: number; y: number };
  /** Zoom direction */
  direction: 'in' | 'out';
}

/**
 * Pan event
 */
export interface PanEvent extends BaseChartEvent {
  /** New domain after pan */
  domain: DataDomain;
  /** Pan delta in data coordinates */
  delta: { x: number; y: number };
}

/**
 * Data update event
 */
export interface DataUpdateEvent extends BaseChartEvent {
  /** The new data */
  data: Series[];
  /** Previous data */
  previousData?: Series[];
}

/**
 * Resize event
 */
export interface ResizeEvent extends BaseChartEvent {
  /** New width */
  width: number;
  /** New height */
  height: number;
  /** Previous width */
  previousWidth: number;
  /** Previous height */
  previousHeight: number;
}

/**
 * Interaction event passed to handlers
 */
export interface InteractionEvent {
  /** Event type */
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'wheel' | 'pinch';
  /** Pixel coordinates */
  x: number;
  /** Pixel coordinates */
  y: number;
  /** Data coordinates */
  dataX: number;
  /** Data coordinates */
  dataY: number;
  /** Original DOM event */
  originalEvent: PointerEvent | WheelEvent | TouchEvent;
  /** Whether default was prevented */
  defaultPrevented: boolean;
  /** Prevent default behavior */
  preventDefault(): void;
}
