/**
 * Interaction handler base types and utilities
 */

import type { InteractionEvent } from '../types/index.js';
import type { BaseChart } from '../charts/BaseChart.js';

/**
 * Interface for composable interaction handlers
 */
export interface InteractionHandler {
  /** Unique identifier for this handler */
  readonly id: string;

  /** Whether this handler is currently enabled */
  enabled: boolean;

  /**
   * Attach this handler to a chart
   * Called when the handler is added to a chart
   */
  attach(chart: BaseChart): void;

  /**
   * Detach this handler from a chart
   * Called when the handler is removed from a chart
   */
  detach(): void;

  /**
   * Handle pointer down event
   * @param event - The interaction event
   */
  onPointerDown?(event: InteractionEvent): void;

  /**
   * Handle pointer move event
   * @param event - The interaction event
   */
  onPointerMove?(event: InteractionEvent): void;

  /**
   * Handle pointer up event
   * @param event - The interaction event
   */
  onPointerUp?(event: InteractionEvent): void;

  /**
   * Handle wheel event
   * @param event - The interaction event
   */
  onWheel?(event: InteractionEvent): void;
}

/**
 * Base class for interaction handlers with common functionality
 */
export abstract class BaseInteractionHandler implements InteractionHandler {
  abstract readonly id: string;
  enabled: boolean = true;

  protected chart: BaseChart | null = null;

  attach(chart: BaseChart): void {
    this.chart = chart;
    this.onAttach();
  }

  detach(): void {
    this.onDetach();
    this.chart = null;
  }

  /**
   * Called when attached to a chart
   * Override in subclasses for setup
   */
  protected onAttach(): void {
    // Override in subclass
  }

  /**
   * Called when detached from a chart
   * Override in subclasses for cleanup
   */
  protected onDetach(): void {
    // Override in subclass
  }
}
