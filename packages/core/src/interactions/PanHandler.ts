/**
 * Pan handler for click-drag panning
 */

import type { InteractionEvent, PanConfig, DataDomain } from '../types/index.js';
import { BaseInteractionHandler } from './InteractionHandler.js';

/**
 * Configuration for the pan handler
 */
export interface PanHandlerConfig extends Partial<PanConfig> {
  /** Enable momentum/inertia after release */
  momentum?: boolean;
  /** Momentum friction (0-1, higher = more friction) */
  friction?: number;
  /** Disable panning when at default zoom level (default: true) */
  disableAtDefaultZoom?: boolean;
  /**
   * How far past the data bounds the user can pan, as a fraction of the visible domain.
   * 0 = no padding (can't pan past data), 0.5 = can pan half the view past data.
   * Default: 0.1 (10% padding)
   */
  panPadding?: number;
}

/**
 * Handler for click-drag panning
 */
/**
 * Internal config type where modifierKey remains optional
 */
type InternalPanConfig = {
  enabled: boolean;
  button: 0 | 1 | 2;
  modifierKey?: 'ctrl' | 'alt' | 'shift' | 'meta';
  momentum: boolean;
  friction: number;
  disableAtDefaultZoom: boolean;
  panPadding: number;
};

export class PanHandler extends BaseInteractionHandler {
  readonly id = 'pan';

  private config: InternalPanConfig;
  private isDragging: boolean = false;
  private lastPosition: { x: number; y: number } | null = null;
  private lastDataPosition: { x: number; y: number } | null = null;
  private velocity: { x: number; y: number } = { x: 0, y: 0 };
  private momentumFrame: number | null = null;
  private lastMoveTime: number = 0;

  constructor(config: PanHandlerConfig = {}) {
    super();
    this.config = {
      enabled: config.enabled ?? true,
      button: config.button ?? 0, // Left mouse button
      modifierKey: config.modifierKey,
      momentum: config.momentum ?? false,
      friction: config.friction ?? 0.92,
      disableAtDefaultZoom: config.disableAtDefaultZoom ?? true,
      panPadding: config.panPadding ?? 0.1, // 10% padding by default
    };
    this.enabled = this.config.enabled;
  }

  /**
   * Check if modifier key requirement is met
   */
  private checkModifier(event: InteractionEvent): boolean {
    if (!this.config.modifierKey) return true;

    const originalEvent = event.originalEvent as PointerEvent;

    switch (this.config.modifierKey) {
      case 'ctrl':
        return originalEvent.ctrlKey;
      case 'alt':
        return originalEvent.altKey;
      case 'shift':
        return originalEvent.shiftKey;
      case 'meta':
        return originalEvent.metaKey;
      default:
        return true;
    }
  }

  /**
   * Handle pointer down - start drag
   */
  onPointerDown(event: InteractionEvent): void {
    if (!this.chart || !this.enabled) return;

    const originalEvent = event.originalEvent as PointerEvent;

    // Check button
    if (originalEvent.button !== this.config.button) return;

    // Check modifier
    if (!this.checkModifier(event)) return;

    // Don't allow panning at default zoom level if configured
    if (this.config.disableAtDefaultZoom && this.chart.isAtDefaultZoom()) {
      return;
    }

    // Stop any momentum animation
    this.stopMomentum();

    this.isDragging = true;
    this.lastPosition = { x: event.x, y: event.y };
    this.lastDataPosition = { x: event.dataX, y: event.dataY };
    this.velocity = { x: 0, y: 0 };
    this.lastMoveTime = performance.now();

    event.preventDefault();
  }

  /**
   * Clamp domain to stay within allowed pan bounds
   */
  private clampDomain(domain: DataDomain): DataDomain {
    if (!this.chart) return domain;

    const initialDomain = this.chart.getInitialDomain();
    if (!initialDomain) return domain;

    const padding = this.config.panPadding;

    // Calculate domain sizes (preserve sign for inverted domains)
    const viewWidth = domain.x[1] - domain.x[0];
    const viewHeight = domain.y[1] - domain.y[0];
    const initialWidth = initialDomain.x[1] - initialDomain.x[0];
    const initialHeight = initialDomain.y[1] - initialDomain.y[0];

    // Calculate allowed padding in data units
    const paddingX = Math.abs(viewWidth) * padding;
    const paddingY = Math.abs(viewHeight) * padding;

    // Calculate padded bounds (works for both normal and inverted domains)
    const paddedX0 = initialDomain.x[0] - Math.sign(initialWidth) * paddingX;
    const paddedX1 = initialDomain.x[1] + Math.sign(initialWidth) * paddingX;
    const paddedY0 = initialDomain.y[0] - Math.sign(initialHeight) * paddingY;
    const paddedY1 = initialDomain.y[1] + Math.sign(initialHeight) * paddingY;

    // Clamp the domain while preserving view size
    let clampedX0 = domain.x[0];
    let clampedX1 = domain.x[1];
    let clampedY0 = domain.y[0];
    let clampedY1 = domain.y[1];

    const absViewWidth = Math.abs(viewWidth);
    const absViewHeight = Math.abs(viewHeight);

    // Clamp X axis (handle both normal and inverted)
    if (initialWidth > 0) {
      // Normal domain
      if (clampedX0 < paddedX0) {
        clampedX0 = paddedX0;
        clampedX1 = paddedX0 + absViewWidth;
      }
      if (clampedX1 > paddedX1) {
        clampedX1 = paddedX1;
        clampedX0 = paddedX1 - absViewWidth;
      }
    } else {
      // Inverted domain
      if (clampedX0 > paddedX0) {
        clampedX0 = paddedX0;
        clampedX1 = paddedX0 - absViewWidth;
      }
      if (clampedX1 < paddedX1) {
        clampedX1 = paddedX1;
        clampedX0 = paddedX1 + absViewWidth;
      }
    }

    // Clamp Y axis (handle both normal and inverted)
    if (initialHeight > 0) {
      // Normal domain
      if (clampedY0 < paddedY0) {
        clampedY0 = paddedY0;
        clampedY1 = paddedY0 + absViewHeight;
      }
      if (clampedY1 > paddedY1) {
        clampedY1 = paddedY1;
        clampedY0 = paddedY1 - absViewHeight;
      }
    } else {
      // Inverted domain
      if (clampedY0 > paddedY0) {
        clampedY0 = paddedY0;
        clampedY1 = paddedY0 - absViewHeight;
      }
      if (clampedY1 < paddedY1) {
        clampedY1 = paddedY1;
        clampedY0 = paddedY1 + absViewHeight;
      }
    }

    return {
      x: [clampedX0, clampedX1],
      y: [clampedY0, clampedY1],
    };
  }

