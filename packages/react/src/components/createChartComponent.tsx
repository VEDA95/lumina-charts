import {
  useRef,
  useEffect,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
  type CSSProperties,
} from 'react';
import type {
  BaseChart,
  ChartOptions,
  Series,
  BaseChartConfig,
  HoverEvent,
  PointEvent,
  ZoomEvent,
  PanEvent,
  SelectionEvent,
  DataUpdateEvent,
  ResizeEvent,
} from '@lumina-charts/core';
import { ChartEvent } from '@lumina-charts/core';
import { ChartContext } from '../context/ChartContext.js';
import type { BaseChartProps } from '../types/props.js';

/**
 * Chart class constructor type
 */
type ChartConstructor<TChart extends BaseChart, TOptions extends ChartOptions> =
  new (config: BaseChartConfig & { options?: TOptions }) => TChart;

/**
 * Ref handle exposed by chart components
 */
export interface ChartRef<TChart extends BaseChart = BaseChart> {
  /** Get the underlying chart instance */
  getChart(): TChart | null;
  /** Reset zoom to initial state */
  resetZoom(options?: { animate?: boolean }): void;
  /** Export chart as image */
  exportImage(options?: {
    format?: 'png' | 'jpeg';
    quality?: number;
    backgroundColor?: string;
  }): Promise<string>;
}

/**
 * Helper to wrap user event handler to extract detail from ChartEvent
 */
function wrapHandler<T>(
  handler: ((data: T) => void) | undefined
): ((event: ChartEvent<T>) => void) | undefined {
  if (!handler) return undefined;
  return (event: ChartEvent<T>) => handler(event.detail);
}

/**
 * Factory function to create chart components with shared lifecycle logic
 *
 * @param ChartClass - The chart class constructor
 * @param displayName - Display name for the component
 * @returns A React component for the chart
 */
export function createChartComponent<
  TChart extends BaseChart,
  TOptions extends ChartOptions,
>(
  ChartClass: ChartConstructor<TChart, TOptions>,
  displayName: string
): React.ForwardRefExoticComponent<
  BaseChartProps<TOptions> & React.RefAttributes<ChartRef<TChart>>
