/**
 * Zoom handler for wheel and pinch zoom
 */

import type { InteractionEvent, ZoomConfig, DataDomain } from '../types/index.js';
import { BaseInteractionHandler } from './InteractionHandler.js';

/**
 * Configuration for the zoom handler
 */
export interface ZoomHandlerConfig extends Partial<ZoomConfig> {
  /** Zoom direction: 'both' | 'x' | 'y' */
  direction?: 'both' | 'x' | 'y';
  /**
   * Minimum zoom level (1 = original size, 0.5 = zoomed out 2x).
   * Set to 1 to prevent zooming out past the data bounds.
   * Default: 1 (can't zoom out past data)
   */
  minZoom?: number;
  /**
   * Maximum zoom level (1 = original size, 10 = zoomed in 10x).
   * Default: 100
   */
  maxZoom?: number;
  /**
   * Padding when zoomed out to min level, as a fraction of domain.
   * Default: 0.1 (10% padding around data)
   */
  zoomPadding?: number;
}

/**
 * Handler for zoom interactions (wheel and pinch)
 */
export class ZoomHandler extends BaseInteractionHandler {
  readonly id = 'zoom';

  private config: Required<ZoomHandlerConfig>;
  private initialDomain: DataDomain | null = null;

  constructor(config: ZoomHandlerConfig = {}) {
    super();
    this.config = {
      enabled: config.enabled ?? true,
      wheel: config.wheel ?? true,
      pinch: config.pinch ?? true,
      speed: config.speed ?? 1.0,
      min: config.min ?? 1, // Legacy: now uses minZoom
      max: config.max ?? 100, // Legacy: now uses maxZoom
      direction: config.direction ?? 'both',
      minZoom: config.minZoom ?? 1, // Can't zoom out past data
      maxZoom: config.maxZoom ?? 100, // Can zoom in up to 100x
      zoomPadding: config.zoomPadding ?? 0.1,
    };
    this.enabled = this.config.enabled;
  }

  protected onAttach(): void {
    // Use chart's initial domain (from when data was set)
    // This is more reliable than capturing on attach
    this.updateInitialDomain();
  }

  /**
   * Update the initial domain reference from the chart
   */
  private updateInitialDomain(): void {
    if (this.chart) {
      const chartInitial = this.chart.getInitialDomain();
      if (chartInitial) {
        this.initialDomain = { x: [...chartInitial.x], y: [...chartInitial.y] };
      } else {
        // Fallback to current domain if no initial domain set
        const current = this.chart.getState().domain;
        this.initialDomain = { x: [...current.x], y: [...current.y] };
      }
    }
  }

  /**
   * Handle wheel event for zoom
   */
  onWheel(event: InteractionEvent): void {
    if (!this.chart || !this.enabled || !this.config.wheel) return;

    const wheelEvent = event.originalEvent as WheelEvent;

    // Determine zoom factor based on scroll delta
    // Normalize across different scroll modes
    let delta = wheelEvent.deltaY;

    // Normalize for pixel scrolling vs line scrolling
    if (wheelEvent.deltaMode === 1) {
      // Line mode
      delta *= 20;
    } else if (wheelEvent.deltaMode === 2) {
      // Page mode
      delta *= 100;
    }

    // Calculate zoom factor
    // Negative delta = scroll up = zoom in
    // Positive delta = scroll down = zoom out
    const zoomSpeed = this.config.speed * 0.001;
    const factor = 1 + delta * zoomSpeed;

    // Apply zoom centered on cursor position
    this.applyZoom(factor, event.dataX, event.dataY, event);

    event.preventDefault();
  }

