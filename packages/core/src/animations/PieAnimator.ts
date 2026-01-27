/**
 * Pie animator for smooth slice transitions
 */

import type { PieSlice } from '../types/pie.js';
import type { RGBAColor } from '../types/index.js';
import { lerp } from '../utils/math.js';
import { easeOut, type EasingFunction } from './easing.js';

/**
 * Configuration for pie animations
 */
export interface PieAnimationConfig {
  /** Animation duration in milliseconds (default: 300) */
  duration?: number;
  /** Easing function (default: easeOut) */
  easing?: EasingFunction;
  /** Callback when animation completes */
  onComplete?: () => void;
}

/**
 * Animated slice state (internal representation for interpolation)
 */
interface AnimatedSliceState {
  /** Normalized value (0-1 range for animation, represents percentage of total) */
  normalizedValue: number;
  /** Original value */
  value: number;
  /** Label */
  label: string;
  /** Color */
  color: RGBAColor;
  /** Data index for tracking */
  dataIndex: number | undefined;
  /** Series ID */
  seriesId: string | undefined;
}

/**
 * Interpolate between two colors
 */
function lerpColor(from: RGBAColor, to: RGBAColor, t: number): RGBAColor {
  return [
    lerp(from[0], to[0], t),
    lerp(from[1], to[1], t),
    lerp(from[2], to[2], t),
    lerp(from[3], to[3], t),
  ];
}

/**
 * Animator for smooth pie slice transitions
 *
 * Handles:
 * - Slice value changes (smooth angle transitions)
 * - New slices appearing (grow from zero)
 * - Slices disappearing (shrink to zero)
 */
export class PieAnimator {
  private animationFrame: number | null = null;
  private startTime: number = 0;
  private fromState: AnimatedSliceState[] | null = null;
  private toState: AnimatedSliceState[] | null = null;
  private duration: number = 300;
  private easingFn: EasingFunction = easeOut;
  private onUpdate: ((slices: PieSlice[], progress: number) => void) | null = null;
  private onComplete: (() => void) | null = null;

  // Configuration for slice calculation
  private startAngle: number = -Math.PI / 2; // Default: -90 degrees (top)
  private padAngle: number = 0;

  /**
   * Set the start angle for slice calculations
   */
  setStartAngle(angleDeg: number): void {
    this.startAngle = (angleDeg * Math.PI) / 180;
  }

  /**
   * Set the pad angle between slices
   */
  setPadAngle(angleDeg: number): void {
    this.padAngle = (angleDeg * Math.PI) / 180;
  }

  /**
   * Convert slice data to animated state
   */
  private toAnimatedState(slices: PieSlice[]): AnimatedSliceState[] {
    return slices.map((slice) => ({
      normalizedValue: slice.percentage,
      value: slice.value,
      label: slice.label,
      color: [...slice.color] as RGBAColor,
      dataIndex: slice.dataIndex,
      seriesId: slice.seriesId,
    }));
  }

  /**
   * Convert animated state to PieSlice array
   */
  private toSlices(
    state: AnimatedSliceState[],
    selectedIndex: number | null,
    hoveredIndex: number | null
  ): PieSlice[] {
    const slices: PieSlice[] = [];
    let currentAngle = this.startAngle;

    // Calculate total for normalization
    const total = state.reduce((sum, s) => sum + s.normalizedValue, 0);

    for (let i = 0; i < state.length; i++) {
      const s = state[i];
      // Skip slices with zero or very small values
      if (s.normalizedValue < 0.0001) continue;

      const percentage = total > 0 ? s.normalizedValue / total : 0;
      const sliceAngle = percentage * Math.PI * 2 - this.padAngle;

      slices.push({
        index: i,
        label: s.label,
        value: s.value,
        percentage,
        startAngle: currentAngle,
        endAngle: currentAngle + sliceAngle,
        color: s.color,
        selected: i === selectedIndex,
        hovered: i === hoveredIndex,
        seriesId: s.seriesId,
        dataIndex: s.dataIndex,
      });

      currentAngle += sliceAngle + this.padAngle;
    }

    return slices;
  }