> {
  const ChartComponent = forwardRef<ChartRef<TChart>, BaseChartProps<TOptions>>(
    (
      {
        data,
        options,
        width = '100%',
        height = 400,
        className,
        style,
        animate,
        animationDuration,
        children,
        onHover,
        onHoverEnd,
        onClick,
        onZoom,
        onPan,
        onSelectionChange,
        onDataUpdate,
        onResize,
        onReady,
        onDestroy,
      },
      ref
    ) => {
      const containerRef = useRef<HTMLDivElement>(null);
      const chartRef = useRef<TChart | null>(null);
      const [chartInstance, setChartInstance] = useState<TChart | null>(null);

      // Merge animation options into chart options
      const mergedOptions = useMemo(() => {
        const opts: TOptions = { ...options } as TOptions;
        if (animate !== undefined) {
          opts.animate = animate;
        }
        if (animationDuration !== undefined) {
          opts.animationDuration = animationDuration;
        }
        return opts;
      }, [options, animate, animationDuration]);

      // Expose imperative methods via ref
      useImperativeHandle(
        ref,
        () => ({
          getChart: () => chartRef.current,
          resetZoom: (opts) => {
            chartRef.current?.resetZoom(opts);
          },
          exportImage: async (opts) => {
            if (!chartRef.current) {
              throw new Error('Chart not initialized');
            }
            return chartRef.current.exportImage(opts);
          },
        }),
        []
      );

      // Initialize chart
      useEffect(() => {
        if (!containerRef.current) return;

        const chart = new ChartClass({
          container: containerRef.current,
          options: mergedOptions,
        });

        chartRef.current = chart;
        setChartInstance(chart);

        // Fire ready event
        onReady?.();

        return () => {
          onDestroy?.();
          chart.dispose();
          chartRef.current = null;
          setChartInstance(null);
        };
        // Only re-initialize on mount/unmount
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      // Update options when they change (without reinitializing)
      useEffect(() => {
        if (!chartRef.current) return;
        // Charts expose updateOptions for partial updates
        if ('updateOptions' in chartRef.current) {
          (
            chartRef.current as unknown as {
              updateOptions: (opts: TOptions) => void;
            }
          ).updateOptions(mergedOptions);
        }
      }, [mergedOptions]);

      // Update data
      useEffect(() => {
        if (!chartRef.current || !data) return;

        const animateUpdate = animate ?? mergedOptions?.animate ?? false;
        chartRef.current.setData(data as Series[], {
          animate: animateUpdate,
          animationConfig: animationDuration
            ? { duration: animationDuration }
            : undefined,
        });
      }, [data, animate, animationDuration, mergedOptions?.animate]);

      // Subscribe to events
      useEffect(() => {
        if (!chartRef.current) return;
        const unsubscribes: (() => void)[] = [];

        const wrappedHover = wrapHandler<HoverEvent>(onHover);
        if (wrappedHover) {
          unsubscribes.push(chartRef.current.on('hover', wrappedHover));
        }

        if (onHoverEnd) {
          unsubscribes.push(
            chartRef.current.on('hoverEnd', () => onHoverEnd())
          );
        }

        // Click events use PointerEvent internally but expose PointEvent to users
        const wrappedClick = wrapHandler<PointEvent>(onClick);
        if (wrappedClick) {
          unsubscribes.push(
            chartRef.current.on(
              'click',
              wrappedClick as unknown as (event: ChartEvent<PointerEvent>) => void
            )
          );
        }

        const wrappedZoom = wrapHandler<ZoomEvent>(onZoom);
        if (wrappedZoom) {
          unsubscribes.push(
            chartRef.current.on('zoom', wrappedZoom as (event: ChartEvent<{
              domain: { x: [number, number]; y: [number, number] };
              factor: number;
              center?: { x: number; y: number };
              direction?: string;
              timestamp?: number;
              originalEvent?: Event;
            }>) => void)
          );
        }

        const wrappedPan = wrapHandler<PanEvent>(onPan);
        if (wrappedPan) {
          unsubscribes.push(
            chartRef.current.on('pan', wrappedPan as (event: ChartEvent<{
              domain: { x: [number, number]; y: [number, number] };
              delta: { x: number; y: number };
              timestamp?: number;
              originalEvent?: Event;
            }>) => void)
          );
        }

        const wrappedSelection = wrapHandler<SelectionEvent>(onSelectionChange);
        if (wrappedSelection) {
          unsubscribes.push(
            chartRef.current.on('selectionChange', wrappedSelection as (event: ChartEvent<{
              selected: Set<string>;
              added: string[];
              removed: string[];
              bounds?: { x: [number, number]; y: [number, number] };
              timestamp?: number;
            }>) => void)
          );
        }

        const wrappedDataUpdate = wrapHandler<DataUpdateEvent>(onDataUpdate);
        if (wrappedDataUpdate) {
          unsubscribes.push(chartRef.current.on('dataUpdate', wrappedDataUpdate));
        }

        const wrappedResize = wrapHandler<ResizeEvent>(onResize);
        if (wrappedResize) {
          unsubscribes.push(chartRef.current.on('resize', wrappedResize));
        }

        return () => {
          unsubscribes.forEach((unsub) => unsub());
        };
      }, [
        onHover,
        onHoverEnd,
        onClick,
        onZoom,
        onPan,
        onSelectionChange,
        onDataUpdate,
        onResize,
      ]);

      // Container styles
      const containerStyle: CSSProperties = useMemo(
        () => ({
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          position: 'relative' as const,
          ...style,
        }),
        [width, height, style]
      );

      // Context value
      const contextValue = useMemo(
        () => ({ chart: chartInstance as BaseChart | null }),
        [chartInstance]
      );

      return (
        <ChartContext.Provider value={contextValue}>
          <div ref={containerRef} className={className} style={containerStyle}>
            {children}
          </div>
        </ChartContext.Provider>
      );
    }
  );

  ChartComponent.displayName = displayName;

  return ChartComponent;
}
