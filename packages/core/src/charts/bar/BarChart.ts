/**
 * Bar chart implementation
 */

import type {
  RenderPass,
  ChartOptions,
  AxisConfig,
  GridConfig,
  Series,
  RGBAColor,
  DataDomain,
} from '../../types/index.js';
import { BaseChart, type BaseChartConfig } from '../BaseChart.js';
import { BarRenderPass, type BarData } from './BarRenderPass.js';
import { GridRenderPass } from '../GridRenderPass.js';
import { AxisRenderer } from '../../axes/AxisRenderer.js';
import { parseColor } from '../../utils/color.js';

/**
 * Bar chart specific options
 */
export interface BarChartOptions extends ChartOptions {
  /** X-axis configuration */
  xAxis?: AxisConfig;
  /** Y-axis configuration */
  yAxis?: AxisConfig;
  /** Grid configuration */
  grid?: boolean | GridConfig;
  /** Grid line color */
  gridColor?: RGBAColor;
  /** Gap between bars within a group (pixels) */
  barGap?: number;
  /** Gap between category groups (pixels) */
  groupGap?: number;
  /** Default bar color */
  barColor?: RGBAColor;
  /** Corner radius for rounded bars (pixels, default: 0 for square corners) */
  cornerRadius?: number;
}

/**
 * Bar chart configuration
 */
export interface BarChartConfig extends BaseChartConfig {
  options?: BarChartOptions;
}

/**
 * Default series colors for bars
 */
const DEFAULT_COLORS: RGBAColor[] = [
  [0.4, 0.6, 0.9, 1.0], // Blue
  [0.9, 0.5, 0.4, 1.0], // Red
  [0.4, 0.8, 0.5, 1.0], // Green
  [0.9, 0.7, 0.3, 1.0], // Orange
  [0.7, 0.5, 0.8, 1.0], // Purple
  [0.3, 0.7, 0.7, 1.0], // Teal
  [0.9, 0.6, 0.7, 1.0], // Pink
  [0.6, 0.6, 0.6, 1.0], // Gray
];

/**
 * Bar chart for visualizing categorical data
 */
export class BarChart extends BaseChart {
  private barOptions: BarChartOptions = {};
  private axisRenderer: AxisRenderer | null = null;
  private gridRenderPass: GridRenderPass | null = null;
  private barRenderPass!: BarRenderPass;

  // Category data
  private categories: string[] = [];

  // Bar bounds for hit testing (stored from last render)
  private barBounds: BarData[] = [];

  // Hover state
  private hoveredBar: BarData | null = null;

  constructor(config: BarChartConfig) {
    super(config);

    // Store bar-specific options (this.options from BaseChart already has them)
    this.barOptions = (config.options ?? {}) as BarChartOptions;

    // Initialize axis renderer
    this.axisRenderer = new AxisRenderer({
      container: this.getOverlayElement(),
      margins: this.getMargins(),
      xAxis: this.createXAxisConfig(),
      yAxis: this.barOptions.yAxis,
    });

    // Get render passes
    this.gridRenderPass = this.renderer.getRenderPass('grid') as GridRenderPass | null;
    this.barRenderPass = this.renderer.getRenderPass('bar') as BarRenderPass;

    // Initialize axis renderer
    this.initializeAxisRenderer();

    // Setup hover interaction
    this.setupHoverInteraction();
  }

  /**
   * Setup hover interaction for tooltips
   */
  private setupHoverInteraction(): void {
    this.addInteraction({
      id: 'bar-hover',
      enabled: true,
      attach: () => {},
      detach: () => {},
      onPointerMove: (event) => {
        const bar = this.barRenderPass.hitTest(event.x, event.y);

        if (bar !== this.hoveredBar) {
          // New bar hovered (or no bar)
          this.hoveredBar = bar;

          if (bar) {
            this.showTooltip(bar, event.originalEvent);
          } else {
            this.hideTooltip();
          }
        } else if (bar) {
          // Same bar, just update tooltip position
          this.showTooltip(bar, event.originalEvent);
        }
      },
    });
  }

