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
    this.config = {
      maxDistance: config.maxDistance ?? 20, // pixels
      debounceMs: config.debounceMs ?? 0,
      showTooltip: config.showTooltip ?? true,
      // Bind defaultTooltipFormatter to preserve 'this' context
      tooltipFormatter: config.tooltipFormatter ?? this.defaultTooltipFormatter.bind(this),
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
    const xFormatted = this.formatNumber(point.x);
    const yFormatted = this.formatNumber(point.y);

    return `
      <div style="font-weight: 500; margin-bottom: 4px;">${series.name ?? series.id}</div>
      <div>x: ${xFormatted}</div>
      <div>y: ${yFormatted}</div>
    `;
  }

  /**
   * Format a number for display
   */
  private formatNumber(value: number): string {
    if (Number.isInteger(value)) {
      return value.toString();
    }
    return value.toFixed(2);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HoverHandlerConfig>): void {
    Object.assign(this.config, config);
  }
}
