import { useEffect, useRef } from 'react';
import { SelectionHandler } from '@lumina-charts/core';
import { useChartContext } from '../../context/ChartContext.js';
import type { SelectionInteractionProps } from '../../types/interactions.js';

/**
 * Adds selection interaction (point selection) to a chart
 *
 * @example
 * ```tsx
 * <ScatterChart data={data} onSelectionChange={handleSelection}>
 *   <SelectionInteraction mode="multi" multiSelectKey="shift" />
 * </ScatterChart>
 * ```
 */
export function SelectionInteraction({
  enabled = true,
  mode = 'single',
  multiSelectKey = 'shift',
  clickRadius = 20,
}: SelectionInteractionProps): null {
  const { chart } = useChartContext();
  const handlerRef = useRef<SelectionHandler | null>(null);

  useEffect(() => {
    if (!chart) return;

    const handler = new SelectionHandler({
      enabled,
      mode,
      multiSelectKey,
      clickRadius,
    });

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
      mode,
      multiSelectKey,
      clickRadius,
    });
  }, [enabled, mode, multiSelectKey, clickRadius]);

  return null;
}
