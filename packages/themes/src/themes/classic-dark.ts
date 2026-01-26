/**
 * Classic Dark Theme
 * Professional dark theme with clean, balanced colors
 */

import type { Theme, ThemeColors, ThemeStyles } from '../types.js';
import { hexToRGBA, hexArrayToRGBA, type RGBAColor } from '../utils.js';

/**
 * Classic dark series colors (hex)
 * Slightly lighter/more vibrant than light theme for visibility on dark backgrounds
 */
export const CLASSIC_DARK_COLORS_HEX: string[] = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#ef4444', // red
  '#eab308', // yellow
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#9ca3af', // gray
];

/**
 * Classic dark series colors (RGBA for WebGL)
 */
export const CLASSIC_DARK_COLORS_RGBA: RGBAColor[] = hexArrayToRGBA(CLASSIC_DARK_COLORS_HEX);

/**
 * Classic dark theme colors
 */
export const CLASSIC_DARK_THEME_COLORS: ThemeColors = {
  series: CLASSIC_DARK_COLORS_HEX,
  seriesRGBA: CLASSIC_DARK_COLORS_RGBA,
  background: '#0f172a',
  backgroundRGBA: hexToRGBA('#0f172a'),
  foreground: '#f1f5f9',
  grid: '#334155',
  gridRGBA: hexToRGBA('#334155'),
  axis: '#94a3b8',
  axisLabel: '#cbd5e1',
  tooltip: {
    background: '#1e293b',
    text: '#f1f5f9',
    border: '#334155',
  },
  selection: {
    fill: 'rgba(59, 130, 246, 0.2)',
    stroke: '#3b82f6',
  },
  crosshair: '#64748b',
};

/**
 * Classic dark theme styles
 */
export const CLASSIC_DARK_THEME_STYLES: ThemeStyles = {
  lineWidth: 2,
  pointSize: 5,
  gridLineWidth: 1,
  showAxisLines: true,
  showAxisTicks: true,
  barCornerRadius: 0,
};

/**
 * Complete classic dark theme
 */
export const CLASSIC_DARK_THEME: Theme = {
  name: 'classic-dark',
  colors: CLASSIC_DARK_THEME_COLORS,
  styles: CLASSIC_DARK_THEME_STYLES,
};
