/**
 * Vibrant Theme
 * Bold, colorful theme with saturated colors
 */

import type { Theme, ThemeColors, ThemeStyles } from '../types.js';
import { hexToRGBA, hexArrayToRGBA, type RGBAColor } from '../utils.js';

/**
 * Vibrant series colors (hex)
 */
export const VIBRANT_COLORS_HEX: string[] = [
  '#f43f5e', // rose
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#22c55e', // green
  '#f97316', // orange
  '#ec4899', // pink
  '#eab308', // yellow
  '#6366f1', // indigo
];

/**
 * Vibrant series colors (RGBA for WebGL)
 */
export const VIBRANT_COLORS_RGBA: RGBAColor[] = hexArrayToRGBA(VIBRANT_COLORS_HEX);

/**
 * Vibrant theme colors
 */
export const VIBRANT_THEME_COLORS: ThemeColors = {
  series: VIBRANT_COLORS_HEX,
  seriesRGBA: VIBRANT_COLORS_RGBA,
  background: '#fafafa',
  backgroundRGBA: hexToRGBA('#fafafa'),
  foreground: '#18181b',
  grid: '#e4e4e7',
  gridRGBA: hexToRGBA('#e4e4e7'),
  axis: '#71717a',
  axisLabel: '#3f3f46',
  tooltip: {
    background: '#18181b',
    text: '#fafafa',
    border: '#3f3f46',
  },
  selection: {
    fill: 'rgba(244, 63, 94, 0.15)',
    stroke: '#f43f5e',
  },
  crosshair: '#a1a1aa',
};

/**
 * Vibrant theme styles
 */
export const VIBRANT_THEME_STYLES: ThemeStyles = {
  lineWidth: 2.5,
  pointSize: 6,
  gridLineWidth: 1,
  showAxisLines: false,
  showAxisTicks: false,
  barCornerRadius: 4,
};

/**
 * Complete vibrant theme
 */
export const VIBRANT_THEME: Theme = {
  name: 'vibrant',
  colors: VIBRANT_THEME_COLORS,
  styles: VIBRANT_THEME_STYLES,
};