  /**
   * Handle pointer move - perform pan
   */
  onPointerMove(event: InteractionEvent): void {
    if (!this.chart || !this.enabled || !this.isDragging || !this.lastDataPosition) return;

    const state = this.chart.getState();
    const currentDomain = state.domain;

    // Calculate delta in data coordinates
    // Sign is inverted for natural "drag the content" behavior:
    // drag right → content moves right → see what was on the left
    const deltaX = event.dataX - this.lastDataPosition.x;
    const deltaY = event.dataY - this.lastDataPosition.y;

    // Calculate new domain (subtract delta to move in drag direction)
    let newDomain: DataDomain = {
      x: [currentDomain.x[0] - deltaX, currentDomain.x[1] - deltaX],
      y: [currentDomain.y[0] - deltaY, currentDomain.y[1] - deltaY],
    };

    // Clamp to pan bounds
    newDomain = this.clampDomain(newDomain);

    // Calculate velocity for momentum
    const now = performance.now();
    const dt = now - this.lastMoveTime;
    if (dt > 0) {
      // Use pixel-based velocity for consistency
      const pixelDeltaX = event.x - (this.lastPosition?.x ?? event.x);
      const pixelDeltaY = event.y - (this.lastPosition?.y ?? event.y);
      this.velocity = {
        x: pixelDeltaX / dt,
        y: pixelDeltaY / dt,
      };
    }
    this.lastMoveTime = now;
    this.lastPosition = { x: event.x, y: event.y };

    // Update domain
    this.chart.setDomain(newDomain);

    // Re-calculate data position after domain change
    this.lastDataPosition = this.chart.pixelToData(event.x, event.y);

    // Emit pan event
    this.chart.emit('pan', {
      domain: newDomain,
      delta: { x: deltaX, y: deltaY },
      timestamp: Date.now(),
      originalEvent: event.originalEvent,
    });

    event.preventDefault();
  }

  /**
   * Handle pointer up - end drag
   */
  onPointerUp(_event: InteractionEvent): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.lastPosition = null;
    this.lastDataPosition = null;

    // Start momentum if enabled and we have velocity
    if (this.config.momentum && this.chart) {
      const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
      if (speed > 0.05) {
        this.startMomentum();
      }
    }
  }

  /**
   * Start momentum animation
   */
  private startMomentum(): void {
    if (!this.chart) return;

    const animate = () => {
      if (!this.chart) return;

      // Apply friction
      this.velocity.x *= this.config.friction;
      this.velocity.y *= this.config.friction;

      // Stop if velocity is very small
      const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
      if (speed < 0.01) {
        this.stopMomentum();
        return;
      }

      // Convert pixel velocity to data delta
      const state = this.chart.getState();
      const plotArea = this.chart.getPlotArea();
      const domainWidth = state.domain.x[1] - state.domain.x[0];
      const domainHeight = state.domain.y[1] - state.domain.y[0];

      // Velocity is in pixels/ms, we want data units/frame
      const frameTime = 16; // ~60fps
      const deltaX = (-this.velocity.x * frameTime * domainWidth) / plotArea.width;
      const deltaY = (this.velocity.y * frameTime * domainHeight) / plotArea.height;

      const currentDomain = state.domain;
      let newDomain: DataDomain = {
        x: [currentDomain.x[0] + deltaX, currentDomain.x[1] + deltaX],
        y: [currentDomain.y[0] + deltaY, currentDomain.y[1] + deltaY],
      };

      // Clamp to pan bounds
      newDomain = this.clampDomain(newDomain);

      // Stop momentum if we hit the boundary
      const hitBoundary =
        newDomain.x[0] === currentDomain.x[0] &&
        newDomain.x[1] === currentDomain.x[1] &&
        newDomain.y[0] === currentDomain.y[0] &&
        newDomain.y[1] === currentDomain.y[1];

      if (hitBoundary) {
        this.stopMomentum();
        return;
      }

      this.chart.setDomain(newDomain);

      this.momentumFrame = requestAnimationFrame(animate);
    };

    this.momentumFrame = requestAnimationFrame(animate);
  }

  /**
   * Stop momentum animation
   */
  private stopMomentum(): void {
    if (this.momentumFrame !== null) {
      cancelAnimationFrame(this.momentumFrame);
      this.momentumFrame = null;
    }
    this.velocity = { x: 0, y: 0 };
  }

  protected onDetach(): void {
    this.stopMomentum();
    this.isDragging = false;
    this.lastPosition = null;
    this.lastDataPosition = null;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PanHandlerConfig>): void {
    Object.assign(this.config, config);
    if (config.enabled !== undefined) {
      this.enabled = config.enabled;
    }
  }
}
