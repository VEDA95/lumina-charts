/**
 * High Contrast Theme
 * Accessibility-focused theme with maximum contrast ratios (7:1+)
 */

import type { Theme, ThemeColors, ThemeStyles } from '../types.js';
import { hexToRGBA, hexArrayToRGBA, type RGBAColor } from '../utils.js';

/**
 * High contrast series colors (hex)
 * Selected for maximum visibility and distinguishability
 */
export const HIGH_CONTRAST_COLORS_HEX: string[] = [
  '#0000ff', // pure blue
  '#ff0000', // pure red
  '#008000', // green
  '#800080', // purple
  '#ff8c00', // dark orange
  '#008b8b', // dark cyan
  '#8b0000', // dark red
  '#000000', // black
];

/**
 * High contrast series colors (RGBA for WebGL)
 */
export const HIGH_CONTRAST_COLORS_RGBA: RGBAColor[] = hexArrayToRGBA(HIGH_CONTRAST_COLORS_HEX);

/**
 * High contrast theme colors
 */
export const HIGH_CONTRAST_THEME_COLORS: ThemeColors = {
  series: HIGH_CONTRAST_COLORS_HEX,
  seriesRGBA: HIGH_CONTRAST_COLORS_RGBA,
  background: '#ffffff',
  backgroundRGBA: hexToRGBA('#ffffff'),
  foreground: '#000000',
  grid: '#000000',
  gridRGBA: hexToRGBA('#000000', 0.2),
  axis: '#000000',
  axisLabel: '#000000',
  tooltip: {
    background: '#000000',
    text: '#ffffff',
    border: '#000000',
  },
  selection: {
    fill: 'rgba(0, 0, 255, 0.2)',
    stroke: '#0000ff',
  },
  crosshair: '#000000',
};

/**
 * High contrast theme styles
 * Bolder line widths for better visibility
 */
export const HIGH_CONTRAST_THEME_STYLES: ThemeStyles = {
  lineWidth: 3,
  pointSize: 8,
  gridLineWidth: 1,
  showAxisLines: true,
  showAxisTicks: true,
  barCornerRadius: 0,
};

/**
 * Complete high contrast theme
 */
export const HIGH_CONTRAST_THEME: Theme = {
  name: 'high-contrast',
  colors: HIGH_CONTRAST_THEME_COLORS,
  styles: HIGH_CONTRAST_THEME_STYLES,
};
