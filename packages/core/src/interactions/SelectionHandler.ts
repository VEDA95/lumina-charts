/**
 * Selection handler for point selection
 */

import type { InteractionEvent, SelectConfig, SelectionEvent, DataDomain } from '../types/index.js';
import { BaseInteractionHandler } from './InteractionHandler.js';
import type { IndexedPoint } from '../data/SpatialIndex.js';

/**
 * Configuration for the selection handler
 */
export interface SelectionHandlerConfig extends Partial<SelectConfig> {
  /** Maximum distance (in data units) to select a point via click */
  clickRadius?: number;
}

/**
 * Handler for point selection interactions
 */
export class SelectionHandler extends BaseInteractionHandler {
  readonly id = 'selection';

  private config: Required<SelectionHandlerConfig>;
  private brushStart: { x: number; y: number } | null = null;
  private isBrushing: boolean = false;
  private lassoPoints: Array<{ x: number; y: number }> = [];
  private isLassoing: boolean = false;

  constructor(config: SelectionHandlerConfig = {}) {
    super();
    this.config = {
      enabled: config.enabled ?? true,
      mode: config.mode ?? 'single',
      multiSelectKey: config.multiSelectKey ?? 'shift',
      clickRadius: config.clickRadius ?? 20, // pixels
    };
    this.enabled = this.config.enabled;
  }

  /**
   * Check if multi-select modifier is pressed
   */
  private isMultiSelectActive(event: InteractionEvent): boolean {
    const originalEvent = event.originalEvent as PointerEvent;

    switch (this.config.multiSelectKey) {
      case 'ctrl':
        return originalEvent.ctrlKey;
      case 'alt':
        return originalEvent.altKey;
      case 'shift':
        return originalEvent.shiftKey;
      case 'meta':
        return originalEvent.metaKey;
      default:
        return false;
    }
  }

  /**
   * Handle pointer down - start selection
   */
  onPointerDown(event: InteractionEvent): void {
    if (!this.chart || !this.enabled) return;

    const originalEvent = event.originalEvent as PointerEvent;

    // Only handle left click for selection
    if (originalEvent.button !== 0) return;

    if (this.config.mode === 'brush') {
      this.startBrush(event);
    } else if (this.config.mode === 'lasso') {
      this.startLasso(event);
    }
    // Single/multi mode handled on pointer up (click)
  }

  /**
   * Handle pointer move - update brush/lasso
   */
  onPointerMove(event: InteractionEvent): void {
    if (!this.chart || !this.enabled) return;

    if (this.isBrushing) {
      this.updateBrush(event);
    } else if (this.isLassoing) {
      this.updateLasso(event);
    }
  }

  /**
   * Handle pointer up - complete selection
   */
  onPointerUp(event: InteractionEvent): void {
    if (!this.chart || !this.enabled) return;

    if (this.isBrushing) {
      this.completeBrush(event);
    } else if (this.isLassoing) {
      this.completeLasso(event);
    } else if (this.config.mode === 'single' || this.config.mode === 'multi') {
      this.handleClick(event);
    }
  }

  /**
   * Handle click selection
   */
  private handleClick(event: InteractionEvent): void {
    if (!this.chart) return;

    const spatialIndex = this.chart.getSpatialIndex();
    const state = this.chart.getState();
    const pixelRatio = (this.chart as any).pixelRatio ?? 1;

    // Convert click radius from pixels to data units
    const plotArea = this.chart.getPlotArea();
    const domainWidth = state.domain.x[1] - state.domain.x[0];
    const domainHeight = state.domain.y[1] - state.domain.y[0];

    const maxDistanceData = Math.max(
      (this.config.clickRadius * pixelRatio * domainWidth) / plotArea.width,
      (this.config.clickRadius * pixelRatio * domainHeight) / plotArea.height
    );

    // Find nearest point
    const result = spatialIndex.findNearest(
      event.dataX,
      event.dataY,
      maxDistanceData,
      state.visibleSeries
    );

    const isMulti = this.config.mode === 'multi' && this.isMultiSelectActive(event);
    const previousSelected = new Set(state.selectedPoints);

    if (result) {
      const pointId = `${result.point.seriesId}:${result.point.pointIndex}`;

      if (isMulti) {
        // Toggle selection
        if (state.selectedPoints.has(pointId)) {
          state.selectedPoints.delete(pointId);
        } else {
          state.selectedPoints.add(pointId);
        }
      } else {
        // Single selection - replace
        state.selectedPoints.clear();
        state.selectedPoints.add(pointId);
      }
    } else if (!isMulti) {
      // Click on empty space clears selection (unless multi-select)
      state.selectedPoints.clear();
    }

    this.emitSelectionChange(previousSelected, state.selectedPoints);
  }

