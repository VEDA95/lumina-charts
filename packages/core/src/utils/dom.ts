/**
 * DOM utilities
 */

/**
 * Create a canvas element with proper sizing
 */
export function createCanvas(
  container: HTMLElement,
  pixelRatio: number = window.devicePixelRatio
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';

  const rect = container.getBoundingClientRect();
  canvas.width = rect.width * pixelRatio;
  canvas.height = rect.height * pixelRatio;

  container.appendChild(canvas);
  return canvas;
}

/**
 * Resize a canvas to match its container
 */
export function resizeCanvas(
  canvas: HTMLCanvasElement,
  pixelRatio: number = window.devicePixelRatio
): { width: number; height: number; changed: boolean } {
  const rect = canvas.getBoundingClientRect();
  const width = Math.floor(rect.width * pixelRatio);
  const height = Math.floor(rect.height * pixelRatio);

  const changed = canvas.width !== width || canvas.height !== height;

  if (changed) {
    canvas.width = width;
    canvas.height = height;
  }

  return { width, height, changed };
}

/**
 * Get mouse/touch position relative to an element
 */
export function getRelativePosition(
  event: MouseEvent | Touch,
  element: HTMLElement
): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

/**
 * Check if an element is visible in the viewport
 */
export function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top < window.innerHeight &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.right > 0
  );
}

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Create a throttled function
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    } else {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(
        () => {
          lastCall = Date.now();
          fn(...args);
          timeoutId = null;
        },
        limit - (now - lastCall)
      );
    }
  };
}

/**
 * Request an animation frame with a callback
 */
export function requestFrame(callback: () => void): number {
  return requestAnimationFrame(callback);
}

/**
 * Cancel an animation frame
 */
export function cancelFrame(id: number): void {
  cancelAnimationFrame(id);
}

/**
 * Get the computed CSS variable value
 */
export function getCSSVariable(element: HTMLElement, name: string): string {
  return getComputedStyle(element).getPropertyValue(name).trim();
}

/**
 * Set a CSS variable on an element
 */
export function setCSSVariable(element: HTMLElement, name: string, value: string): void {
  element.style.setProperty(name, value);
}
