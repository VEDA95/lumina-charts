import {
  PieChart as PieChartCore,
  type PieChartOptions,
} from '@lumina-charts/core';
import { createChartComponent, type ChartRef } from '../createChartComponent.js';

/**
 * React component for PieChart
 *
 * @example
 * ```tsx
 * <PieChart
 *   data={[{ id: 'slices', name: 'Market Share', data: [
 *     { x: 0, y: 30, label: 'Product A' },
 *     { x: 1, y: 45, label: 'Product B' },
 *     { x: 2, y: 25, label: 'Product C' }
 *   ]}]}
 *   options={{ innerRadius: 0.5, showLabels: true }}
 *   height={400}
 * >
 *   <HoverInteraction showTooltip />
 * </PieChart>
 * ```
 */
export const PieChart = createChartComponent<PieChartCore, PieChartOptions>(
  PieChartCore,
  'PieChart'
);

export type PieChartRef = ChartRef<PieChartCore>;
