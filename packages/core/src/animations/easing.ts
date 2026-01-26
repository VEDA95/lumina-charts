/**
 * Easing functions for animations
 */

/**
 * An easing function takes a progress value t (0-1) and returns the eased value
 */
export type EasingFunction = (t: number) => number;

/**
 * Linear easing - constant speed
 */
export function linear(t: number): number {
  return t;
}

/**
 * Ease out (cubic) - fast start, slow end
 */
export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Ease in (cubic) - slow start, fast end
 */
export function easeIn(t: number): number {
  return t * t * t;
}

/**
 * Ease in-out (cubic) - slow start and end, fast middle
 */
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Ease out (quadratic) - gentler than cubic
 */
export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/**
 * Ease in (quadratic) - gentler than cubic
 */
export function easeInQuad(t: number): number {
  return t * t;
}

/**
 * Ease in-out (quadratic)
 */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
