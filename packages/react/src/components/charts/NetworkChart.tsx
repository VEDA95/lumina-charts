import {
  NetworkChart as NetworkChartCore,
  type NetworkChartOptions,
} from '@lumina-charts/core';
import { createChartComponent, type ChartRef } from '../createChartComponent.js';

/**
 * React component for NetworkChart (node-link graph)
 *
 * @example
 * ```tsx
 * <NetworkChart
 *   data={networkData}
 *   options={{ layout: 'force', nodeSize: 10 }}
 *   height={500}
 * >
 *   <ZoomInteraction />
 *   <PanInteraction momentum />
 *   <HoverInteraction showTooltip />
 * </NetworkChart>
 * ```
 */
export const NetworkChart = createChartComponent<
  NetworkChartCore,
  NetworkChartOptions
>(NetworkChartCore, 'NetworkChart');

export type NetworkChartRef = ChartRef<NetworkChartCore>;
