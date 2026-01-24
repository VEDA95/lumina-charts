/**
 * shadcn/ui-style theme preset
 * Modern, minimal design inspired by https://ui.shadcn.com/charts
 */

import type { RGBAColor, Theme, ThemeColors, ThemeStyleConfig } from '../types/index.js';

/**
 * shadcn-style color palette (RGBA for WebGL, values 0-1)
 */
export const SHADCN_COLORS_RGBA: RGBAColor[] = [
  [0.376, 0.647, 0.980, 1.0], // #60a5fa - primary blue
  [0.231, 0.510, 0.965, 1.0], // #3b82f6 - secondary blue
  [0.506, 0.549, 0.973, 1.0], // #818cf8 - indigo
  [0.655, 0.545, 0.980, 1.0], // #a78bfa - violet
  [0.753, 0.518, 0.957, 1.0], // #c084fc - purple
  [0.882, 0.529, 0.718, 1.0], // #e18bb7 - pink
  [0.965, 0.576, 0.576, 1.0], // #f69393 - rose
  [0.973, 0.722, 0.537, 1.0], // #f8b889 - orange
];

/**
 * shadcn-style color palette (CSS hex strings)
 */
export const SHADCN_COLORS_HEX: string[] = [
  '#60a5fa', // primary blue
  '#3b82f6', // secondary blue
  '#818cf8', // indigo
  '#a78bfa', // violet
  '#c084fc', // purple
  '#e18bb7', // pink
  '#f69393', // rose
  '#f8b889', // orange
];

/**
 * shadcn theme configuration object
 */
export const SHADCN_THEME_CONFIG = {
  /** Very faint zinc-500 grid lines */
  grid: [0.44, 0.44, 0.48, 0.1] as RGBAColor,
  /** zinc-500 for axis labels */
  axisLabel: '#71717a',
  /** Axis line color (typically hidden) */
  axisLine: '#27272a',
  /** Tooltip styling */
  tooltip: {
    background: '#18181b', // zinc-900
    border: '#27272a', // zinc-800
    text: '#fafafa', // zinc-50
  },
  /** Bar corner radius in pixels */
  barCornerRadius: 6,
  /** Whether to show axis lines */
  showAxisLines: false,
  /** Whether to show axis tick marks */
  showAxisTicks: false,
  /** Legend indicator shape */
  legendIndicator: 'square' as const,
};

/**
 * shadcn theme colors configuration
 */
export const SHADCN_THEME_COLORS: ThemeColors = {
  series: SHADCN_COLORS_HEX,
  background: '#ffffff',
  foreground: '#09090b', // zinc-950
  grid: 'rgba(113, 113, 122, 0.1)', // zinc-500 at 10%
  axis: '#27272a', // zinc-800
  axisLabel: '#71717a', // zinc-500
  tooltip: {
    background: '#18181b', // zinc-900
    text: '#fafafa', // zinc-50
    border: '#27272a', // zinc-800
  },
  selection: {
    fill: 'rgba(59, 130, 246, 0.2)', // blue-500 at 20%
    stroke: '#3b82f6', // blue-500
  },
  crosshair: '#71717a', // zinc-500
};

/**
 * shadcn theme style configuration
 */
export const SHADCN_THEME_STYLES: Partial<ThemeStyleConfig> = {
  lineWidth: 2,
  pointSize: 4,
  pointShape: 'circle',
  gridLineWidth: 1,
  gridDash: [],
  axisLineWidth: 0, // Hidden axis lines
  fontSize: {
    axis: 12,
    label: 12,
    title: 14,
    legend: 12,
  },
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  animation: {
    duration: 200,
    easing: 'ease-out',
  },
};

/**
 * Complete shadcn theme definition
 */
export const SHADCN_THEME: Theme = {
  name: 'shadcn',
  colors: SHADCN_THEME_COLORS,
  styles: SHADCN_THEME_STYLES,
};

/**
 * shadcn dark mode theme colors configuration
 */
export const SHADCN_DARK_THEME_COLORS: ThemeColors = {
  series: SHADCN_COLORS_HEX,
  background: '#09090b', // zinc-950
  foreground: '#fafafa', // zinc-50
  grid: 'rgba(161, 161, 170, 0.1)', // zinc-400 at 10%
  axis: '#3f3f46', // zinc-700
  axisLabel: '#a1a1aa', // zinc-400
  tooltip: {
    background: '#27272a', // zinc-800
    text: '#fafafa', // zinc-50
    border: '#3f3f46', // zinc-700
  },
  selection: {
    fill: 'rgba(59, 130, 246, 0.3)', // blue-500 at 30%
    stroke: '#60a5fa', // blue-400
  },
  crosshair: '#a1a1aa', // zinc-400
};

/**
 * shadcn dark mode theme config
 */
export const SHADCN_DARK_THEME_CONFIG = {
  /** Very faint zinc-400 grid lines */
  grid: [0.63, 0.63, 0.67, 0.1] as RGBAColor,
  /** zinc-400 for axis labels */
  axisLabel: '#a1a1aa',
  /** Axis line color */
  axisLine: '#3f3f46',
  /** Tooltip styling */
  tooltip: {
    background: '#27272a', // zinc-800
    border: '#3f3f46', // zinc-700
    text: '#fafafa', // zinc-50
  },
  /** Bar corner radius in pixels */
  barCornerRadius: 6,
  /** Whether to show axis lines */
  showAxisLines: false,
  /** Whether to show axis tick marks */
  showAxisTicks: false,
  /** Legend indicator shape */
  legendIndicator: 'square' as const,
};

/**
 * Complete shadcn dark theme definition
 */
export const SHADCN_DARK_THEME: Theme = {
  name: 'shadcn-dark',
  colors: SHADCN_DARK_THEME_COLORS,
  styles: SHADCN_THEME_STYLES,
};

/**
 * Helper to get shadcn grid color as RGBAColor
 */
export function getShadcnGridColor(isDark = false): RGBAColor {
  return isDark ? SHADCN_DARK_THEME_CONFIG.grid : SHADCN_THEME_CONFIG.grid;
}

/**
 * Helper to apply shadcn tooltip styles to an element
 */
export function applyShadcnTooltipStyles(element: HTMLElement): void {
  const { tooltip } = SHADCN_THEME_CONFIG;
  element.style.cssText = `
    position: absolute;
    display: none;
    pointer-events: none;
    z-index: 100;
    background: ${tooltip.background};
    color: ${tooltip.text};
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid ${tooltip.border};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    font-family: Inter, system-ui, -apple-system, sans-serif;
    font-size: 13px;
    white-space: nowrap;
    transform: translate(-50%, -100%);
    margin-top: -12px;
  `;
}

/**
 * Format tooltip content in shadcn style (with color squares and right-aligned values)
 */
export function formatShadcnTooltipContent(
  title: string | undefined,
  items: Array<{ label: string; value: string | number; color?: string }>
): string {
  const titleHtml = title
    ? `<div style="font-weight: 500; margin-bottom: 8px; color: #a1a1aa;">${title}</div>`
    : '';

  const itemsHtml = items
    .map(
      (item) => `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 24px; margin: 4px 0;">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${item.color ? `<span style="width: 10px; height: 10px; border-radius: 2px; background: ${item.color}; flex-shrink: 0;"></span>` : ''}
          <span style="color: #a1a1aa;">${item.label}</span>
        </div>
        <span style="font-weight: 600; color: #fafafa;">${item.value}</span>
      </div>
    `
    )
    .join('');

  return titleHtml + itemsHtml;
}
