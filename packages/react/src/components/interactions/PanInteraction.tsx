import { useEffect, useRef } from 'react';
import { PanHandler } from '@lumina-charts/core';
import { useChartContext } from '../../context/ChartContext.js';
import type { PanInteractionProps } from '../../types/interactions.js';

/**
 * Adds pan interaction (click-drag) to a chart
 *
 * @example
 * ```tsx
 * <ScatterChart data={data}>
 *   <PanInteraction momentum friction={0.92} />
 * </ScatterChart>
 * ```
 */
export function PanInteraction({
  enabled = true,
  button = 0,
  modifierKey,
  momentum = false,
  friction = 0.92,
  disableAtDefaultZoom = true,
  panPadding = 0.1,
}: PanInteractionProps): null {
  const { chart } = useChartContext();
  const handlerRef = useRef<PanHandler | null>(null);

  useEffect(() => {
    if (!chart) return;

    const handler = new PanHandler({
      enabled,
      button,
      modifierKey,
      momentum,
      friction,
      disableAtDefaultZoom,
      panPadding,
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
  }, [
    enabled,
    button,
    modifierKey,
    momentum,
    friction,
    disableAtDefaultZoom,
    panPadding,
  ]);

  return null;
}