  /**
   * Start brush selection
   */
  private startBrush(event: InteractionEvent): void {
    this.isBrushing = true;
    this.brushStart = { x: event.dataX, y: event.dataY };
  }

  /**
   * Update brush selection
   */
  private updateBrush(_event: InteractionEvent): void {
    // Could render brush rectangle here if we had a UI for it
  }

  /**
   * Complete brush selection
   */
  private completeBrush(event: InteractionEvent): void {
    if (!this.chart || !this.brushStart) {
      this.isBrushing = false;
      return;
    }

    const spatialIndex = this.chart.getSpatialIndex();
    const state = this.chart.getState();

    // Create bounding box from brush
    const minX = Math.min(this.brushStart.x, event.dataX);
    const maxX = Math.max(this.brushStart.x, event.dataX);
    const minY = Math.min(this.brushStart.y, event.dataY);
    const maxY = Math.max(this.brushStart.y, event.dataY);

    // Find points in brush area
    const points = spatialIndex.findInRect(
      { minX, minY, maxX, maxY },
      state.visibleSeries
    );

    const previousSelected = new Set(state.selectedPoints);
    const isMulti = this.isMultiSelectActive(event);

    if (!isMulti) {
      state.selectedPoints.clear();
    }

    for (const point of points) {
      const pointId = `${point.seriesId}:${point.pointIndex}`;
      state.selectedPoints.add(pointId);
    }

    this.emitSelectionChange(previousSelected, state.selectedPoints, {
      x: [minX, maxX],
      y: [minY, maxY],
    });

    this.isBrushing = false;
    this.brushStart = null;
  }

  /**
   * Start lasso selection
   */
  private startLasso(event: InteractionEvent): void {
    this.isLassoing = true;
    this.lassoPoints = [{ x: event.dataX, y: event.dataY }];
  }

  /**
   * Update lasso selection
   */
  private updateLasso(event: InteractionEvent): void {
    this.lassoPoints.push({ x: event.dataX, y: event.dataY });
  }

  /**
   * Complete lasso selection
   */
  private completeLasso(event: InteractionEvent): void {
    if (!this.chart || this.lassoPoints.length < 3) {
      this.isLassoing = false;
      this.lassoPoints = [];
      return;
    }

    // Close the lasso
    this.lassoPoints.push({ x: event.dataX, y: event.dataY });

    const spatialIndex = this.chart.getSpatialIndex();
    const state = this.chart.getState();

    // Find points in lasso polygon
    const points = spatialIndex.findInPolygon(
      this.lassoPoints,
      state.visibleSeries
    );

    const previousSelected = new Set(state.selectedPoints);
    const isMulti = this.isMultiSelectActive(event);

    if (!isMulti) {
      state.selectedPoints.clear();
    }

    for (const point of points) {
      const pointId = `${point.seriesId}:${point.pointIndex}`;
      state.selectedPoints.add(pointId);
    }

    this.emitSelectionChange(previousSelected, state.selectedPoints);

    this.isLassoing = false;
    this.lassoPoints = [];
  }

  /**
   * Emit selection change event
   */
  private emitSelectionChange(
    previous: Set<string>,
    current: Set<string>,
    bounds?: DataDomain
  ): void {
    if (!this.chart) return;

    // Calculate added and removed
    const added: string[] = [];
    const removed: string[] = [];

    for (const id of current) {
      if (!previous.has(id)) {
        added.push(id);
      }
    }

    for (const id of previous) {
      if (!current.has(id)) {
        removed.push(id);
      }
    }

    // Only emit if there was a change
    if (added.length > 0 || removed.length > 0) {
      this.chart.emit('selectionChange', {
        selected: new Set(current),
        added,
        removed,
        bounds,
        timestamp: Date.now(),
      });

      // Request re-render to show selection state
      this.chart.render();
    }
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    if (!this.chart) return;

    const state = this.chart.getState();
    const previousSelected = new Set(state.selectedPoints);

    state.selectedPoints.clear();

    this.emitSelectionChange(previousSelected, state.selectedPoints);
  }

  /**
   * Select points by ID
   */
  selectPoints(pointIds: string[]): void {
    if (!this.chart) return;

    const state = this.chart.getState();
    const previousSelected = new Set(state.selectedPoints);

    for (const id of pointIds) {
      state.selectedPoints.add(id);
    }

    this.emitSelectionChange(previousSelected, state.selectedPoints);
  }

  /**
   * Get currently selected point IDs
   */
  getSelectedPoints(): string[] {
    if (!this.chart) return [];
    return Array.from(this.chart.getState().selectedPoints);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SelectionHandlerConfig>): void {
    Object.assign(this.config, config);
    if (config.enabled !== undefined) {
      this.enabled = config.enabled;
    }
  }

  protected onDetach(): void {
    this.isBrushing = false;
    this.isLassoing = false;
    this.brushStart = null;
    this.lassoPoints = [];
  }
}
