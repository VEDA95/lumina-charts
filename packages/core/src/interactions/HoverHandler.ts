/**
 * Hover handler for point hit testing and tooltips
 */

import type { InteractionEvent, HoverEvent, Series } from '../types/index.js';
import { BaseInteractionHandler } from './InteractionHandler.js';
import type { SpatialHitResult } from '../data/SpatialIndex.js';

/**
 * Configuration for the hover handler
 */
export interface HoverHandlerConfig {
  /** Maximum distance (in data units) to detect a point */
  maxDistance?: number;
  /** Debounce delay for hover events (ms) */
  debounceMs?: number;
  /** Whether to show tooltips */
  showTooltip?: boolean;
  /** Custom tooltip formatter */
  tooltipFormatter?: (series: Series, point: { x: number; y: number }, index: number) => string;
  /** Tooltip style preset ('default' or 'shadcn' for dark modern style) */
  tooltipStyle?: 'default' | 'shadcn';
}

/**
 * Handler for hover interactions and tooltip display
 */
export class HoverHandler extends BaseInteractionHandler {
  readonly id = 'hover';

  private config: Required<HoverHandlerConfig>;
  private lastHoveredPoint: string | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private tooltipElement: HTMLDivElement | null = null;

  constructor(config: HoverHandlerConfig = {}) {
    super();
    const tooltipStyle = config.tooltipStyle ?? 'default';
    this.config = {
      maxDistance: config.maxDistance ?? 20, // pixels
      debounceMs: config.debounceMs ?? 0,
      showTooltip: config.showTooltip ?? true,
      tooltipStyle,
      // Bind defaultTooltipFormatter to preserve 'this' context
      tooltipFormatter:
        config.tooltipFormatter ??
        (tooltipStyle === 'shadcn'
          ? this.shadcnTooltipFormatter.bind(this)
          : this.defaultTooltipFormatter.bind(this)),
    };
  }

  protected onAttach(): void {
    if (this.chart && this.config.showTooltip) {
      this.tooltipElement = this.chart.getTooltipElement();
      this.setupTooltipStyles();
    }
  }

