import { useEffect, useRef } from 'react';
import { ZoomHandler } from '@lumina-charts/core';
import { useChartContext } from '../../context/ChartContext.js';
import type { ZoomInteractionProps } from '../../types/interactions.js';

/**
 * Adds zoom interaction (wheel/pinch) to a chart
 *
 * @example
 * ```tsx
 * <ScatterChart data={data}>
 *   <ZoomInteraction minZoom={0.5} maxZoom={10} />
 * </ScatterChart>
 * ```
 */
export function ZoomInteraction({
  enabled = true,
  wheel = true,
  pinch = true,
  speed = 1.0,
  direction = 'both',
  minZoom = 1,
  maxZoom = 100,
  zoomPadding = 0.1,
}: ZoomInteractionProps): null {
  const { chart } = useChartContext();
  const handlerRef = useRef<ZoomHandler | null>(null);

  useEffect(() => {
    if (!chart) return;

    const handler = new ZoomHandler({
      enabled,
      wheel,
      pinch,
      speed,
      direction,
      minZoom,
      maxZoom,
      zoomPadding,
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
    // Note: Other config updates would require the handler to support updateConfig
  }, [enabled, wheel, pinch, speed, direction, minZoom, maxZoom, zoomPadding]);

  return null;
}
