/**
 * Color utility functions
 */

/**
 * Normalized RGBA color for WebGL (values 0-1)
 */
export type RGBAColor = readonly [number, number, number, number];

/**
 * Convert a hex color string to RGBA
 * @param hex - Hex color string (e.g., '#ff0000' or 'ff0000')
 * @param alpha - Optional alpha value (0-1), defaults to 1
 * @returns RGBA color array with values 0-1
 */
export function hexToRGBA(hex: string, alpha: number = 1): RGBAColor {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Parse hex values
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  return [r, g, b, alpha] as const;
}

/**
 * Convert an RGBA color to hex string
 * @param rgba - RGBA color array with values 0-1
 * @returns Hex color string with # prefix
 */
export function rgbaToHex(rgba: RGBAColor): string {
  const r = Math.round(rgba[0] * 255)
    .toString(16)
    .padStart(2, '0');
  const g = Math.round(rgba[1] * 255)
    .toString(16)
    .padStart(2, '0');
  const b = Math.round(rgba[2] * 255)
    .toString(16)
    .padStart(2, '0');

  return `#${r}${g}${b}`;
}

/**
 * Convert hex colors array to RGBA colors array
 */
export function hexArrayToRGBA(hexColors: string[], alpha: number = 1): RGBAColor[] {
  return hexColors.map((hex) => hexToRGBA(hex, alpha));
}
