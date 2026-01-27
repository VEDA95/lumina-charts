import { useEffect } from 'react';
import type {
  HoverEvent,
  PointEvent,
  ZoomEvent,
  PanEvent,
  SelectionEvent,
  DataUpdateEvent,
  ResizeEvent,
} from '@lumina-charts/core';
import { ChartEvent } from '@lumina-charts/core';
import { useChartContext } from '../context/ChartContext.js';

/**
 * Map of event names to their payload types (unwrapped from ChartEvent)
 */
interface EventDataMap {
  click: PointEvent;
  hover: HoverEvent;
  hoverEnd: undefined;
  selectionChange: SelectionEvent;
  zoom: ZoomEvent;
  pan: PanEvent;
  dataUpdate: DataUpdateEvent;
  resize: ResizeEvent;
  render: undefined;
  ready: undefined;
  destroy: undefined;
}

/**
 * Hook to subscribe to chart events
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useChartEvent('zoom', (event) => {
 *     console.log('Zoomed to:', event.domain);
 *   });
 *
 *   useChartEvent('hover', (event) => {
 *     if (event.point) {
 *       console.log('Hovering:', event.point);
 *     }
 *   });
 *
 *   return null;
 * }
 * ```
 *
 * @param eventName - The event to subscribe to
 * @param handler - The event handler function
 */
export function useChartEvent<K extends keyof EventDataMap>(
  eventName: K,
  handler: EventDataMap[K] extends undefined
    ? () => void
    : (event: EventDataMap[K]) => void
): void {
  const { chart } = useChartContext();

  useEffect(() => {
    if (!chart || !handler) return;

    // Wrap handler to extract detail from ChartEvent
    const wrappedHandler = (event: ChartEvent<EventDataMap[K]>) => {
      if (event.detail === undefined) {
        (handler as () => void)();
      } else {
        (handler as (data: EventDataMap[K]) => void)(event.detail);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsubscribe = chart.on(eventName, wrappedHandler as any);
    return unsubscribe;
  }, [chart, eventName, handler]);
}
