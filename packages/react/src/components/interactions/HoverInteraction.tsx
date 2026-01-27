import { useEffect, useRef } from 'react';
import { HoverHandler } from '@lumina-charts/core';
import { useChartContext } from '../../context/ChartContext.js';
import type { HoverInteractionProps } from '../../types/interactions.js';

/**
 * Adds hover interaction (tooltips) to a chart
 *
 * @example
 * ```tsx
 * <ScatterChart data={data}>
 *   <HoverInteraction showTooltip tooltipStyle="shadcn" />
 * </ScatterChart>
 * ```
 */
export function HoverInteraction({
  enabled = true,
  maxDistance = 20,
  debounceMs = 0,
  showTooltip = true,
  tooltipFormatter,
  tooltipStyle = 'shadcn',
}: HoverInteractionProps): null {
  const { chart } = useChartContext();
  const handlerRef = useRef<HoverHandler | null>(null);

  useEffect(() => {
    if (!chart) return;

    const handler = new HoverHandler({
      maxDistance,
      debounceMs,
      showTooltip,
      tooltipFormatter,
      tooltipStyle,
    });
    handler.enabled = enabled;

    handlerRef.current = handler;
    chart.addInteraction(handler);

    return () => {
      chart.removeInteraction(handler.id);
      handlerRef.current = null;
    };
  }, [chart]);

  // Update config when props change
  useEffect(() => {
    if (!handlerRef.current) return;

    handlerRef.current.enabled = enabled;
    handlerRef.current.updateConfig({
      maxDistance,
      debounceMs,
      showTooltip,
      tooltipFormatter,
      tooltipStyle,
    });
  }, [
    enabled,
    maxDistance,
    debounceMs,
    showTooltip,
    tooltipFormatter,
    tooltipStyle,
  ]);

  return null;
}
