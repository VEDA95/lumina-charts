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

    // Calculate current domain size
    const currentWidth = currentDomain.x[1] - currentDomain.x[0];
    const currentHeight = currentDomain.y[1] - currentDomain.y[0];

    // Calculate initial domain size (for zoom limits)
    const initialWidth = chartInitialDomain.x[1] - chartInitialDomain.x[0];
    const initialHeight = chartInitialDomain.y[1] - chartInitialDomain.y[0];

    // Guard against zero/invalid domain sizes
    if (currentWidth <= 0 || currentHeight <= 0 || initialWidth <= 0 || initialHeight <= 0) {
      return;
    }

    // Calculate current zoom level relative to initial (>1 = zoomed in, <1 = zoomed out)
    const currentZoomX = initialWidth / currentWidth;
    const currentZoomY = initialHeight / currentHeight;

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
        // Clamp to minimum zoom
        const clampedFactor = Math.min(currentZoomX / minZoom, currentZoomY / minZoom);
        if (clampedFactor <= 1) return; // Already at or past limit
        factor = clampedFactor;
      }
    } else {
      // Zooming in - check maximum zoom level
      if (newZoomX > maxZoom || newZoomY > maxZoom) {
        // Clamp to maximum zoom
        const clampedFactor = Math.max(currentZoomX / maxZoom, currentZoomY / maxZoom);
        if (clampedFactor >= 1) return; // Already at or past limit
        factor = clampedFactor;
      }
    }

    // Calculate new domain size
    let newWidth = currentWidth * factor;
    let newHeight = currentHeight * factor;

    // Apply direction constraint
    if (this.config.direction === 'x') {
      newHeight = currentHeight;
    } else if (this.config.direction === 'y') {
      newWidth = currentWidth;
    }

    // Calculate new domain, keeping center point at same screen position
    const ratioX = (centerX - currentDomain.x[0]) / currentWidth;
    const ratioY = (centerY - currentDomain.y[0]) / currentHeight;

    let newMinX = this.config.direction === 'y' ? currentDomain.x[0] : centerX - ratioX * newWidth;
    let newMaxX = this.config.direction === 'y' ? currentDomain.x[1] : newMinX + newWidth;
    let newMinY = this.config.direction === 'x' ? currentDomain.y[0] : centerY - ratioY * newHeight;
    let newMaxY = this.config.direction === 'x' ? currentDomain.y[1] : newMinY + newHeight;

    // Clamp domain to stay within padded initial bounds when zoomed out
    const padding = this.config.zoomPadding;
    const paddedMinX = chartInitialDomain.x[0] - initialWidth * padding;
    const paddedMaxX = chartInitialDomain.x[1] + initialWidth * padding;
    const paddedMinY = chartInitialDomain.y[0] - initialHeight * padding;
    const paddedMaxY = chartInitialDomain.y[1] + initialHeight * padding;

    // Clamp X
    if (newMinX < paddedMinX) {
      newMinX = paddedMinX;
      newMaxX = newMinX + newWidth;
    }
    if (newMaxX > paddedMaxX) {
      newMaxX = paddedMaxX;
      newMinX = newMaxX - newWidth;
    }

    // Clamp Y
    if (newMinY < paddedMinY) {
      newMinY = paddedMinY;
      newMaxY = newMinY + newHeight;
    }
    if (newMaxY > paddedMaxY) {
      newMaxY = paddedMaxY;
      newMinY = newMaxY - newHeight;
    }

    const newDomain: DataDomain = {
      x: [newMinX, newMaxX],
      y: [newMinY, newMaxY],
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
   */
  resetZoom(): void {
    if (!this.chart) return;

    // Use chart's resetZoom which uses the canonical initial domain
    this.chart.resetZoom();

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
   */
  zoomToDomain(domain: DataDomain): void {
    if (!this.chart) return;
    this.chart.setDomain(domain);
  }

  /**
   * Zoom to fit all data
   */
  zoomToFit(): void {
    if (!this.chart) return;

    // Use chart's resetZoom to go back to initial data bounds
    this.chart.resetZoom();
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
