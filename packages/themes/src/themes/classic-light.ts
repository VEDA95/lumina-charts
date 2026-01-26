/**
 * Classic Light Theme
 * Professional light theme with clean, muted colors
 */

import type { Theme, ThemeColors, ThemeStyles } from '../types.js';
import { hexToRGBA, hexArrayToRGBA, type RGBAColor } from '../utils.js';

/**
 * Classic light series colors (hex)
 */
export const CLASSIC_LIGHT_COLORS_HEX: string[] = [
  '#2563eb', // blue
  '#16a34a', // green
  '#dc2626', // red
  '#ca8a04', // amber
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#c2410c', // orange
  '#4b5563', // gray
];

/**
 * Classic light series colors (RGBA for WebGL)
 */
export const CLASSIC_LIGHT_COLORS_RGBA: RGBAColor[] = hexArrayToRGBA(CLASSIC_LIGHT_COLORS_HEX);

/**
 * Classic light theme colors
 */
export const CLASSIC_LIGHT_THEME_COLORS: ThemeColors = {
  series: CLASSIC_LIGHT_COLORS_HEX,
  seriesRGBA: CLASSIC_LIGHT_COLORS_RGBA,
  background: '#ffffff',
  backgroundRGBA: hexToRGBA('#ffffff'),
  foreground: '#1f2937',
  grid: '#e5e7eb',
  gridRGBA: hexToRGBA('#e5e7eb'),
  axis: '#6b7280',
  axisLabel: '#374151',
  tooltip: {
    background: '#ffffff',
    text: '#1f2937',
    border: '#e5e7eb',
  },
  selection: {
    fill: 'rgba(37, 99, 235, 0.1)',
    stroke: '#2563eb',
  },
  crosshair: '#9ca3af',
};

/**
 * Classic light theme styles
 */
export const CLASSIC_LIGHT_THEME_STYLES: ThemeStyles = {
  lineWidth: 2,
  pointSize: 5,
  gridLineWidth: 1,
  showAxisLines: true,
  showAxisTicks: true,
  barCornerRadius: 0,
};

/**
 * Complete classic light theme
 */
export const CLASSIC_LIGHT_THEME: Theme = {
  name: 'classic-light',
  colors: CLASSIC_LIGHT_THEME_COLORS,
  styles: CLASSIC_LIGHT_THEME_STYLES,
};