  /**
   * Apply zoom centered on a point
   */
  private applyZoom(
    factor: number,
    centerX: number,
    centerY: number,
    event: InteractionEvent
  ): void {
    if (!this.chart) return;

    // Always get fresh initial domain from chart (in case data changed)
    const chartInitialDomain = this.chart.getInitialDomain();
    if (!chartInitialDomain) return;

    const state = this.chart.getState();
    const currentDomain = state.domain;

    // Calculate domain sizes (preserve sign for inverted domains)
    const currentWidth = currentDomain.x[1] - currentDomain.x[0];
    const currentHeight = currentDomain.y[1] - currentDomain.y[0];
    const initialWidth = chartInitialDomain.x[1] - chartInitialDomain.x[0];
    const initialHeight = chartInitialDomain.y[1] - chartInitialDomain.y[0];

    // Guard against zero domain sizes
    if (currentWidth === 0 || currentHeight === 0 || initialWidth === 0 || initialHeight === 0) {
      return;
    }

    // Calculate current zoom level relative to initial (>1 = zoomed in, <1 = zoomed out)
    // Use absolute values for zoom level calculation
    const currentZoomX = Math.abs(initialWidth) / Math.abs(currentWidth);
    const currentZoomY = Math.abs(initialHeight) / Math.abs(currentHeight);

    // Calculate new zoom level after this zoom operation
    // factor > 1 = zooming out (domain gets bigger), factor < 1 = zooming in (domain gets smaller)
    const newZoomX = currentZoomX / factor;
    const newZoomY = currentZoomY / factor;

    // Check zoom limits
    const minZoom = this.config.minZoom;
    const maxZoom = this.config.maxZoom;

    if (factor > 1) {
      // Zooming out - check minimum zoom level
      if (newZoomX < minZoom || newZoomY < minZoom) {
        const clampedFactor = Math.min(currentZoomX / minZoom, currentZoomY / minZoom);
        if (clampedFactor <= 1) return;
        factor = clampedFactor;
      }
    } else {
      // Zooming in - check maximum zoom level
      if (newZoomX > maxZoom || newZoomY > maxZoom) {
        const clampedFactor = Math.max(currentZoomX / maxZoom, currentZoomY / maxZoom);
        if (clampedFactor >= 1) return;
        factor = clampedFactor;
      }
    }

    // Calculate new domain size (preserving sign for inverted domains)
    let newWidth = currentWidth * factor;
    let newHeight = currentHeight * factor;

    // Apply direction constraint
    if (this.config.direction === 'x') {
      newHeight = currentHeight;
    } else if (this.config.direction === 'y') {
      newWidth = currentWidth;
    }

    // Calculate the ratio (fractional position of center in domain, 0-1)
    // This formula works for both normal and inverted domains
    const ratioX = (centerX - currentDomain.x[0]) / currentWidth;
    const ratioY = (centerY - currentDomain.y[0]) / currentHeight;

    // Calculate new domain bounds
    // Formula: new_start = center - ratio * new_size
    //          new_end = center + (1 - ratio) * new_size
    // This naturally handles inverted domains because newWidth/newHeight preserve sign
    let newX0: number, newX1: number, newY0: number, newY1: number;

    if (this.config.direction === 'y') {
      newX0 = currentDomain.x[0];
      newX1 = currentDomain.x[1];
    } else {
      newX0 = centerX - ratioX * newWidth;
      newX1 = centerX + (1 - ratioX) * newWidth;
    }

    if (this.config.direction === 'x') {
      newY0 = currentDomain.y[0];
      newY1 = currentDomain.y[1];
    } else {
      newY0 = centerY - ratioY * newHeight;
      newY1 = centerY + (1 - ratioY) * newHeight;
    }

    // Clamp domain to stay within padded initial bounds when zoomed out
    const padding = this.config.zoomPadding;
    const absInitialWidth = Math.abs(initialWidth);
    const absInitialHeight = Math.abs(initialHeight);

    // Calculate padded bounds (works for both normal and inverted domains)
    const paddingX = absInitialWidth * padding;
    const paddingY = absInitialHeight * padding;

    // For normal domains: padded extends [min - padding, max + padding]
    // For inverted domains: padded extends [max + padding, min - padding]
    const paddedX0 = chartInitialDomain.x[0] - Math.sign(initialWidth) * paddingX;
    const paddedX1 = chartInitialDomain.x[1] + Math.sign(initialWidth) * paddingX;
    const paddedY0 = chartInitialDomain.y[0] - Math.sign(initialHeight) * paddingY;
    const paddedY1 = chartInitialDomain.y[1] + Math.sign(initialHeight) * paddingY;

    // Clamp X domain (handle both normal and inverted)
    const absNewWidth = Math.abs(newWidth);
    if (initialWidth > 0) {
      // Normal domain
      if (newX0 < paddedX0) {
        newX0 = paddedX0;
        newX1 = paddedX0 + absNewWidth;
      }
      if (newX1 > paddedX1) {
        newX1 = paddedX1;
        newX0 = paddedX1 - absNewWidth;
      }
    } else {
      // Inverted domain
      if (newX0 > paddedX0) {
        newX0 = paddedX0;
        newX1 = paddedX0 - absNewWidth;
      }
      if (newX1 < paddedX1) {
        newX1 = paddedX1;
        newX0 = paddedX1 + absNewWidth;
      }
    }

    // Clamp Y domain (handle both normal and inverted)
    const absNewHeight = Math.abs(newHeight);
    if (initialHeight > 0) {
      // Normal domain
      if (newY0 < paddedY0) {
        newY0 = paddedY0;
        newY1 = paddedY0 + absNewHeight;
      }
      if (newY1 > paddedY1) {
        newY1 = paddedY1;
        newY0 = paddedY1 - absNewHeight;
      }
    } else {
      // Inverted domain
      if (newY0 > paddedY0) {
        newY0 = paddedY0;
        newY1 = paddedY0 - absNewHeight;
      }
      if (newY1 < paddedY1) {
        newY1 = paddedY1;
        newY0 = paddedY1 + absNewHeight;
      }
    }

    const newDomain: DataDomain = {
      x: [newX0, newX1],
      y: [newY0, newY1],
    };

    // Update domain
    this.chart.setDomain(newDomain);

    // Emit zoom event
    this.chart.emit('zoom', {
      domain: newDomain,
      factor,
      center: { x: centerX, y: centerY },
      direction: factor < 1 ? 'in' : 'out',
      timestamp: Date.now(),
      originalEvent: event.originalEvent,
    });
  }

