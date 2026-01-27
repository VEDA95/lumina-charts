/**
 * Color conversion utilities
 */

import type { RGBAColor } from '../types/index.js';

/**
 * Parse a hex color string to RGBA color tuple
 * Supports #RGB, #RRGGBB, #RGBA, #RRGGBBAA formats
 */
export function hexToRGBA(hex: string, alpha: number = 1): RGBAColor {
  // Remove # if present
  const cleaned = hex.startsWith('#') ? hex.slice(1) : hex;

  let r: number,
    g: number,
    b: number,
    a: number = alpha;

  if (cleaned.length === 3) {
    // #RGB format
    r = parseInt(cleaned[0] + cleaned[0], 16) / 255;
    g = parseInt(cleaned[1] + cleaned[1], 16) / 255;
    b = parseInt(cleaned[2] + cleaned[2], 16) / 255;
  } else if (cleaned.length === 4) {
    // #RGBA format
    r = parseInt(cleaned[0] + cleaned[0], 16) / 255;
    g = parseInt(cleaned[1] + cleaned[1], 16) / 255;
    b = parseInt(cleaned[2] + cleaned[2], 16) / 255;
    a = parseInt(cleaned[3] + cleaned[3], 16) / 255;
  } else if (cleaned.length === 6) {
    // #RRGGBB format
    r = parseInt(cleaned.slice(0, 2), 16) / 255;
    g = parseInt(cleaned.slice(2, 4), 16) / 255;
    b = parseInt(cleaned.slice(4, 6), 16) / 255;
  } else if (cleaned.length === 8) {
    // #RRGGBBAA format
    r = parseInt(cleaned.slice(0, 2), 16) / 255;
    g = parseInt(cleaned.slice(2, 4), 16) / 255;
    b = parseInt(cleaned.slice(4, 6), 16) / 255;
    a = parseInt(cleaned.slice(6, 8), 16) / 255;
  } else {
    // Invalid format, return black
    return [0, 0, 0, 1];
  }

  return [r, g, b, a];
}

/**
 * Parse a color value to RGBA
 * Accepts hex strings or existing RGBA tuples
 */
export function parseColor(color: string | RGBAColor, alpha: number = 1): RGBAColor {
  if (Array.isArray(color)) {
    return color as RGBAColor;
  }
  return hexToRGBA(color as string, alpha);
}
