/**
 * Domain animator for smooth zoom/pan transitions
 */

import type { DataDomain } from '../types/index.js';
import { lerp } from '../utils/math.js';
import { easeOut, type EasingFunction } from './easing.js';

/**
 * Configuration for domain animations
 */
export interface AnimationConfig {
  /** Animation duration in milliseconds (default: 300) */
  duration?: number;
  /** Easing function (default: easeOut) */
  easing?: EasingFunction;
  /** Callback when animation completes */
  onComplete?: () => void;
}

/**
 * Interpolate between two domains
 */
function lerpDomain(from: DataDomain, to: DataDomain, t: number): DataDomain {
  return {
    x: [lerp(from.x[0], to.x[0], t), lerp(from.x[1], to.x[1], t)],
    y: [lerp(from.y[0], to.y[0], t), lerp(from.y[1], to.y[1], t)],
  };
}

/**
 * Animator for smooth domain transitions
 *
 * Uses requestAnimationFrame for smooth animations and supports
 * cancellation when a new animation starts.
 */
export class DomainAnimator {
  private animationFrame: number | null = null;
  private startTime: number = 0;
  private fromDomain: DataDomain | null = null;
  private toDomain: DataDomain | null = null;
  private duration: number = 300;
  private easingFn: EasingFunction = easeOut;
  private onUpdate: ((domain: DataDomain) => void) | null = null;
  private onComplete: (() => void) | null = null;

  /**
   * Animate to a target domain
   *
   * @param from - Starting domain
   * @param to - Target domain
   * @param onUpdate - Callback called each frame with the interpolated domain
   * @param config - Animation configuration
   */
  animateTo(
    from: DataDomain,
    to: DataDomain,
    onUpdate: (domain: DataDomain) => void,
    config?: AnimationConfig
  ): void {
    // Cancel any existing animation
    this.cancel();

    // Store animation state
    this.fromDomain = { x: [...from.x], y: [...from.y] };
    this.toDomain = { x: [...to.x], y: [...to.y] };
    this.onUpdate = onUpdate;
    this.duration = config?.duration ?? 300;
    this.easingFn = config?.easing ?? easeOut;
    this.onComplete = config?.onComplete ?? null;

    // Start animation
    this.startTime = performance.now();
    this.animate();
  }

  /**
   * Animation loop
   */
  private animate = (): void => {
    if (!this.fromDomain || !this.toDomain || !this.onUpdate) {
      return;
    }

    const elapsed = performance.now() - this.startTime;
    const rawProgress = Math.min(elapsed / this.duration, 1);
    const easedProgress = this.easingFn(rawProgress);

    // Interpolate domain
    const currentDomain = lerpDomain(this.fromDomain, this.toDomain, easedProgress);

    // Update
    this.onUpdate(currentDomain);

    // Continue or complete
    if (rawProgress < 1) {
      this.animationFrame = requestAnimationFrame(this.animate);
    } else {
      this.animationFrame = null;
      this.fromDomain = null;
      this.toDomain = null;
      this.onUpdate = null;
      const callback = this.onComplete;
      this.onComplete = null;
      callback?.();
    }
  };

  /**
   * Cancel the current animation
   */
  cancel(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.fromDomain = null;
    this.toDomain = null;
    this.onUpdate = null;
    this.onComplete = null;
  }

  /**
   * Check if an animation is currently running
   */
  isAnimating(): boolean {
    return this.animationFrame !== null;
  }
}
