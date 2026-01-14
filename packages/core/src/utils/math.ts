/**
 * Math utilities for chart calculations
 */

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Inverse linear interpolation - find t given a value
 */
export function inverseLerp(a: number, b: number, value: number): number {
  return (value - a) / (b - a);
}

/**
 * Map a value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return lerp(outMin, outMax, inverseLerp(inMin, inMax, value));
}

/**
 * Check if two numbers are approximately equal
 */
export function approximately(a: number, b: number, epsilon: number = 1e-6): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * Round to a specific number of decimal places
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculate the distance between two points
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the squared distance between two points (faster, no sqrt)
 */
export function distanceSquared(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

/**
 * Normalize an angle to [0, 2π]
 */
export function normalizeAngle(angle: number): number {
  const TWO_PI = Math.PI * 2;
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Get the next power of 2 >= n
 */
export function nextPowerOf2(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Check if a number is a power of 2
 */
export function isPowerOf2(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Create an identity 4x4 matrix
 */
export function createIdentityMatrix(): Float32Array {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

/**
 * Create an orthographic projection matrix
 */
export function createOrthoMatrix(
  left: number,
  right: number,
  bottom: number,
  top: number,
  near: number = -1,
  far: number = 1
): Float32Array {
  const lr = 1 / (left - right);
  const bt = 1 / (bottom - top);
  const nf = 1 / (near - far);

  return new Float32Array([
    -2 * lr,
    0,
    0,
    0,
    0,
    -2 * bt,
    0,
    0,
    0,
    0,
    2 * nf,
    0,
    (left + right) * lr,
    (top + bottom) * bt,
    (far + near) * nf,
    1,
  ]);
}

/**
 * Multiply two 4x4 matrices
 */
export function multiplyMatrices(a: Float32Array, b: Float32Array): Float32Array {
  const result = new Float32Array(16);

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[i * 4 + k] * b[k * 4 + j];
      }
      result[i * 4 + j] = sum;
    }
  }

  return result;
}

/**
 * Create a translation matrix
 */
export function createTranslationMatrix(x: number, y: number, z: number = 0): Float32Array {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
}

/**
 * Create a scale matrix
 */
export function createScaleMatrix(x: number, y: number, z: number = 1): Float32Array {
  return new Float32Array([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]);
}

/**
 * Binary search for the closest index in a sorted array
 */
export function binarySearch(arr: ArrayLike<number>, target: number): number {
  let low = 0;
  let high = arr.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

/**
 * Find the index of the closest value in a sorted array
 */
export function findClosestIndex(arr: ArrayLike<number>, target: number): number {
  if (arr.length === 0) return -1;
  if (arr.length === 1) return 0;

  const idx = binarySearch(arr, target);

  if (idx === 0) return 0;
  if (idx >= arr.length) return arr.length - 1;

  const prev = arr[idx - 1];
  const curr = arr[idx];

  return Math.abs(target - prev) <= Math.abs(target - curr) ? idx - 1 : idx;
}

/**
 * Find minimum value in array (safe for large arrays)
 * Unlike Math.min(...arr), this doesn't hit call stack limits
 */
export function arrayMin(values: number[]): number {
  if (values.length === 0) return NaN;
  let min = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] < min) min = values[i];
  }
  return min;
}

/**
 * Find maximum value in array (safe for large arrays)
 * Unlike Math.max(...arr), this doesn't hit call stack limits
 */
export function arrayMax(values: number[]): number {
  if (values.length === 0) return NaN;
  let max = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] > max) max = values[i];
  }
  return max;
}

/**
 * Point interface for spline calculations
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Catmull-Rom spline interpolation between points
 * Creates a smooth curve that passes through all control points
 *
 * @param points - Array of control points (must have at least 2 points)
 * @param tension - Spline tension (0.0 = sharp, 0.5 = default smooth, 1.0 = very smooth)
 * @param segments - Number of interpolated points between each pair of control points
 * @returns Array of interpolated points forming a smooth curve
 */
export function catmullRomSpline(
  points: Point2D[],
  tension: number = 0.5,
  segments: number = 16
): Point2D[] {
  if (points.length < 2) return [...points];
  if (points.length === 2) {
    // Linear interpolation for 2 points
    const result: Point2D[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      result.push({
        x: lerp(points[0].x, points[1].x, t),
        y: lerp(points[0].y, points[1].y, t),
      });
    }
    return result;
  }

  const result: Point2D[] = [];

  // Process each segment between control points
  for (let i = 0; i < points.length - 1; i++) {
    // Get 4 points for Catmull-Rom (p0, p1, p2, p3)
    // p1 and p2 are the segment endpoints
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Generate points along this segment
    const numSegments = i === points.length - 2 ? segments + 1 : segments;
    for (let j = 0; j < numSegments; j++) {
      const t = j / segments;
      result.push(catmullRomPoint(p0, p1, p2, p3, t, tension));
    }
  }

  return result;
}

/**
 * Calculate a single point on a Catmull-Rom spline segment
 *
 * @param p0 - Point before segment start
 * @param p1 - Segment start point
 * @param p2 - Segment end point
 * @param p3 - Point after segment end
 * @param t - Parameter [0, 1] along segment
 * @param tension - Spline tension
 */
function catmullRomPoint(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  t: number,
  tension: number
): Point2D {
  const t2 = t * t;
  const t3 = t2 * t;

  // Catmull-Rom basis functions with tension parameter
  // tension of 0.5 gives the standard Catmull-Rom spline
  const s = (1 - tension) / 2;

  const b0 = -s * t3 + 2 * s * t2 - s * t;
  const b1 = (2 - s) * t3 + (s - 3) * t2 + 1;
  const b2 = (s - 2) * t3 + (3 - 2 * s) * t2 + s * t;
  const b3 = s * t3 - s * t2;

  return {
    x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
    y: b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y,
  };
}