  protected onDetach(): void {
    this.hideTooltip();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Setup tooltip styles
   */
  private setupTooltipStyles(): void {
    if (!this.tooltipElement) return;

    if (this.config.tooltipStyle === 'shadcn') {
      // shadcn/ui-inspired tooltip style (light mode default - CSS overrides for dark)
      this.tooltipElement.className = 'lumina-tooltip';
      this.tooltipElement.style.cssText = `
        position: absolute;
        display: none;
        pointer-events: none;
        z-index: 100;
        background: #ffffff;
        color: #09090b;
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid #e4e4e7;
        font-size: 12px;
        line-height: 1.5;
        font-family: Geist, Inter, ui-sans-serif, system-ui, sans-serif;
        font-variant-numeric: tabular-nums;
        font-feature-settings: "ss09" 1;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
        white-space: nowrap;
        transform: translate(-50%, -100%);
        margin-top: -8px;
      `;
    } else {
      // Default tooltip style
      this.tooltipElement.style.cssText = `
        position: absolute;
        display: none;
        pointer-events: none;
        z-index: 100;
        background: var(--lumina-tooltip-bg, rgba(0, 0, 0, 0.8));
        color: var(--lumina-tooltip-color, #fff);
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-family: var(--lumina-font-family, system-ui, sans-serif);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        white-space: nowrap;
        transform: translate(-50%, -100%);
        margin-top: -10px;
      `;
    }
  }

  /**
   * Handle pointer move for hover detection
   */
  onPointerMove(event: InteractionEvent): void {
    if (!this.chart || !this.enabled) return;

    if (this.config.debounceMs > 0) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        this.performHitTest(event);
      }, this.config.debounceMs);
    } else {
      this.performHitTest(event);
    }
  }

  /**
   * Handle pointer leave
   */
  onPointerUp(event: InteractionEvent): void {
    // Clear hover on pointer up (often fires on leave)
    if (event.originalEvent.type === 'pointerleave') {
      this.clearHover();
    }
  }

  /**
   * Perform hit testing
   */
  private performHitTest(event: InteractionEvent): void {
    if (!this.chart) return;

    const spatialIndex = this.chart.getSpatialIndex();
    const state = this.chart.getState();
    const pixelRatio = (this.chart as any).pixelRatio ?? 1;

    // Convert max distance from pixels to data units
    const plotArea = this.chart.getPlotArea();
    const domainWidth = state.domain.x[1] - state.domain.x[0];
    const domainHeight = state.domain.y[1] - state.domain.y[0];
    const pixelWidth = plotArea.width;
    const pixelHeight = plotArea.height;

    // Average pixels per data unit
    const maxDistanceData = Math.max(
      (this.config.maxDistance * pixelRatio * domainWidth) / pixelWidth,
      (this.config.maxDistance * pixelRatio * domainHeight) / pixelHeight
    );

    // Find nearest point
    const result = spatialIndex.findNearest(
      event.dataX,
      event.dataY,
      maxDistanceData,
      state.visibleSeries
    );

    if (result) {
      this.handleHit(event, result);
    } else {
      this.clearHover();
    }
  }

  /**
   * Handle a hit on a point
   */
  private handleHit(event: InteractionEvent, result: SpatialHitResult): void {
    if (!this.chart) return;

    const pointId = `${result.point.seriesId}:${result.point.pointIndex}`;

    if (pointId !== this.lastHoveredPoint) {
      this.lastHoveredPoint = pointId;

      // Get series data
      const series = this.chart.getData().find((s) => s.id === result.point.seriesId);
      if (!series) return;

      const point = series.data[result.point.pointIndex];
      if (!point) return;

      // Update chart state
      const state = this.chart.getState() as any;
      state.hoveredPoint = pointId;

      // Emit hover event
      const hoverEvent: HoverEvent = {
        hit: {
          seriesId: result.point.seriesId,
          pointIndex: result.point.pointIndex,
          point,
          distance: result.distance,
        },
        series,
        point,
        pixel: { x: event.x, y: event.y },
        data: { x: event.dataX, y: event.dataY },
        timestamp: Date.now(),
        originalEvent: event.originalEvent,
      };

      this.chart.emit('hover', hoverEvent);

      // Show tooltip
      if (this.config.showTooltip) {
        this.showTooltip(event, series, point, result.point.pointIndex);
      }
    } else {
      // Same point, just update tooltip position
      if (this.config.showTooltip && this.tooltipElement) {
        this.updateTooltipPosition(event);
      }
    }
  }

  /**
   * Clear hover state
   */
  private clearHover(): void {
    if (this.lastHoveredPoint === null) return;

    this.lastHoveredPoint = null;

    if (this.chart) {
      const state = this.chart.getState() as any;
      state.hoveredPoint = null;
      this.chart.emit('hoverEnd', undefined);
    }

    this.hideTooltip();
  }

  /**
   * Show tooltip at position
   */
  private showTooltip(
    event: InteractionEvent,
    series: Series,
    point: { x: number; y: number },
    index: number
  ): void {
    if (!this.tooltipElement || !this.chart) return;

    const content = this.config.tooltipFormatter(series, point, index);
    this.tooltipElement.innerHTML = content;
    this.tooltipElement.style.display = 'block';

    this.updateTooltipPosition(event);
  }

  /**
   * Update tooltip position
   */
  private updateTooltipPosition(event: InteractionEvent): void {
    if (!this.tooltipElement || !this.chart) return;

    const pixelRatio = (this.chart as any).pixelRatio ?? 1;
    const x = event.x / pixelRatio;
    const y = event.y / pixelRatio;

    this.tooltipElement.style.left = `${x}px`;
    this.tooltipElement.style.top = `${y}px`;
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.style.display = 'none';
    }
  }

  /**
   * Default tooltip formatter
   */
  private defaultTooltipFormatter(
    series: Series,
    point: { x: number; y: number },
    _index: number
  ): string {
    const xFormatted = this.formatValue(point.x);
    const yFormatted = this.formatValue(point.y);

    return `
      <div style="font-weight: 500; margin-bottom: 4px;">${series.name ?? series.id}</div>
      <div>x: ${xFormatted}</div>
      <div>y: ${yFormatted}</div>
    `;
  }

  /**
   * shadcn-style tooltip formatter with vertical line indicator and right-aligned values
   */
  private shadcnTooltipFormatter(
    series: Series,
    point: { x: number; y: number },
    _index: number
  ): string {
    const xFormatted = this.formatValue(point.x);
    const yFormatted = this.formatValue(point.y);

    // Get the series color as a CSS color string
    const color = series.style?.color as readonly [number, number, number, number] | undefined;
    const colorStr = color
      ? `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)}, ${color[3]})`
      : '#60a5fa'; // Default to shadcn blue

    return `
      <div style="font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 500; margin-bottom: 8px;">${xFormatted}</div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 3px; height: 16px; border-radius: 1px; background: ${colorStr}; flex-shrink: 0;"></span>
        <span style="opacity: 0.7; font-size: 12px; min-width: 60px;">${series.name ?? series.id}</span>
        <span style="font-family: 'Geist Mono', monospace; font-weight: 500; margin-left: auto;">${yFormatted}</span>
      </div>
    `;
  }

  /**
   * Check if a value looks like a timestamp (milliseconds since epoch)
   * Timestamps are typically between year 2000 (946684800000) and year 2100 (4102444800000)
   */
  private looksLikeTimestamp(value: number): boolean {
    // Check if value is in reasonable timestamp range (year 1990 to 2100)
    const minTs = 631152000000; // 1990-01-01
    const maxTs = 4102444800000; // 2100-01-01
    return value >= minTs && value <= maxTs;
  }

  /**
   * Format a value for display, auto-detecting timestamps
   */
  private formatValue(value: number): string {
    // Check if this looks like a timestamp
    if (this.looksLikeTimestamp(value)) {
      const date = new Date(value);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Regular number formatting
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }

    // Format with appropriate precision
    const absValue = Math.abs(value);
    if (absValue >= 1000) {
      return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    if (absValue >= 1) {
      return value.toFixed(2);
    }
    if (absValue >= 0.01) {
      return value.toFixed(3);
    }
    return value.toExponential(2);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HoverHandlerConfig>): void {
    Object.assign(this.config, config);
  }
}
