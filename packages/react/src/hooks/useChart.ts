import type { BaseChart } from '@lumina-charts/core';
import { useChartContext } from '../context/ChartContext.js';

/**
 * Hook to access the chart instance for imperative operations
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const chart = useChart();
 *
 *   const handleReset = () => {
 *     chart?.resetZoom({ animate: true });
 *   };
 *
 *   return <button onClick={handleReset}>Reset Zoom</button>;
 * }
 * ```
 *
 * @returns The chart instance or null if not yet initialized
 */
export function useChart(): BaseChart | null {
  const { chart } = useChartContext();
  return chart;
}