  /**
   * Match old slices to new slices by label/dataIndex for smooth transitions
   */
  private matchSlices(
    fromSlices: PieSlice[],
    toSlices: PieSlice[]
  ): {
    from: AnimatedSliceState[];
    to: AnimatedSliceState[];
  } {
    const fromState = this.toAnimatedState(fromSlices);
    const toState = this.toAnimatedState(toSlices);

    // Create maps for lookup
    const fromByLabel = new Map<string, AnimatedSliceState>();
    const toByLabel = new Map<string, AnimatedSliceState>();

    for (const s of fromState) {
      fromByLabel.set(s.label, s);
    }
    for (const s of toState) {
      toByLabel.set(s.label, s);
    }

    // Build matched arrays
    const allLabels = new Set([...fromByLabel.keys(), ...toByLabel.keys()]);
    const matchedFrom: AnimatedSliceState[] = [];
    const matchedTo: AnimatedSliceState[] = [];

    for (const label of allLabels) {
      const fromSlice = fromByLabel.get(label);
      const toSlice = toByLabel.get(label);

      if (fromSlice && toSlice) {
        // Slice exists in both - normal transition
        matchedFrom.push(fromSlice);
        matchedTo.push(toSlice);
      } else if (toSlice) {
        // New slice - animate from zero
        matchedFrom.push({
          ...toSlice,
          normalizedValue: 0,
          value: 0,
        });
        matchedTo.push(toSlice);
      } else if (fromSlice) {
        // Removed slice - animate to zero
        matchedFrom.push(fromSlice);
        matchedTo.push({
          ...fromSlice,
          normalizedValue: 0,
          value: 0,
        });
      }
    }

    return { from: matchedFrom, to: matchedTo };
  }

  /**
   * Interpolate between two states
   */
  private lerpState(
    from: AnimatedSliceState[],
    to: AnimatedSliceState[],
    t: number
  ): AnimatedSliceState[] {
    return from.map((fromSlice, i) => {
      const toSlice = to[i];
      return {
        normalizedValue: lerp(fromSlice.normalizedValue, toSlice.normalizedValue, t),
        value: lerp(fromSlice.value, toSlice.value, t),
        label: toSlice.label, // Use target label
        color: lerpColor(fromSlice.color, toSlice.color, t),
        dataIndex: toSlice.dataIndex,
        seriesId: toSlice.seriesId,
      };
    });
  }

  /**
   * Animate from old slices to new slices
   *
   * @param fromSlices - Starting slice state
   * @param toSlices - Target slice state
   * @param onUpdate - Callback called each frame with interpolated slices
   * @param config - Animation configuration
   * @param selectedIndex - Currently selected slice index
   * @param hoveredIndex - Currently hovered slice index
   */
  animateTo(
    fromSlices: PieSlice[],
    toSlices: PieSlice[],
    onUpdate: (slices: PieSlice[], progress: number) => void,
    config?: PieAnimationConfig,
    selectedIndex: number | null = null,
    hoveredIndex: number | null = null
  ): void {
    // Cancel any existing animation
    this.cancel();

    // Match slices for smooth transitions
    const { from, to } = this.matchSlices(fromSlices, toSlices);

    // Store animation state
    this.fromState = from;
    this.toState = to;
    this.onUpdate = (slices, progress) => onUpdate(slices, progress);
    this.duration = config?.duration ?? 300;
    this.easingFn = config?.easing ?? easeOut;
    this.onComplete = config?.onComplete ?? null;

    // Store indices for building slices
    const selIdx = selectedIndex;
    const hovIdx = hoveredIndex;

    // Wrap onUpdate to include slice building
    const originalOnUpdate = this.onUpdate;
    this.onUpdate = (_slices, progress) => {
      const interpolated = this.lerpState(this.fromState!, this.toState!, this.easingFn(progress));
      const builtSlices = this.toSlices(interpolated, selIdx, hovIdx);
      originalOnUpdate(builtSlices, progress);
    };

    // Start animation
    this.startTime = performance.now();
    this.animate();
  }

  /**
   * Animation loop
   */
  private animate = (): void => {
    if (!this.fromState || !this.toState || !this.onUpdate) {
      return;
    }

    const elapsed = performance.now() - this.startTime;
    const rawProgress = Math.min(elapsed / this.duration, 1);

    // Call update with raw progress (easing applied in onUpdate wrapper)
    this.onUpdate([], rawProgress);

    // Continue or complete
    if (rawProgress < 1) {
      this.animationFrame = requestAnimationFrame(this.animate);
    } else {
      this.animationFrame = null;
      this.fromState = null;
      this.toState = null;
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
    this.fromState = null;
    this.toState = null;
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
