import { createContext, useContext } from 'react';
import type { BaseChart } from '@lumina-charts/core';

/**
 * Context value type for chart instance sharing
 */
export interface ChartContextValue {
  /** The chart instance (null during initialization) */
  chart: BaseChart | null;
}

/**
 * React context for sharing chart instance with children
 */
export const ChartContext = createContext<ChartContextValue | null>(null);

/**
 * Hook to access the chart context
 * @throws Error if used outside of a chart component
 */
export function useChartContext(): ChartContextValue {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error(
      'useChartContext must be used within a Lumina Chart component'
    );
  }
  return context;
}