  /**
   * Show tooltip for a bar
   */
  private showTooltip(bar: BarData, event: PointerEvent | WheelEvent | TouchEvent): void {
    const tooltip = this.getTooltipElement();

    // Find the series for color and name
    const series = this.series.find((s) => s.id === bar.seriesId);
    const seriesName = series?.name ?? bar.seriesId;

    // Get the category label
    const categoryLabel = this.categories[bar.categoryIndex] ?? `Category ${bar.categoryIndex}`;

    // Find the actual y value from series data
    const point = series?.data.find((p) => Math.floor(p.x) === bar.categoryIndex);
    const value = point?.y ?? 0;

    // Get the bar color as CSS string
    const [r, g, b, a] = bar.color;
    const colorStr = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;

    tooltip.innerHTML = `
      <div style="font-weight: 500; margin-bottom: 8px;">${categoryLabel}</div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 3px; height: 16px; border-radius: 1px; background: ${colorStr}; flex-shrink: 0;"></span>
        <span style="opacity: 0.7; font-size: 12px; min-width: 60px;">${seriesName}</span>
        <span style="font-family: 'Geist Mono', monospace; font-weight: 500; margin-left: auto;">${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
      </div>
    `;

    tooltip.className = 'lumina-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      display: block;
      pointer-events: none;
      z-index: 100;
      background: #ffffff;
      color: #09090b;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #e4e4e7;
      font-size: 12px;
      line-height: 1.5;
      font-family: Geist, Inter, ui-sans-serif, system-ui, sans-serif;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      white-space: nowrap;
    `;

    // Position tooltip - get client coordinates based on event type
    const rect = this.canvas.getBoundingClientRect();
    const offsetX = 15;
    const offsetY = 15;

    // Get client coordinates (handle TouchEvent)
    let clientX: number;
    let clientY: number;
    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ('clientX' in event) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      // Fallback - hide tooltip if we can't determine position
      tooltip.style.display = 'none';
      return;
    }

    let left = clientX - rect.left + offsetX;
    let top = clientY - rect.top + offsetY;

    // Prevent tooltip from going off-screen
    const tooltipRect = tooltip.getBoundingClientRect();
    if (left + tooltipRect.width > rect.width) {
      left = clientX - rect.left - tooltipRect.width - offsetX;
    }
    if (top + tooltipRect.height > rect.height) {
      top = clientY - rect.top - tooltipRect.height - offsetY;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    const tooltip = this.getTooltipElement();
    tooltip.style.display = 'none';
  }

  /**
   * Create X-axis config with category support
   */
  private createXAxisConfig(): AxisConfig {
    const baseConfig = this.barOptions.xAxis ?? {};

    // For time scale, don't override the formatter - let D3 handle it
    if (this.isTimeScale()) {
      return {
        ...baseConfig,
        ticks: {
          ...baseConfig.ticks,
          count: baseConfig.ticks?.count ?? 6,
        },
      };
    }

    // For category scale, use custom formatter to show category labels
    // Use explicit tick values to ensure ticks are placed at category centers (integers)
    const categoryCount = this.categories.length || 1;
    const tickValues = Array.from({ length: categoryCount }, (_, i) => i);

    return {
      ...baseConfig,
      formatter: (value: number | string | Date) => {
        const numValue = typeof value === 'number' ? value : 0;
        const index = Math.round(numValue);
        if (index >= 0 && index < this.categories.length) {
          return this.categories[index];
        }
        return '';
      },
      ticks: {
        ...baseConfig.ticks,
        // Use explicit tick values at category centers (0, 1, 2, ...) instead of count
        // This ensures D3 places ticks exactly at integer positions
        values: tickValues,
      },
    };
  }

  /**
   * Initialize axis renderer with current state
   */
  private initializeAxisRenderer(): void {
    if (!this.axisRenderer) return;

    const { width, height } = this.getState().viewport;
    if (width > 0 && height > 0) {
      const cssWidth = width / this.pixelRatio;
      const cssHeight = height / this.pixelRatio;
      this.axisRenderer.setSize(cssWidth, cssHeight);
      this.axisRenderer.setDomain(this.getState().domain);
      this.axisRenderer.render();
      this.syncGridTicks();
    }
  }

  /**
   * Create render passes for bar chart
   */
  protected createRenderPasses(): RenderPass[] {
    const passes: RenderPass[] = [];

    // Access options from this.options (set by BaseChart before createRenderPasses is called)
    const barOptions = this.options as BarChartOptions;

    // Add grid render pass if enabled
    const gridConfig = barOptions?.grid;
    if (gridConfig !== false) {
      const showHorizontal = typeof gridConfig === 'object' ? gridConfig.show !== false : true;
      const showVertical = typeof gridConfig === 'object' ? gridConfig.show !== false : true;

      const gridPass = new GridRenderPass({
        gl: this.renderer.gl,
        getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
        margins: this.getMargins(),
        pixelRatio: this.pixelRatio,
        color: barOptions?.gridColor,
        showHorizontal,
        showVertical,
      });
      passes.push(gridPass);
    }

    // Add bar render pass
    const barPass = new BarRenderPass({
      gl: this.renderer.gl,
      getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
      margins: this.getMargins(),
      pixelRatio: this.pixelRatio,
      cornerRadius: barOptions?.cornerRadius,
    });
    passes.push(barPass);

    return passes;
  }

  /**
   * Set category labels for the X-axis
   */
  setCategories(categories: string[]): void {
    this.categories = categories;

    // Update axis renderer with new formatter
    if (this.axisRenderer) {
      this.axisRenderer.updateConfig(this.createXAxisConfig(), undefined);
    }

    // Re-render if we have data
    if (this.series.length > 0) {
      this.onDataUpdate(this.series);
    }
  }

  /**
   * Get current categories
   */
  getCategories(): string[] {
    return this.categories;
  }

  /**
   * Check if time scale is being used
   */
  private isTimeScale(): boolean {
    return this.barOptions.xAxis?.type === 'time';
  }

  /**
   * Called when data is updated
   */
  protected onDataUpdate(series: Series[]): void {
    let xDomain: [number, number];

    // Calculate X domain based on scale type
    if (this.isTimeScale()) {
      // For time scale, find min/max timestamps from data
      let minX = Infinity;
      let maxX = -Infinity;
      for (const s of series) {
        if (s.visible === false) continue;
        for (const point of s.data) {
          minX = Math.min(minX, point.x);
          maxX = Math.max(maxX, point.x);
        }
      }
      // Add padding (5% of range on each side)
      const xRange = maxX - minX || 1;
      const padding = xRange * 0.05;
      xDomain = [minX - padding, maxX + padding];
    } else {
      // For category/band scale, use index-based domain
      const categoryCount = this.categories.length || this.inferCategoryCount(series);
      xDomain = [-0.5, categoryCount - 0.5];
    }

    // Y domain: 0 to max value (with some padding)
    let maxY = 0;
    for (const s of series) {
      if (s.visible === false) continue;
      for (const point of s.data) {
        maxY = Math.max(maxY, point.y);
      }
    }
    // Add 10% padding at the top
    maxY = maxY * 1.1 || 1;
    const yDomain: [number, number] = [0, maxY];

    // Update state domain and initial domain (for zoom reset)
    this.state.domain = { x: xDomain, y: yDomain };
    this.initialDomain = { x: [...xDomain], y: [...yDomain] };

    // Calculate bar layout and upload to GPU
    this.updateBarLayout(series);

    // Update axis renderer
    if (this.axisRenderer) {
      this.axisRenderer.setDomain(this.state.domain);
      this.axisRenderer.updateConfig(this.createXAxisConfig(), undefined);
      this.axisRenderer.render();
      this.syncGridTicks();
    }
  }

  /**
   * Infer category count from data
   */
  private inferCategoryCount(series: Series[]): number {
    let maxIndex = 0;
    for (const s of series) {
      for (const point of s.data) {
        maxIndex = Math.max(maxIndex, Math.floor(point.x));
      }
    }
    return maxIndex + 1;
  }

  /**
   * Calculate bar layout and generate bar data
   */
  private updateBarLayout(series: Series[]): void {
    const { width, height } = this.state.viewport;
    if (width === 0 || height === 0) return;

    const margins = this.getMargins();
    const plotLeft = margins.left * this.pixelRatio;
    const plotTop = margins.top * this.pixelRatio;
    const plotRight = width - margins.right * this.pixelRatio;
    const plotBottom = height - margins.bottom * this.pixelRatio;
    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;

    const domain = this.state.domain;
    const domainWidth = domain.x[1] - domain.x[0];
    const domainHeight = domain.y[1] - domain.y[0];

    const visibleSeries = series.filter((s) => s.visible !== false);
    const seriesCount = visibleSeries.length;

    if (seriesCount === 0) {
      this.barRenderPass.updateData([]);
      this.barBounds = [];
      return;
    }

    const bars: BarData[] = [];

    // Handle time scale vs category scale differently
    if (this.isTimeScale()) {
      // Time scale: bars are positioned by their timestamp values
      // Collect all unique x values to determine bar width
      const allXValues: number[] = [];
      for (const s of visibleSeries) {
        for (const point of s.data) {
          allXValues.push(point.x);
        }
      }
      allXValues.sort((a, b) => a - b);

      // Calculate bar width based on minimum interval between points
      let minInterval = domainWidth;
      for (let i = 1; i < allXValues.length; i++) {
        const interval = allXValues[i] - allXValues[i - 1];
        if (interval > 0) {
          minInterval = Math.min(minInterval, interval);
        }
      }

      // Bar width as fraction of the minimum interval (80%)
      const barWidthInDomain = minInterval * 0.8;
      const groupPixelWidth = (barWidthInDomain / domainWidth) * plotWidth;

      // Gap configuration (in pixels)
      const barGap = (this.barOptions.barGap ?? 4) * this.pixelRatio;
      const totalBarGaps = (seriesCount - 1) * barGap;
      const barWidth = Math.max(1, (groupPixelWidth - totalBarGaps) / seriesCount);

      // Generate bars for each series and data point
      for (let seriesIndex = 0; seriesIndex < visibleSeries.length; seriesIndex++) {
        const s = visibleSeries[seriesIndex];
        const rawColor =
          s.style?.color ??
          this.barOptions.barColor ??
          DEFAULT_COLORS[seriesIndex % DEFAULT_COLORS.length];
        const color: RGBAColor = typeof rawColor === 'string' ? parseColor(rawColor) : rawColor;

        for (const point of s.data) {
          // Convert x value (timestamp) to pixel position
          const normalizedX = (point.x - domain.x[0]) / domainWidth;
          const centerX = plotLeft + normalizedX * plotWidth;

          // Calculate bar position within the group
          const groupStartX = centerX - groupPixelWidth / 2;
          const barX = groupStartX + seriesIndex * (barWidth + barGap);

          // Calculate bar height (value maps to pixels)
          const normalizedY = (point.y - domain.y[0]) / domainHeight;
          const barPixelHeight = normalizedY * plotHeight;

          // Bar Y position (top of bar, since Y increases downward in pixels)
          const barY = plotBottom - barPixelHeight;

          bars.push({
            x: barX,
            y: barY,
            width: barWidth,
            height: barPixelHeight,
            color,
            seriesId: s.id,
            categoryIndex: 0, // Not applicable for time scale
          });
        }
      }
    } else {
      // Category scale: bars are positioned by category index
      const categoryCount = this.categories.length || this.inferCategoryCount(series);
      if (categoryCount === 0) {
        this.barRenderPass.updateData([]);
        this.barBounds = [];
        return;
      }

      // Gap configuration (in pixels)
      const groupGap = (this.barOptions.groupGap ?? 20) * this.pixelRatio;
      const barGap = (this.barOptions.barGap ?? 4) * this.pixelRatio;

      // Calculate bar widths
      const categoryPixelWidth = plotWidth / categoryCount;
      const groupWidth = categoryPixelWidth - groupGap;
      const totalBarGaps = (seriesCount - 1) * barGap;
      const barWidth = Math.max(1, (groupWidth - totalBarGaps) / seriesCount);

      // Generate bars for each series and category
      for (let seriesIndex = 0; seriesIndex < visibleSeries.length; seriesIndex++) {
        const s = visibleSeries[seriesIndex];
        const rawColor =
          s.style?.color ??
          this.barOptions.barColor ??
          DEFAULT_COLORS[seriesIndex % DEFAULT_COLORS.length];
        const color: RGBAColor = typeof rawColor === 'string' ? parseColor(rawColor) : rawColor;

        for (const point of s.data) {
          const categoryIndex = Math.floor(point.x);
          if (categoryIndex < 0 || categoryIndex >= categoryCount) continue;

          // Calculate bar position
          // Category center is at integer position in domain space (0, 1, 2, ...)
          // With domain [-0.5, categoryCount-0.5], this centers bars with padding on edges
          const categoryCenterX =
            plotLeft + ((categoryIndex - domain.x[0]) / domainWidth) * plotWidth;
          const groupStartX = categoryCenterX - groupWidth / 2;
          const barX = groupStartX + seriesIndex * (barWidth + barGap);

          // Calculate bar height (value maps to pixels)
          const normalizedY = (point.y - domain.y[0]) / domainHeight;
          const barPixelHeight = normalizedY * plotHeight;

          // Bar Y position (top of bar, since Y increases downward in pixels)
          const barY = plotBottom - barPixelHeight;

          bars.push({
            x: barX,
            y: barY,
            width: barWidth,
            height: barPixelHeight,
            color,
            seriesId: s.id,
            categoryIndex,
          });
        }
      }
    }

    // Update render pass
    this.barRenderPass.updateData(bars);
    this.barBounds = bars;
  }

  /**
   * Called when chart is resized
   */
  protected onResize(width: number, height: number): void {
    if (this.axisRenderer) {
      const cssWidth = width / this.pixelRatio;
      const cssHeight = height / this.pixelRatio;
      this.axisRenderer.setSize(cssWidth, cssHeight);
      this.axisRenderer.render();
    }

    if (this.barRenderPass) {
      this.barRenderPass.setPixelRatio(this.pixelRatio);
    }

    if (this.gridRenderPass) {
      this.gridRenderPass.setPixelRatio(this.pixelRatio);
      this.syncGridTicks();
    }

    // Re-layout bars
    if (this.series.length > 0) {
      this.updateBarLayout(this.series);
    }
  }

  /**
   * Called when domain changes
   */
  protected onDomainChange(domain: DataDomain): void {
    if (this.axisRenderer) {
      this.axisRenderer.setDomain(domain);
      this.axisRenderer.render();
    }
    this.syncGridTicks();

    // Re-layout bars
    if (this.series.length > 0) {
      this.updateBarLayout(this.series);
    }
  }

  /**
   * Sync grid tick positions with axis renderer
   */
  private syncGridTicks(): void {
    if (!this.gridRenderPass || !this.axisRenderer) return;

    const xTicks = this.axisRenderer.getXTicks();
    const yTicks = this.axisRenderer.getYTicks();
    this.gridRenderPass.setTicks(xTicks, yTicks);
  }

  /**
   * Called when options are updated
   */
  protected onOptionsUpdate(options: Partial<BarChartOptions>): void {
    if (this.axisRenderer && (options.xAxis || options.yAxis)) {
      const xConfig = options.xAxis ? { ...options.xAxis, ...this.createXAxisConfig() } : undefined;
      this.axisRenderer.updateConfig(xConfig, options.yAxis);
    }

    // Update corner radius if changed
    if (options.cornerRadius !== undefined && this.barRenderPass) {
      this.barOptions.cornerRadius = options.cornerRadius;
      this.barRenderPass.setCornerRadius(options.cornerRadius);
    }

    // Update bar-specific options
    if (
      options.barGap !== undefined ||
      options.groupGap !== undefined ||
      options.barColor !== undefined
    ) {
      Object.assign(this.barOptions, options);
      if (this.series.length > 0) {
        this.updateBarLayout(this.series);
      }
    }

    // Update margins if changed
    if (options.margins) {
      if (this.barRenderPass) {
        this.barRenderPass.setMargins(this.margins);
      }
      if (this.axisRenderer) {
        this.axisRenderer.setMargins(this.margins);
      }
      if (this.gridRenderPass) {
        this.gridRenderPass.setMargins(this.margins);
      }
    }

    // Update grid color if changed
    if (options.gridColor && this.gridRenderPass) {
      this.gridRenderPass.setColor(options.gridColor);
    }
  }

  /**
   * Render the chart
   */
  render(): void {
    super.render();
    if (this.axisRenderer) {
      this.axisRenderer.render();
    }
  }

  /**
   * Get the axis renderer
   */
  getAxisRenderer(): AxisRenderer | null {
    return this.axisRenderer;
  }

  /**
   * Hit test to find bar at pixel coordinates
   */
  hitTestBar(pixelX: number, pixelY: number): BarData | null {
    return this.barRenderPass.hitTest(pixelX, pixelY);
  }

  /**
   * Get bar bounds for external use
   */
  getBarBounds(): BarData[] {
    return this.barBounds;
  }

  /**
   * Convert pixel to data coordinates
   */
  override pixelToData(pixelX: number, pixelY: number): { x: number; y: number } {
    if (!this.axisRenderer) {
      return super.pixelToData(pixelX, pixelY);
    }
    const cssX = pixelX / this.pixelRatio;
    const cssY = pixelY / this.pixelRatio;
    const coords = this.axisRenderer.pixelToData(cssX, cssY);
    // Coerce values to numbers for bar charts
    return {
      x:
        typeof coords.x === 'number' ? coords.x : coords.x instanceof Date ? coords.x.getTime() : 0,
      y:
        typeof coords.y === 'number' ? coords.y : coords.y instanceof Date ? coords.y.getTime() : 0,
    };
  }

  /**
   * Convert data to pixel coordinates
   */
  override dataToPixel(dataX: number, dataY: number): { x: number; y: number } {
    if (!this.axisRenderer) {
      return super.dataToPixel(dataX, dataY);
    }
    const { x, y } = this.axisRenderer.dataToPixel(dataX, dataY);
    return {
      x: x * this.pixelRatio,
      y: y * this.pixelRatio,
    };
  }

  /**
   * Get the axes as an image for export compositing
   */
  protected override async getAxesImage(): Promise<HTMLImageElement | null> {
    if (!this.axisRenderer) return null;
    return this.axisRenderer.toImage();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.axisRenderer) {
      this.axisRenderer.dispose();
    }
    super.dispose();
  }
}