  /**
   * Reset zoom to initial domain
   * @param options - Options including whether to animate (default: true if chart.options.animate is true)
   */
  resetZoom(options?: { animate?: boolean }): void {
    if (!this.chart) return;

    // Use chart's resetZoom which uses the canonical initial domain
    // Animate by default based on chart options
    this.chart.resetZoom({ animate: options?.animate });

    // Update our reference
    this.updateInitialDomain();

    if (this.initialDomain) {
      this.chart.emit('zoom', {
        domain: this.initialDomain,
        factor: 1,
        center: {
          x: (this.initialDomain.x[0] + this.initialDomain.x[1]) / 2,
          y: (this.initialDomain.y[0] + this.initialDomain.y[1]) / 2,
        },
        direction: 'out',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Zoom to a specific domain
   * @param domain - The domain to zoom to
   * @param options - Options including whether to animate (default: true if chart.options.animate is true)
   */
  zoomToDomain(domain: DataDomain, options?: { animate?: boolean }): void {
    if (!this.chart) return;
    this.chart.setDomain(domain, { animate: options?.animate });
  }

  /**
   * Zoom to fit all data
   * @param options - Options including whether to animate (default: true if chart.options.animate is true)
   */
  zoomToFit(options?: { animate?: boolean }): void {
    if (!this.chart) return;

    // Use chart's resetZoom to go back to initial data bounds
    // Animate by default based on chart options
    this.chart.resetZoom({ animate: options?.animate });
    this.updateInitialDomain();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ZoomHandlerConfig>): void {
    Object.assign(this.config, config);
    if (config.enabled !== undefined) {
      this.enabled = config.enabled;
    }
  }

  /**
   * Get current zoom level relative to initial
   * Returns values where 1 = no zoom, >1 = zoomed in, <1 = zoomed out
   */
  getZoomLevel(): { x: number; y: number } {
    if (!this.chart) {
      return { x: 1, y: 1 };
    }

    // Always get fresh initial domain from chart
    const chartInitialDomain = this.chart.getInitialDomain();
    if (!chartInitialDomain) {
      return { x: 1, y: 1 };
    }

    const state = this.chart.getState();
    const currentDomain = state.domain;

    const initialWidth = chartInitialDomain.x[1] - chartInitialDomain.x[0];
    const initialHeight = chartInitialDomain.y[1] - chartInitialDomain.y[0];
    const currentWidth = currentDomain.x[1] - currentDomain.x[0];
    const currentHeight = currentDomain.y[1] - currentDomain.y[0];

    // Avoid division by zero
    if (currentWidth === 0 || currentHeight === 0) {
      return { x: 1, y: 1 };
    }

    return {
      x: initialWidth / currentWidth,
      y: initialHeight / currentHeight,
    };
  }
}
